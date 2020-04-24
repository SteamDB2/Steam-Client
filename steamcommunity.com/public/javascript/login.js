
//Used to add a unique get var to all ajax calls, so IE doesn't do stupid caching
var iAjaxCalls = 0;

var iIncorrectLoginFailures = 0;

function HighlightFailure( msg )
{
	var errorDisplay = $('error_display');
	if ( errorDisplay )
	{
		errorDisplay.update( msg );
		errorDisplay.show();
		errorDisplay.style.color = '#ffffff';
				try { 
			new Effect.Morph( 'error_display', { style: 'color: #d0434b' } );
		}
		catch(err) { }
			}
}


//Refresh the catpcha image 
function RefreshCaptcha()
{
	++iAjaxCalls;
	
		new Ajax.Request('https://steamcommunity.com/actions/RefreshCaptcha/',
	  {
	    method:'get',
	    parameters: { count : iAjaxCalls },
	    onSuccess: function(transport){
	      if ( transport.responseText ){
	        
	        try {
	      	  var result = transport.responseText.evalJSON(true);
	      	} catch ( e ) {
	      	  return;
	      	}
	      	
	      	gid = result.gid;
	      	UpdateCaptcha( gid );
		  }
	    }
	  });
}

function UpdateCaptcha( gid )
{
	if ( gid != -1 ) 
	{
		$('captcha_entry').show();
		$('captchaImg').src = 'https://steamcommunity.com/public/captcha.php?gid='+gid;
					$('input_captcha').value='';
			}
	$('captchagid').value = gid;
}

var g_bLoginInFlight = false;
var g_bInEmailAuthProcess = false;
var g_bInTwoFactorAuthProcess = false;
var g_bEmailAuthSuccessful = false;
var g_bLoginTransferInProgress = false;
var g_bEmailAuthSuccessfulWantToLeave = false;
var g_bTwoFactorAuthSuccessful = false;
var g_bTwoFactorAuthSuccessfulWantToLeave = false;
var g_sOAuthRedirectURI = 'steammobile://mobileloginsucceeded';
var g_sAuthCode = "";


function DoLogin()
{
	var form = document.forms['logon'];

	var username = form.elements['username'].value;
	username = username.replace( /[^\x00-\x7F]/g, '' ); // remove non-standard-ASCII characters
	
	var password = form.elements['password'].value;
	password = password.replace( /[^\x00-\x7F]/g, '' ); // remove non-standard-ASCII characters

	if ( g_bLoginInFlight || password.length == 0 || username.length == 0 )
		return;

	g_bLoginInFlight = true;
	$('login_btn_signin').hide();
	$('login_btn_wait').show();
	
	new Ajax.Request( 'https://steamcommunity.com/login/getrsakey/',
		{
			method: 'post',
			parameters: {
				username: username,
				donotcache: ( new Date().getTime() )
			},
			onSuccess: OnRSAKeyResponse,
			onException: function( req, e ) {
				throw e;
			}
		}
	);
}

	
	function getAuthCode( results )
	{
		var authCode = g_sAuthCode;
		g_sAuthCode = '';
		return authCode;
	}



function OnRSAKeyResponse( transport )
{
	var results = transport.responseJSON;
	if ( results.publickey_mod && results.publickey_exp && results.timestamp )
	{
		var form = document.forms['logon'];

		var pubKey = RSA.getPublicKey( results.publickey_mod, results.publickey_exp );
		var username = form.elements['username'].value;
		username = username.replace( /[^\x00-\x7F]/g, '' ); // remove non-standard-ASCII characters
		var password = form.elements['password'].value;
		password = password.replace( /[^\x00-\x7F]/g, '' ); // remove non-standard-ASCII characters
		var encryptedPassword = RSA.encrypt( password, pubKey );

		new Ajax.Request( 'https://steamcommunity.com/login/dologin/',
			{
				method: 'post',
				parameters: {
					password: encryptedPassword,
					username: username,
					twofactorcode: getAuthCode( results ),
					emailauth: form.elements['emailauth'].value,
					loginfriendlyname: form.elements['loginfriendlyname'].value,
										captchagid: form.elements['captchagid'].value,
					captcha_text: form.elements['captcha_text'].value,
					emailsteamid: form.elements['emailsteamid'].value,
					rsatimestamp: results.timestamp,
					remember_login: ( form.elements['remember_login'] && form.elements['remember_login'].checked ) ? 'true' : 'false',
					donotcache: ( new Date().getTime() )
				},
				onSuccess: OnLoginResponse,
				onException: function( req, e ) {
							throw e;
						}
			}
		);
	}
	else
	{
		if ( results.message )
		{
			HighlightFailure( results.message );
		}

		$('login_btn_signin').show();
		$('login_btn_wait').hide();

		g_bLoginInFlight = false;
	}
}


function OnLoginResponse( transport )
{
	var results = transport.responseJSON;
	g_bLoginInFlight = false;
	var bRetry = true;

	if ( results.login_complete )
	{
		
		var bRunningTransfer = false;
		if ( results.transfer_url && results.transfer_parameters )
		{
			bRunningTransfer = true;
			TransferLogin( results.transfer_url, results.transfer_parameters );
		}
		
		if ( g_bInEmailAuthProcess )
		{
			g_bEmailAuthSuccessful = true;
			SetEmailAuthModalState( 'success' );
		}
		else if ( g_bInTwoFactorAuthProcess )
		{
			g_bTwoFactorAuthSuccessful = true;
			SetTwoFactorAuthModalState( 'success' );
		}
		else
		{
			bRetry = false;
			if ( !bRunningTransfer )
				LoginComplete();
		}
	}
	else
	{
		if ( results.requires_twofactor )
		{
			$('captcha_entry').hide();

			if ( !g_bInTwoFactorAuthProcess )
			{
				StartTwoFactorAuthProcess();
			}
			else
			{
				SetTwoFactorAuthModalState( 'incorrectcode' );
			}
		}
		else if ( results.captcha_needed && results.captcha_gid )
		{
			UpdateCaptcha( results.captcha_gid );
			iIncorrectLoginFailures ++;
		}
		else if ( results.emailauth_needed )
		{
			if ( results.emaildomain )
				$('emailauth_entercode_emaildomain').update( results.emaildomain );
			
			if ( results.emailsteamid )
				$('emailsteamid').value = results.emailsteamid;
			
			if ( !g_bInEmailAuthProcess )
				StartEmailAuthProcess();
			else
				SetEmailAuthModalState( 'incorrectcode' );
		}
		else
		{
		    iIncorrectLoginFailures ++;
		}
		
		if ( results.message )
		{
			HighlightFailure( results.message );
					}
	}
	if ( bRetry )
	{
		$('login_btn_signin').show();
		$('login_btn_wait').hide();
	}
}

function ClearLoginForm()
{
	var rgElements = document.forms['logon'].elements;
	rgElements['username'].value = '';
	rgElements['password'].value = '';
	rgElements['emailauth'].value = '';
	rgElements['emailsteamid'].value = '';
	$('authcode').value = '';
	
	if ( rgElements['captchagid'].value )
		RefreshCaptcha();
	
	rgElements['username'].focus();
}

function StartEmailAuthProcess()
{
	g_bInEmailAuthProcess = true;

	SetEmailAuthModalState( 'entercode' );
	
			$('loginAuthCodeModal').OnModalDismissal = CancelEmailAuthProcess;
		showModal ( 'loginAuthCodeModal', true );
	}

function CancelEmailAuthProcess()
{
	g_bInEmailAuthProcess = false;
	// if the user closed the auth window on the last step, just redirect them like we normally would
	if ( g_bEmailAuthSuccessful )
		LoginComplete();
	else
		ClearLoginForm();
}

function TransferLogin( url, parameters )
{
	if ( g_bLoginTransferInProgress )
		return;
	g_bLoginTransferInProgress = true;

		var iframeElement = document.createElement( 'iframe' );
	iframeElement.id = 'transfer_iframe';
	var iframe = $( iframeElement );
	iframe.hide();
	$(document.body).appendChild( iframe );
	
	var doc = iframe.contentWindow.document;
	doc.open();
	doc.write( '<form method="POST" action="' + url + '" name="transfer_form">' );
	for ( var param in parameters )
	{
		doc.write( '<input type="hidden" name="' + param + '" value="' + parameters[param] + '">' );
	}
	doc.write( '</form>' );
	doc.write( '<script>window.onload = function(){ document.forms["transfer_form"].submit(); }</script>' );
	doc.close();
	
	// firefox fires the onload event twice
	var cLoadCount = Prototype.Browser.Gecko ? 2 : 1;
	
	Event.observe( iframe, 'load', function( event ) { if ( --cLoadCount == 0 ) OnTransferComplete() } );
	Event.observe( iframe, 'error', function( event ) { OnTransferComplete(); } );
	
	// after 10 seconds, give up on waiting for transfer
	window.setTimeout( OnTransferComplete, 10000 );
}

function OnTransferComplete()
{
	if ( !g_bLoginTransferInProgress )
		return;
	g_bLoginTransferInProgress = false;
	if ( !g_bInEmailAuthProcess && !g_bInTwoFactorAuthProcess )
		LoginComplete();
	else if ( g_bEmailAuthSuccessfulWantToLeave || g_bTwoFactorAuthSuccessfulWantToLeave)
		LoginComplete();
}

function OnEmailAuthSuccessContinue()
{
	if ( g_bLoginTransferInProgress )
	{
							$('auth_buttonsets').childElements().invoke('hide');
			if ( $('auth_buttonset_waiting') )
				$('auth_buttonset_waiting').show();
				
		g_bEmailAuthSuccessfulWantToLeave = true;
	}
	else
		LoginComplete();
}

function LoginComplete()
{
		if ( $('openidForm') )
	{
		$('openidForm').submit();
	}
	else
	{
				{
			window.location = document.forms['logon'].elements['redir'].value;
		}
	}
}

function SubmitAuthCode( defaultFriendlyNameText )
{
	var friendlyname =  $('friendlyname').value;
	$('auth_details_computer_name').style.color='#85847f';
	if ( friendlyname == defaultFriendlyNameText )
	{
	    friendlyname = '';
	}
	$('auth_buttonsets').childElements().invoke('hide');
	if ( $('auth_buttonset_waiting') )
		$('auth_buttonset_waiting').show();

			document.forms['logon'].elements['loginfriendlyname'].value = friendlyname;
		document.forms['logon'].elements['emailauth'].value = $('authcode').value;
		DoLogin();
}

function SetEmailAuthModalState( step )
{
	
		$('auth_messages').childElements().invoke('hide');
		$('auth_message_' + step ).show();

		$('auth_details_messages').childElements().invoke('hide');
		if ( $('auth_details_' + step ) )
			$('auth_details_' + step ).show();

		$('auth_buttonsets').childElements().invoke('hide');
		if ( $('auth_buttonset_' + step ) )
			$('auth_buttonset_' + step ).show();

		$('authcode_help_supportlink').hide();

		var icon='key';
		var bShowAuthcodeEntry = true;
		if ( step == 'entercode' )
		{
			icon = 'key';
		}
		else if ( step == 'checkspam' )
		{
			icon = 'trash';
		}
		else if ( step == 'success' )
		{
			icon = 'unlock';
			bShowAuthcodeEntry = false;
			$('success_continue_btn').focus();
		}
		else if ( step == 'incorrectcode' )
		{
			icon = 'lock';
		}
		else if ( step == 'help' )
		{
			icon = 'steam';
			bShowAuthcodeEntry = false;
			$('authcode_help_supportlink').show();
		}

		if ( bShowAuthcodeEntry )
		{
			$('authcode_entry').show();
			$('auth_details_computer_name').show();
		}
		else
		{
			$('authcode_entry').hide();
			$('auth_details_computer_name').hide();
		}

		$('auth_icon').className = 'auth_icon auth_icon_' + icon;

	}

function OnAuthcodeFocus( defaultText )
{
	if ( $('authcode').value == defaultText )
	{
		$('authcode').value = '';
		$('authcode').removeClassName( 'defaulttext' );
	}
}

function OnAuthcodeBlur( defaultText )
{
	if ( $('authcode').value == '' )
	{
		$('authcode').value = defaultText;
		$('authcode').addClassName( 'defaulttext' );
	}
}

function OnFriendlyNameFocus( defaultText ) 
{ 
    if ( $('friendlyname').value == defaultText ) 
    { 
        $('friendlyname').value = ''; 
        $('friendlyname').removeClassName( 'defaulttext' ); 
    } 
} 
  
function OnFriendlyNameBlur( defaultText ) 
{ 
    if ( $('friendlyname').value == '' ) 
    { 
        $('friendlyname').value = defaultText; 
        $('friendlyname').addClassName( 'defaulttext' ); 
    } 
} 


function StartTwoFactorAuthProcess()
{
	g_bInTwoFactorAuthProcess = true;
	SetTwoFactorAuthModalState( 'entercode' );

			$('loginTwoFactorCodeModal').OnModalDismissal = CancelTwoFactorAuthProcess;
	}


function CancelTwoFactorAuthProcess()
{
	g_bInTwoFactorAuthProcess = false;

	if ( g_bEmailAuthSuccessful )
		LoginComplete();
	else
		ClearLoginForm();
}


function OnTwoFactorAuthSuccessContinue()
{
	if ( g_bLoginTransferInProgress )
	{
					$('login_twofactorauth_buttonsets').childElements().invoke('hide');
			if ( $('login_twofactorauth_buttonset_waiting') )
				$('login_twofactorauth_buttonset_waiting').show();
		
		g_bTwoFactorAuthSuccessfulWantToLeave = true;
	}
	else
		LoginComplete();
}

function SetTwoFactorAuthModalState( step )
{
	
	if ( step == 'success' )
	{
		g_bInTwoFactorAuthProcess = false;
	}

	$('login_twofactorauth_messages').childElements().invoke('hide');
	if ( $('login_twofactorauth_message_' + step ) )
		$('login_twofactorauth_message_' + step ).show();

	$('login_twofactorauth_details_messages').childElements().invoke('hide');
	if ( $('login_twofactorauth_details_' + step ) )
		$('login_twofactorauth_details_' + step ).show();

	$('login_twofactorauth_buttonsets').childElements().invoke('hide');
	if ( $('login_twofactorauth_buttonset_' + step ) )
		$('login_twofactorauth_buttonset_' + step ).show();

	$('login_twofactor_authcode_help_supportlink').hide();

	var icon = 'key';
	if ( step == 'entercode' )
	{
		showModal( 'loginTwoFactorCodeModal', true );
		$J('#login_twofactorauth_message_entercode_accountname').text( document.forms['logon'].elements['username'].value )
		$('twofactorcode_entry').focus();
	}
	else if ( step == 'incorrectcode' )
	{
		icon = 'lock';
		$('twofactorcode_entry').focus();
	}
	else if ( step == 'help' )
	{
		icon = 'steam';
		$('login_twofactor_authcode_entry').hide();
		$('login_twofactor_authcode_help_supportlink').show();
	}

	if ( ! g_bInTwoFactorAuthProcess )
	{
		$('loginTwoFactorCodeModal').hide();
	}

	$('login_twofactorauth_icon').className = 'auth_icon auth_icon_' + icon;

	}

function SubmitTwoFactorCode( )
{
	g_sAuthCode = $('twofactorcode_entry').value;

		
	$('login_twofactorauth_messages').childElements().invoke('hide');
	$('login_twofactorauth_details_messages').childElements().invoke('hide');

	$('login_twofactorauth_buttonsets').childElements().invoke('hide');
	if ( $('login_twofactorauth_buttonset_waiting') )
	{
		$('login_twofactorauth_buttonset_waiting').show();
	}

	DoLogin();
}

function OnTwoFactorCodeFocus( defaultText )
{
	if ( $('twofactorcode_entry').value == defaultText )
	{
		$('twofactorcode_entry').value = '';
		$('twofactorcode_entry').removeClassName( 'defaulttext' );
	}
}

function OnTwoFactorCodeBlur( defaultText )
{
}

function HandleLoginHelp()
{
	window.location = "https://help.steampowered.com";
}

