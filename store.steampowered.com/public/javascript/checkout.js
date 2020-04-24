
var currently_selected_friend_block = '';
var currently_selected_friend_name = '';
var currently_selected_friend_id = 0;

var g_nPaymentMethodStep = 1;			 
var g_nPurchaseTotal = 0;				var g_strProviderRemaining = '';		  
var g_strProviderMethod = '';			var g_bShowAddressForm = true;

var nGetFinalPriceCalls = 0;

var g_bFinalizeTransactionInProgress = false;

function ReportCheckoutJSError( message, e )
{
	try 
	{
		if (typeof e == 'string')
    		e = new Error(e);
    		
		ReportError( '/public/javascript/checkout.js?l=english', message, message+":\n\n  Exception: "+e.name+" - "+e.message+"\n" );
	} catch( e ) 
	{
			}
}

function OnLoadCheckoutForm()
{
	UpdateStateSelectState(); 
	UpdatePaymentInfoForm();
	
	try 
	{
		var curTab = g_initialTab;
		if ( rgFocusOnTabSelect && rgFocusOnTabSelect[curTab] )
		{
			$( rgFocusOnTabSelect[curTab] ).focus();
		}
	} 
	catch( e ) 
	{
			}
}

function ScrollCheckoutFormIntoView()
{
	ScrollToIfNotInView( $J('.checkout_main'), null, 20 );
}

function OpenUrlInNewBlankWindow( newURL )
{
	return window.open( newURL, "_blank" );
}

function PostUrlInNewBlankWindow( newUrl, postData )
{
	var form = document.createElement( "form" );
	form.setAttribute( "method", "post" );
	form.setAttribute( "action", newUrl );
	form.setAttribute( "target", "_blank" );
	
	for( var i = 0; i < postData.length; i++ )
	{
		var param = postData[i];
		var input = document.createElement( "input" );
		input.type = "hidden";
		input.name = param.name;
		input.value = param.value;
		form.appendChild( input );
	}
	
	document.body.appendChild( form );
	form.submit();
	document.body.removeChild( form );
}

function GetAdditionalParametersForExternalPaymentProcessor( extProcessor )
{
	return "";
}

var g_bPayPalAuthInFlight = false;
function PerformPayPalAuthorization()
{
	try 
	{
		if ( $('paypaltoken').value )
		{
			var paypal_url = encodeURIComponent( 'https://www.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=%s'.replace( "%s", $('paypaltoken').value ) );
			var transID = $('transaction_id').value;
			OpenUrlInNewBlankWindow( 'https://store.steampowered.com/paypal/launchauth/?webbasedpurchasing=1&transid=' + transID + '&authurl='+paypal_url + GetAdditionalParametersForExternalPaymentProcessor( 'paypal' ) + '&s=' + g_sessionID );
			$('external_payment_processor_notice').innerHTML = 'A new window has been opened to the PayPal web site.  Please login or create an account there to review your purchase details and authorize the transaction.  If you do not see a new window check that your browser is not blocking it as a pop-up.';
			g_bPayPalAuthInFlight = true;
		}
	} 
	catch( e ) 
	{
		ReportCheckoutJSError( 'Failed launcing new window for PayPal auth', e );
	}
}


function OnCreateQiwiInvoiceFailure( eResult, resultDetail )
{
	var sErrorMessage = 'An unexpected error has occurred. Your purchase has not been completed.<br>Please contact <a href="http://support.steampowered.com">Steam Support</a>.';
	
		switch ( resultDetail )
	{
		case 1:
			sErrorMessage = 'Your purchase has not been completed.<br>The payment processor is currently unavailable.  Please select a different payment method or try again later.';
			break;
			
		case 2:
			sErrorMessage = 'Your purchase has not been completed.<br>The phone number entered was unrecognized by the payment provider.  Please correct the number and try again.';
			break;
			
		case 3:
		case 4:
		case 5:
		case 6:
						sErrorMessage = 'An unexpected error has occurred. Your purchase has not been completed.<br>Please contact <a href="http://support.steampowered.com">Steam Support</a>.';
			break;		
			
		case 7:
			sErrorMessage = 'Your purchase has not been completed.<br>The payment processor reported that your transaction amount will bring you over your allowable daily limit.  Please select a different payment method or try again later.';
			break;
			
		default:
			sErrorMessage = 'An unexpected error has occurred. Your purchase has not been completed.<br>Please contact <a href="http://support.steampowered.com">Steam Support</a>.';
			break;
	}
	DisplayErrorMessage( sErrorMessage );
	
	$J('#purchase_button_bottom').show();
	$J('#purchase_button_inprogress_bottom').hide();	
}


var g_bCreateQiwiInvoiceRunning = false;
function CreateQiwiInvoiceAndFinalizeTransaction( url )
{
	if ( g_bCreateQiwiInvoiceRunning )
		return;
		
		if ( !$('accept_ssa') || !$('accept_ssa').checked )
	{
		DisplayErrorMessage( 'You must agree to the terms of the Steam Subscriber Agreement to complete this transaction.' );
		ValidationMarkFieldBad( $('purchase_confirm_ssa') );
		return;
	}
	
	if ( $('accept_right_withdrawal') && !$('accept_right_withdrawal').checked )
	{
		DisplayErrorMessage( 'You must agree to the terms of your statutory right of withdrawal.' );
		ValidationMarkFieldBad( $('purchase_confirm_right_withdrawal') );
		return;
	}		
	
	$J('#purchase_button_bottom').hide();
	$J('#purchase_button_inprogress_bottom').show();

	var g_winQiwiWindow = window.open( 'https://store.steampowered.com/qiwi/launchauth', 'qiwiWindow' );

	g_bCreateQiwiInvoiceRunning = true;
	
	try 
	{
		var phoneNumber = $('mobile_number').value;
		var re = new RegExp(/^\+7|^\+38/ );
		var m = re.exec(phoneNumber);
		
		phoneNumber = phoneNumber.replace( m, "" );
		// strip out non-digits
		phoneNumber = phoneNumber.replace(/\D/g, "" );
		
		// add the country code back
		phoneNumber = m + phoneNumber;

		new Ajax.Request('https://store.steampowered.com/checkout/qiwiinvoice/',
		{
		    method:'post',
		    parameters: { 
				// Info for all carts
				'phone' : phoneNumber,
				'transid' : $('transaction_id').value
			},
			onSuccess: function(transport)
			{
			    	g_bCreateQiwiInvoiceRunning = false;
				if ( transport.responseText ){
					try {
						var result = transport.responseText.evalJSON(true);
			      		} catch ( e ) {
			      			// Failure
			      			OnCreateQiwiInvoiceFailure( 2, -1 );
			      			g_winQiwiWindow.close();
			      		}
			      	   	// Success...
			      	   	if ( result.success == 1 )
			      	   	{
			      	   											      	   		g_winQiwiWindow = window.open( result.url, 'qiwiWindow' );
			      	   		PollForTransactionStatus( $('transaction_id').value, 120, 15 ); 
			      	   		return;
			      	   	}
			      	   	else
			      	   	{
			      	   		OnCreateQiwiInvoiceFailure( result.success, result.result_detail );
			      	   		g_winQiwiWindow.close();
			      	   		return;
			      	   	}
			  	}
			  	
								OnCreateQiwiInvoiceFailure( 2, -1 );
			    },
			onFailure: function()
			{
			    	g_bCreateQiwiInvoiceRunning = false;
								OnCreateQiwiInvoiceFailure( 2, -1 );
				g_winQiwiWindow.close();
			}
		});
	} 
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed gathering form data and calling CreateQiwiInvoiceAndFinalizeTransaction', e );
	}
}

var g_winExternal = false;
function PerformExternalFinalizeTransaction( url, useExternalRedirect)
{
		if ( !$('accept_ssa') || !$('accept_ssa').checked )
	{
		DisplayErrorMessage( 'You must agree to the terms of the Steam Subscriber Agreement to complete this transaction.' );
		ValidationMarkFieldBad( $('purchase_confirm_ssa') );
		return;
	}
	
	if ( $('accept_right_withdrawal') && !$('accept_right_withdrawal').checked )
	{
		DisplayErrorMessage( 'You must agree to the terms of your statutory right of withdrawal.' );
		ValidationMarkFieldBad( $('purchase_confirm_right_withdrawal') );
		return;
	}	

	try 
	{
				
		
		var escapedUrl = encodeURIComponent( url );
		var transID = $('transaction_id').value;

		var method = $('payment_method');

		if( useExternalRedirect )
		{
			var displayPendingReceipt = false;
			switch ( method.value )
			{
				case 'boleto':
				case 'boacompragold':
				case 'bancodobrasilonline':
				case 'itauonline':
				case 'bradescoonline':
				case 'pagseguro':
				case 'visabrazil':
				case 'amexbrazil':
				case 'hipercard':
				case 'aura':
				case 'mastercardbrazil':
				case 'dinerscardbrazil':
				case 'multibanco':
				case 'payshop':
				case 'maestroboacompra':
				case 'visaelectronboacompra':
				case 'molpoints':
				case 'konbini':
				case 'bank_transfer_japan':
				case 'payeasy':
				case 'oxxo':
				case 'toditocash':
				case 'carnet':
				case 'spei':
				case '3pay':
				case 'isbank':
				case 'garanti':
				case 'akbank':
				case 'yapikredi':
				case 'halkbank':
				case 'bankasya':
				case 'finansbank':
				case 'denizbank':
				case 'ptt':
				case 'cashu':
				case 'onecard':
				case 'pse':
				case 'exito':
				case 'efecty':
				case 'baloto':
				case 'pinvalidda':
				case 'mangirkart':
				case 'bancocreditodeperu':
				case 'bbvacontinental':
				case 'safetypay':
				case 'pagoefectivo':
				case 'trustly':
				case 'nodwin_cod':
				case 'pagofacil':
				case 'rapipago':
				case 'santanderrio':
				case 'redpagos':
					displayPendingReceipt = true;
					break;
						
				default:
					break;
			}
			
			var bOpenURLInSteamExternalWindow = false;
			
			if ( g_bIsInClientOrOverlay )
			{
				switch ( method.value )
				{
					case 'itauonline':
						bOpenURLInSteamExternalWindow = true;
						break;
					
					default:
						break;
				}
			}
			
			if ( bOpenURLInSteamExternalWindow )
			{
				g_winExternal = window.open( 'steam://openurl_external/https://store.steampowered.com/checkout/externallinkex/?transid=' + transID, '_external_provider', '' );				
			}
			else
			{
				g_winExternal = window.open( 'https://store.steampowered.com/checkout/externallink/?transid=' + transID, '_external_provider', 'width=1280,height=900' );
			}

						if ( displayPendingReceipt )
			{
				DisplayPendingReceiptPage();
			}
			else
			{
				PollForTransactionStatus( $('transaction_id').value, method.value == 'cafefunded' ? 120 : 40, 15 ); 
			}
		}
		else
		{
			OpenUrlInNewBlankWindow( 'https://store.steampowered.com/paypal/launchauth/?webbasedpurchasing=1&transid=' + transID + '&authurl='+escapedUrl + '&s=' + g_sessionID );
			if ( method.value != 'paypal' && method.value != 'storedpaypal' && method.value != 'updatepaypal' )
			{
				PollForTransactionStatus( $('transaction_id').value, 80, 15 ); 
			}
		}
		
		$J('#purchase_button_bottom').hide();
		$J('#purchase_button_inprogress_bottom').show();
	} 
	catch( e ) 
	{
		ReportCheckoutJSError( 'Failed launching new window for external auth', e );
	}
}

function PopupCVV2Explanation()
{
	try 
	{
		var method = $('payment_method');
		var type = 'non-amex';
		if ( method && method.value == 'amex' )
		{
			type = 'amex';
		}
		
		 window.open( 'https://store.steampowered.com//checkout/cvv2explain/?webbasedpurchasing=1&type='+type, '_blank', "height=225,width=225,toolbar=no,menubar=no,resiable=no,scrollbars=no,status=no,titlebar=no" );
	} 
	catch( e ) 
	{
		ReportCheckoutJSError( 'Failed popping CVV2 explanation', e );
	}
}

function SetButtonInnerHtml( objName, value )
{
	$J( '*:not(:has("*"))' ,objName).text( value );
}

var g_nSubmitPaymentInfoButtonState = 1;
var g_bAnimatingSubmitButtonCurrently = false;
function AnimateSubmitPaymentInfoButton()
{
	try 
	{
						if ( $J('#paypal-button').is(":visible") )
		{
			$J('#submit_payment_info_btn').hide();
			$J('#submit_payment_info_btn_in_progress').hide();
			g_bAnimatingSubmitButtonCurrently = false;
			return;
		}
		
		if ( !g_bInitTransactionCallRunning && !g_bGetFinalPriceRunning && !g_bFinalizeTransactionInProgress && !g_bPollingForTransactionStatus )
		{
			$J('#submit_payment_info_btn').show();
			$J('#submit_payment_info_btn_in_progress').hide();
			g_bAnimatingSubmitButtonCurrently = false;
			return;
		}
		
		g_bAnimatingSubmitButtonCurrently = true;
		$J('#submit_payment_info_btn').hide();
		$J('#submit_payment_info_btn_in_progress').show();
			
		g_nSubmitPaymentInfoButtonState++;
		if ( g_nSubmitPaymentInfoButtonState > 3 )
			g_nSubmitPaymentInfoButtonState = 1;
			
		var append = '';
		if ( g_nSubmitPaymentInfoButtonState == 1 )
		{
			append = '.';
		}
		else if ( g_nSubmitPaymentInfoButtonState == 2 ) 
		{
			append = '..';
		}
		else 
		{
			append = '...';
		} 
		
		SetButtonInnerHtml( 'submit_payment_info_btn_in_progress', 'Working'+append );
		
		setTimeout( AnimateSubmitPaymentInfoButton, 500 );
	} 
	catch( e ) 
	{
		ReportCheckoutJSError( 'Failed in AnimateSubmitPaymentInfoButton', e );
	}
}

var g_nStoredCardLabelState = 1;
function AnimateStoredCardProcessingLabel()
{
	try 
	{
				if ( !g_bInitTransactionCallRunning && !g_bGetFinalPriceRunning )
		{
			$('stored_card_processing').hide();
			return;
		}
		$('stored_card_processing_label').show();
			
		g_nStoredCardLabelState++;
		if ( g_nStoredCardLabelState > 3 )
			g_nStoredCardLabelState = 1;
			
		var append = '';
		if ( g_nStoredCardLabelState == 1 )
		{
			append = '.';
		}
		else if ( g_nStoredCardLabelState == 2 ) 
		{
			append = '..';
		}
		else 
		{
			append = '...';
		} 
		
		$('stored_card_processing_label').innerHTML = 'Working'+append;

		setTimeout( AnimateStoredCardProcessingLabel, 500 );
	} 
	catch( e ) 
	{
		ReportCheckoutJSError( 'Failed in AnimateStoredCardProcessingLabel', e );
	}
}

var g_nSubmitGiftNoteButtonState = 1;
function AnimateSubmitGiftNoteButton()
{
	try 
	{
				if ( !g_bInitTransactionCallRunning && !g_bGetFinalPriceRunning && !g_bSendGiftCallRunning )
		{
			$('submit_gift_note_btn').show();
			$('submit_gift_note_btn_in_progress').hide();
			
			return;
		}
		$('submit_gift_note_btn').hide();
		$('submit_gift_note_btn_in_progress').show();
			
		g_nSubmitGiftNoteButtonState++;
		if ( g_nSubmitGiftNoteButtonState > 3 )
			g_nSubmitGiftNoteButtonState = 1;
			
		var append = '';
		if ( g_nSubmitGiftNoteButtonState == 1 )
		{
			append = '.';
		}
		else if ( g_nSubmitGiftNoteButtonState == 2 ) 
		{
			append = '..';
		}
		else 
		{
			append = '...';
		} 
		
		SetButtonInnerHtml('submit_gift_note_btn_in_progress', 'Working'+append );
		
		setTimeout( AnimateSubmitGiftNoteButton, 500 );
	} 
	catch( e ) 
	{
		ReportCheckoutJSError( 'Failed in AnimateSubmitGiftNoteButton', e );
	}
}

function OnSaveBillingAddressSuccess()
{
	var form = document.createElement( 'form' );
	document.body.appendChild( form );
	form.method = 'post';
	if ( $('cache_return_url') )
		form.action = $('cache_return_url').value;
	else
		form.action = 'https://store.steampowered.com/account/';	

	var address = { 
		'FirstName' : $('first_name').value,
		'LastName' : $('last_name').value,
		'Address' : $('billing_address').value,
		'AddressTwo' : $('billing_address_two').value,
		'Country' : $('billing_country').value,
		'City' : $('billing_city').value,
		'State' : ( g_bHasBillingStates ? $('billing_state_select').value : $('billing_state_text').value),
		'PostalCode' : $('billing_postal_code').value,
		'Phone' : $('billing_phone').value,
		'sessionid' : g_sessionID
	}

	for ( var key in address )
	{
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = address[key];
        form.appendChild(input);
	}	
	
	form.submit();
}

function SaveBillingAddress()
{
		if ( !$('save_my_address').checked )
	{
		OnSaveBillingAddressSuccess();
		return;
	}

	try 
	{
		BillingAddress_SaveBillingAddress( g_sessionID, 'https://store.steampowered.com/checkout/updatebillingaddress/',
		{
		    onSuccess: function(result){
				// Success...
				if ( result.success == 1 )
				{
					OnSaveBillingAddressSuccess();
					return;
				}
				else
				{
					OnInitializeTransactionFailure( 0 );
					return;
				}
		    },
		    onFailure: function(){
				OnInitializeTransactionFailure( 0  );
			}
		});
	} 
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed gathering form data and calling UpdateBillingAddress', e );
	}
}

var g_bInitTransactionCallRunning = false;
function InitializeTransaction()
{
		if( g_bInitTransactionCallRunning )
		return;
		
	var giftee_account_id = 0;
	var giftee_email = '';
	var giftee_name = '';
	var gift_message = '';
	var gift_sentiment = '';
	var gift_signature = '';
	var gift_scheduled_send = 0;
	var bIsGift = false;
	
		$('is_external_finalize_transaction').value = 0;
	
		if ( g_bIsUpdateBillingInfoForm && g_bUpdateBillingFormAddressOnly )
	{
		SaveBillingAddress();
		return;
	}

		if ( g_bIsUpdateBillingInfoForm && BIsStoredCreditCard() )
	{
		var result = new Object();
		result.success = 1;
		result.purchaseresultdetail = 0;
		OnPurchaseSuccess( result );
		return;
	}
	
	try 
	{
		var old_transaction_id = $('transaction_id').value;
		if ( old_transaction_id != '' && old_transaction_id != -1 )
		{
			$('transaction_id').value = -1;
			$('paypaltoken').value = '';
			
									new Ajax.Request('https://store.steampowered.com/checkout/canceltransaction/',
			{
			    method:'post',
			    parameters: { 
					'transid' : old_transaction_id 
				},
			    onSuccess: function(transport){
			    	//alert( 'cancel ok' );
					return;
			    },
			    onFailure: function(){
			    	//alert( 'cancel fail' );
					return;
				}
			});
		}
	} 
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed cancelling previous transaction', e );
	}
	
	try 
	{
				if ( $( 'send_via_email' ) || $('send_via_friends') )
		{
			bIsGift = true;
			if ( $( 'send_via_email' ) && $( 'send_via_email' ).checked )
			{
				giftee_email = $( 'email_input' ).value;
			}
			else
			{
				giftee_account_id = currently_selected_friend_id;
			}
			giftee_name = $('gift_recipient_name').value;
			gift_message = $('gift_message_text').value;
			gift_sentiment = $('gift_sentiment').value;
			gift_signature = $('gift_signature').value;
			gift_scheduled_send = GatherScheduledSendFields();
		}
		
		var bHasCardInfo = false;
		var method = $('payment_method');
		if ( BIsCreditCardMethod( method.value ) )
		{
			bHasCardInfo = true;
		}
		
				g_bInitTransactionCallRunning = true;
		
				AnimateSubmitPaymentInfoButton();
		
		var sPaymentMethod = method.value;
		if ( BIsStoredCreditCard() )
		{
			sPaymentMethod = $('stored_payment_method').value;
		}
		else if ( method.value == 'storedpaypal' && g_bEnableCachedPayPalCredentials )
		{
			sPaymentMethod = 'paypal';
		}
		else if ( method.value == 'updatepaypal' )
		{
			sPaymentMethod = 'paypal';
		}
	 
	 	var paymentGID = '';
	 	
	 	if ( BIsStoredCreditCard() )
	 	{
	 		paymentGID = $('stored_card_id').value;
	 	}
	 	else if ( method.value == 'storedpaypal' && g_bEnableCachedPayPalCredentials )
	 	{
	 		paymentGID = $('stored_paypal_id').value;
	 	}
		
		var bSaveBillingAddress = g_bIsUpdateBillingInfoForm;
		if ( $('save_my_address').checked && !BIsStoredCreditCard() && method.value != 'storedpaypal' )
		{
			if ( method.value == 'paypal' || method.value == 'updatepaypal' )
				bSaveBillingAddress = g_bEnableCachedPayPalCredentials;
			else
				bSaveBillingAddress = true;
		}

		$('gift_tracking_description').hide();
				if ( bIsGift )
		{
			if ( $('send_self') && $('send_self').checked )
			{
								$('checkout_receipt_description').innerHTML = 'A receipt will be emailed to you shortly.<br/><br/>The items you purchased have been added to your Steam Inventory. Click <%1$s>here<%2$s> to view your Steam Inventory and to see options for sending these items as gifts to your friends.'.replace( '<%1$s>', '<a href="' + g_sInventoryLink + '">').replace( '<%2$s>', '</a>');
			}
			else
			{
								$('checkout_receipt_description').innerHTML = 'Your gift is on its way! A receipt will be emailed to you soon.';
				$('gift_tracking_description').show();
			}
		}
		else if ( g_bMicroTxn )
		{
						$('checkout_receipt_description').innerHTML = 'Your funds are available for use immediately, and a receipt will be emailed to you shortly.';
		}
		else if ( g_bWalletCreditOnly )
		{
						$('checkout_receipt_description').innerHTML = 'Your funds are available for use immediately, and a receipt will be emailed to you shortly.';
		}
		else if ( g_bIsInOverlay )
		{
						$('checkout_receipt_description').innerHTML = 'An email confirmation has been sent to you.<br /><br/>Any digital items in this order are now registered to your account on Steam.  To access your items, simply visit your <a href="steam://open/games">library</a> in Steam whenever you\'re ready.';
		}
		else
		{
			if ( g_nItemsForSelf > 0 && g_nItemsForGifts > 0 )
			{
								$('checkout_receipt_description').innerHTML = 'A receipt will be emailed to you shortly.<br/><br/>Your digitally delivered items are now registered to your account on Steam. To access your items, simply visit your library in Steam whenever you\'re ready.<br/><br/>Extra copies of items from this purchase have been added to your Steam Inventory. Click <%1$s>here<%2$s> to view your Steam Inventory and to see options for sending your extra copies as gifts to your friends.'.replace( '<%1$s>', '<a href="' + g_sInventoryLink + '">').replace( '<%2$s>', '</a>');
			}
			else if ( g_nItemsForSelf == 0 && g_nItemsForGifts > 0 )
			{
								$('checkout_receipt_description').innerHTML = 'A receipt will be emailed to you shortly.<br/><br/>The items you purchased have been added to your Steam Inventory. Click <%1$s>here<%2$s> to view your Steam Inventory and to see options for sending these items as gifts to your friends.'.replace( '<%1$s>', '<a href="' + g_sInventoryLink + '">').replace( '<%2$s>', '</a>');
			}
			else
			{
								$('checkout_receipt_description').innerHTML = 'An email confirmation has been sent to you.<br /><br/>Any digital items in this order are now registered to your account on Steam.  To access your items, simply visit your <a href="steam://open/games">library</a> in Steam whenever you\'re ready.';
			}
		}

		new Ajax.Request('https://store.steampowered.com/checkout/inittransaction/',
		{
		    method:'post',
		    parameters: { 
				// Info for all carts
				'gidShoppingCart' : $J('#shopping_cart_gid').val() || -1,
				'gidReplayOfTransID' : $J('#gid_replay' ).val() || -1,
				'PaymentMethod' : sPaymentMethod,
				'abortPendingTransactions' : ( $('cancel_pending').checked ? 1 : 0 ),
		    	
				'bHasCardInfo' : ( bHasCardInfo ? 1 : 0 ),
				'CardNumber' : $('card_number').value,
				'CardExpirationYear' : $('expiration_year').value,
				'CardExpirationMonth' : $('expiration_month').value,
				
				// address info, which may go unused depending on payment method
				'FirstName' : $('first_name').value,
				'LastName' : $('last_name').value,
				'Address' : $('billing_address').value,
				'AddressTwo' : $('billing_address_two').value,
				'Country' : $('billing_country').value,
				'City' : $('billing_city').value,
				'State' : ( g_bHasBillingStates ? $('billing_state_select').value : $('billing_state_text').value),
				'PostalCode' : $('billing_postal_code').value,
				'Phone' : $('billing_phone').value,

				'ShippingFirstName' : $('shipping_first_name') ? $('shipping_first_name').value : '',
				'ShippingLastName' : $('shipping_last_name').value,
				'ShippingAddress' : $('shipping_address').value,
				'ShippingAddressTwo' : $('shipping_address_two').value,
				'ShippingCountry' : $('shipping_country').value,
				'ShippingCity' : $('shipping_city').value,
				'ShippingState' : ( g_bHasBillingStates ? $('shipping_state_select').value : $('shipping_state_text').value),
				'ShippingPostalCode' : $('shipping_postal_code').value,
				'ShippingPhone' : $('shipping_phone').value,

		    	
				// gift info, which may or may not exist
				'bIsGift' : ( bIsGift ? 1 : 0 ),
				'GifteeAccountID' : giftee_account_id,
				'GifteeEmail' : giftee_email,
				'GifteeName' : giftee_name,
				'GiftMessage' : gift_message,
				'Sentiment' : gift_sentiment,
				'Signature' : gift_signature,
				'ScheduledSendOnDate': gift_scheduled_send,
				
				'BankAccount' : $('bank_account').value,
				'BankCode' : $('bank_code').value,
				'BankIBAN' : $('bank_iban').value,
				'BankBIC' : $('bank_bic').value,
                'TPBankID' : $('bank_name').value,
				
								'bSaveBillingAddress' : bSaveBillingAddress ? 1 : 0,
				'gidPaymentID' : paymentGID,
				'bUseRemainingSteamAccount' : (g_bUseRemainingSteamAccount ? 1 : 0),
				'bPreAuthOnly' : (g_bIsUpdateBillingInfoForm ? 1 : 0),

				'sessionid' : g_sessionID
			},
		    onSuccess: function(transport){
		    	g_bInitTransactionCallRunning = false;
				if ( transport.responseText ){
					try {
						var result = transport.responseText.evalJSON(true);
		      		} catch ( e ) {
		      			// Failure
		      			OnInitializeTransactionFailure( 0 );
		      		}
		      	   	// Success...
		      	   	if ( result.success == 1 && result.transid != -1 )
		      	   	{
		      	   		OnInitializeTransactionSuccess( result );
		      	   		return;
		      	   	}
		      	   	else
		      	   	{
		      	   		OnInitializeTransactionFailure( result.purchaseresultdetail, result );
		      	   		return;
		      	   	}
			  	}
			  	
								OnInitializeTransactionFailure( 0  );
		    },
		    onFailure: function(){
								g_bInitTransactionCallRunning = false;
				OnInitializeTransactionFailure( 0  );
			}
		});
	} 
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed gathering form data and calling InitializeTransaction', e );
	}
}

function BIsBankChoiceMethod( method )
{
    return method == 'ideal';
}

function OnInitializeTransactionSuccess( result )
{
	try 
	{
		var method = $('payment_method');
		
				$('transaction_id').value = result.transid;
		var method = $('payment_method');
		
		$J('#submit_payment_info_btn').show();
		$J('#paypal-button').hide();
		
				if ( result.paymentmethod == 4 && result.transactionprovider != 5 && method.value != 'storedpaypal' )
		{
									
						$J('#payment_row_one').hide();

			$J('#payment_row_address, #payment_header_title' ).hide();
			$J('#payment_header_title').hide();
			$J('#payment_row_save_my_address').hide();
			$J('#payment_row_bank_name').hide();
			$J('#payment_row_country_verification').hide();
			$J('#payment_row_step2').hide();
			$J('#payment_method_specific_note').hide();
			$J('#payment_method_notes').hide();
			$J('#payment_row_eight').show();
			
						$J('#credit_card_row').hide();
			$J('#card_number_label').hide();
			$J('#card_number').hide();
					
			$('paypaltoken').value = result.paypaltoken;
			$('external_payment_processor_notice').innerHTML = 'PayPal transactions are authorized through the PayPal web site. Click the button below to open a new web browser window to initiate the transaction.';
			
			if ( false || !g_bUseNewPayPalCheckout )
			{
				$('submit_payment_info_btn').href = "javascript:PerformPayPalAuthorization();";
				$( 'payment_info_form' ).onsubmit = function() { PerformPayPalAuthorization(); return false; };
				SetButtonInnerHtml('submit_payment_info_btn', 'Begin PayPal Purchase' );
			}
			else
			{
				$J('#submit_payment_info_btn').hide();
				$J('#submit_payment_info_btn_in_progress').hide();				
				$J('#paypal-button').html('');
				
				paypal.Button.render({
					env: 'production',

					commit: true, // Show a 'Pay Now' button

					style: {
					color: 'gold',
					shape: 'rect',
					size: 'small',
					label: 'paypal',
					tagline: false
					},

					payment: function(data, actions) {
					g_bPayPalAuthInFlight = true;
					return $J('#paypaltoken').val();
					},

					onAuthorize: function(data, actions) {
					OnPayPalSuccess( $J('#transaction_id').val() );
					},

					onCancel: function(data, actions) {
					OnPayPalCancel( $J('#transaction_id').val() );
					},

					onError: function(err) {
					OnPayPalCancel( $J('transaction_id').val() );
					}
				}, '#paypal-button');
				
				$J('#paypal-button').show();
			}
			
			$J('#payment_method_previous_button').hide();
			
			return;
		}
		else if ( ( result.paymentmethod == 4 && method.value != 'storedpaypal' ) || result.paymentmethod == 3 
					|| result.paymentmethod == 5 || result.paymentmethod == 6					|| result.paymentmethod == 7 || result.paymentmethod == 9					|| result.paymentmethod == 10					|| result.paymentmethod == 11 || result.paymentmethod == 78					|| result.paymentmethod == 12 
					|| result.paymentmethod == 14 
					|| result.paymentmethod == 33 
					|| result.paymentmethod == 18 || result.paymentmethod == 19					|| result.paymentmethod == 20 || result.paymentmethod == 21					|| result.paymentmethod == 22 || result.paymentmethod == 23					|| result.paymentmethod == 24 || result.paymentmethod == 25					|| result.paymentmethod == 26 || result.paymentmethod == 27					|| result.paymentmethod == 28 || result.paymentmethod == 29 
					|| result.paymentmethod == 45 || result.paymentmethod == 46 
					|| result.paymentmethod == 47 || result.paymentmethod == 121 
					|| result.paymentmethod == 48					|| result.paymentmethod == 49 || result.paymentmethod == 50					|| result.paymentmethod == 51 || result.paymentmethod == 52					|| result.paymentmethod == 53 || result.paymentmethod == 54					|| result.paymentmethod == 55 || result.paymentmethod == 56					|| result.paymentmethod == 57 || result.paymentmethod == 58					|| result.paymentmethod == 59 || result.paymentmethod == 60					|| result.paymentmethod == 61 || result.paymentmethod == 62					|| result.paymentmethod == 66					|| result.paymentmethod == 31					|| result.paymentmethod == 34					|| result.paymentmethod == 36					|| result.paymentmethod == 37					|| result.paymentmethod == 38					|| result.paymentmethod == 65 || result.paymentmethod == 125					|| result.paymentmethod == 39					|| result.paymentmethod == 40 || result.paymentmethod == 127					|| result.paymentmethod == 42					|| result.paymentmethod == 35					|| result.paymentmethod == 67					|| result.paymentmethod == 68					|| result.paymentmethod == 69					|| result.paymentmethod == 70					|| result.paymentmethod == 71					|| result.paymentmethod == 72					|| result.paymentmethod == 73					|| result.paymentmethod == 74					|| result.paymentmethod == 75					|| result.paymentmethod == 76					|| result.paymentmethod == 77					|| result.paymentmethod == 79					|| result.paymentmethod == 81					|| result.paymentmethod == 82					|| result.paymentmethod == 83					|| result.paymentmethod == 84					|| result.paymentmethod == 85					|| result.paymentmethod == 86					|| result.paymentmethod == 87					|| result.paymentmethod == 88					|| result.paymentmethod == 89					|| result.paymentmethod == 90					|| result.paymentmethod == 91					|| result.paymentmethod == 92					|| result.paymentmethod == 93					|| result.paymentmethod == 94					|| result.paymentmethod == 95					|| result.paymentmethod == 96					|| result.paymentmethod == 97					|| result.paymentmethod == 98					|| result.paymentmethod == 99					|| result.paymentmethod == 100					|| result.paymentmethod == 101					|| result.paymentmethod == 102					|| result.paymentmethod == 103					|| result.paymentmethod == 104					|| result.paymentmethod == 105					|| result.paymentmethod == 106					|| result.paymentmethod == 107					|| result.paymentmethod == 108					|| result.paymentmethod == 109					|| result.paymentmethod == 110					|| result.paymentmethod == 111					|| result.paymentmethod == 112					|| result.paymentmethod == 113					|| result.paymentmethod == 114					|| result.paymentmethod == 115					|| result.paymentmethod == 119					|| result.paymentmethod == 120					|| result.paymentmethod == 116					|| result.paymentmethod == 117					|| result.paymentmethod == 118					|| result.paymentmethod == 63					|| result.paymentmethod == 122				)
		{
						
						$('is_external_finalize_transaction').value = 1;
			
			
			GetFinalPriceAndUpdateReviewTab();
		}
		else if ( result.paymentmethod == 128 )
		{
						DHighlightItemByValue( 'payment_method', 'steamaccount', true );	
			GetFinalPriceAndUpdateReviewTab();
		}
		else
		{
						GetFinalPriceAndUpdateReviewTab();
		}
	} 
	catch( e ) 
	{
		ReportCheckoutJSError( 'Failed handling InitializeTransaction success', e );
	}
}

function OnInitializeTransactionFailure( detail, result )
{
	try 
	{
				SetTabEnabled( 'payment_info' );
		var error_text = 'There seems to have been an error initializing or updating your transaction.  Please wait a minute and try again or contact support for assistance.';
		if ( result && result.specificerrortext )
		{
			error_text = result.specificerrortext;
		}
		else
		{
			switch ( detail )
			{
				case 1:
					error_text = 'Your billing information has failed address verification.  Please correct the error or contact support for assistance.';
					break;
				case 2:
					error_text = 'Your billing information has reported insufficient funds are available. Please correct the error or contact support for assistance.';
					break;
				case 3:
					error_text = 'There has been an internal error initializing your transaction.  Please contact support for assistance.';
					break;
				case 6:
					error_text = 'There was a problem using the selected payment method for your purchase.  Please select another payment method for your purchase and try again.';
					break;
				case 82:
					error_text = 'This payment method is currently unavailable for use.  We are working to resolve the issue.  Please select another payment method for your purchase and try again.';
					break;
				case 83:
					error_text = 'The selected payment method is not supported for a product you are purchasing.  Please select another payment method for your purchase and try again.';
					break;
				case 33:
					error_text = 'Your purchase could not be completed because your credit card has expired. Please enter a new credit card and try again.';
					break;
				case 24:
					error_text = 'Your transaction failed because you are trying to buy a game that requires ownership of another game you do not currently own.  Please correct the error and try again.';
					break;
				case 9:
					error_text = 'Your purchase could not be completed because it looks like you already own one of the games you are trying to buy.  Please check your account and your cart to verify you are buying an item you do not already own.';
					break;
				case 57:
					error_text = 'Your purchase could not be completed because it looks like you already have an existing subscription for the same item.  Please manage your subscription details in your <a href=\'https://store.steampowered.com/account\'>account</a> page.';
					break;
				case 31:
					error_text = 'Your purchase could not be completed because it looks like the currency of funds in your Steam Wallet does not match the currency of this purchase.';
					break;
				case 35:
					error_text = 'Your purchase has not been completed.<br>The amount being added to your Steam Wallet would exceed the maximum allowed Steam Wallet balance.';
					break;
				case 39:
					error_text = 'Your purchase could not be completed because your cart contains items that cannot be given as a gift.';
					break;
				case 40:
					error_text = 'Your purchase could not be completed because your cart contains items that cannot be shipped outside the United States.';
					break;
				case 38:
					error_text = 'Your order cannot be completed because one or more items in your cart is currently out of stock.  Please try again later.';
					break;
				case 59:
					error_text = 'Your order cannot be completed because one or more items in your cart cannot be shipping to your shipping address.';
					break;
				case 44:
					error_text = 'Your purchase was not completed. Your account is currently locked from purchasing. Please contact Steam Support for details.';
					break;
				case 45:
					error_text = 'Warning!<br><br>Your last purchase with Steam is still pending. Your payment provider has not yet told us if they will charge you for that transaction.<br><br>Before continuing with this purchase, please contact your payment provider and verify that your previous purchase was not completed. If it was completed and you continue with this purchase, you could be charged twice for any items that are purchased for a second time.';
					$J('#cancel_pending_verification').show();
					ValidationMarkFieldBad( $('cancel_pending_label' ) );
					break;
				case 46:
					error_text = 'For the protection of the account holder, this purchase has been declined. Further purchasing will be temporarily limited - please contact Steam Support to resolve this issue.';
					break;
				case 47:
					error_text = 'You cannot complete your transaction because you are attempting to purchase an item that is already included in another packaged item in your cart.  Please check your cart to verify that you are not purchasing an item multiple times.  The most common cause would be purchasing DLC along with a deluxe version of a product that already includes the same DLC.';
					break;
				case 23:
					error_text = 'The current payment method does not match the country of the store.  The cart has been converted and the updated total will show on the next page.  You may also review your cart <a href=\'https://store.steampowered.com/cart/country_changed\'>here</a>, or change your payment method below.';
					break;
				case 8:
					error_text = 'Your transaction cannot be completed because you have another pending transaction on your account.';
					break;
				case 52:
					error_text = 'Your transaction cannot be completed because you have another pending transaction for one or more items in your cart.';
					break;
				case 55:
					error_text = 'This card number is not valid for the payment method you selected.';
					break;
				case 56:
					error_text = 'Hey big spender, easy does it! Your shopping cart total exceeds our maximum allowable purchase amount. Please <a href=\'https://store.steampowered.com/cart\'>edit the contents of your cart</a> and try again.';
					break;
				case 53:
					error_text = 'It looks like you\'ve been attempting a lot of purchases in the last few hours.  Please wait a while before trying again.';
					break;
				case 13:
					error_text = 'Your purchase could not be completed because there are items in your cart that are restricted in your country.';
					break;
				case 70:
					error_text = 'The friend you\'ve selected to receive this gift already owns it.';
					break;
				case 71:
					error_text = 'The gift you are trying to purchase is not available in the recipient\'s region.';
					break;
				case 72:
					error_text = 'Due to regional price differences, the gift you are trying to send cannot be sent to the recipient\'s region.';
					break;
				case 69:
					error_text = 'Your order cannot be completed because your cart contains items that are reserved for commercial use only.';
					break;
				case 74:
					error_text = 'Your order cannot be completed because your cart contains items that are not allowed for use on commercial accounts.';
					break;
				case 75:
					error_text = 'Your current country does not match up with the country of your registered business.';
					break;
				case 78:
					error_text = 'The billing address you entered is too long. Please use a shortened version of your address or split it up into the two address fields.';
					break;
				case 79:
					error_text = 'Your credit card number appears to be invalid.  Please verify your card and try again.';
					break;
				case 81:
					error_text = 'Your billing name is invalid because it is empty or contains too many numeric characters.';
					break;
				case 87:
					error_text = 'Your order cannot be completed because your cart contains items that you\'ve already purchased, but removed from your account.  Please visit <a href="https://help.steampowered.com/en/wizard/HelpWithGame">support</a> to re-enable access to your content.';
					break;
				default:
					break;
			}
		}
		
		DisplayErrorMessage( error_text );
	} 
	catch (e) 
	{
		ReportCheckoutJSError( 'Failed handling InitializeTransaction failure', e );
	}
}


 
function OnAuthenticationComplete( gidTransID )
{
		if ( gidTransID && g_LastFinalizedTransactionID != gidTransID )
		return;

	if ( g_timeoutPoll )
	{
		clearTimeout( g_timeoutPoll );
	}
	
	g_timeoutPoll = setTimeout( NewPollForTransactionStatusClosure( g_LastFinalizedTransactionID, 120, 15 ), 1*1000 );
	return true;
}


 
function OnPayPalSuccess( gidTransID )
{
		if ( gidTransID && $('transaction_id').value != gidTransID )
		return;
		
	$J('#submit_payment_info_btn').show();
	$J('#paypal-button').hide();		

		if ( $('is_external_finalize_transaction').value == 1 )
	{
				if ( g_bPollingForTransactionStatus )
		{
			if ( g_timeoutPoll )
			{
				clearTimeout( g_timeoutPoll );
				
				var method = $('payment_method');
				
				switch( method.value )
				{
										case 'boleto':
					case 'boacompragold':
					case 'bancodobrasilonline':
					case 'itauonline':
					case 'bradescoonline':
					case 'pagseguro':
					case 'visabrazil':
					case 'amexbrazil':
					case 'hipercard':
					case 'aura':
					case 'mastercardbrazil':
					case 'dinerscardbrazil':
					case 'multibanco':
					case 'payshop':
					case 'maestroboacompra':
					case 'visaelectronboacompra':
					case 'oxxo':
					case 'toditocash':
					case 'carnet':
					case 'spei':
					case '3pay':
					case 'isbank':
					case 'garanti':
					case 'akbank':
					case 'yapikredi':
					case 'halkbank':
					case 'bankasya':
					case 'finansbank':
					case 'denizbank':
					case 'ptt':
					case 'cashu':
					case 'onecard':
					case 'molpoints':
					case 'konbini':
					case 'bank_transfer_japan':
					case 'payeasy':
					case 'pse':
					case 'exito':
					case 'efecty':
					case 'baloto':
					case 'pinvalidda':
					case 'mangirkart':
					case 'bancocreditodeperu':
					case 'bbvacontinental':
					case 'safetypay':
					case 'pagoefectivo':
					case 'trustly':
					case 'nodwin_cod':
						DisplayPendingReceiptPage();
						break;

					default:
												g_timeoutPoll = setTimeout( NewPollForTransactionStatusClosure( $('transaction_id').value, 120, 15 ), 1*1000 );
					break;
				}
			}
		}
		else
		{
			FinalizeTransaction();
		}
	}
	else
	{
		if ( g_bPayPalAuthInFlight )
			GetFinalPriceAndUpdateReviewTab();
		g_bPayPalAuthInFlight = false;
	}
	return true;
}


function OnPayPalCancel( gidTransID )
{
		if ( gidTransID && $('transaction_id').value != gidTransID )
		return;

	$J('#payment_method_previous_button').show();
	$J('#paypal-button').hide();
	
	HandleFinalizeTransactionFailure( 4, 0, false, '' );
	return true;
}

var g_bGetFinalPriceRunning = false;
function GetFinalPriceAndUpdateReviewTab()
{
	try 
	{
				if ( g_bGetFinalPriceRunning )
			return;
	
		g_bGetFinalPriceRunning = true;
		// clear the cancel pending checkbox in case we need to go back
		$('cancel_pending').checked = false;
		
						if ( !g_bAnimatingSubmitButtonCurrently )
			AnimateSubmitPaymentInfoButton();
	
				var transid = $('transaction_id').value;
		var microtxnid = $('microtxn_id') ? $('microtxn_id').value : -1;
		var cart = $J('#shopping_cart_gid' ).val() || -1;
		var gidReplayOfTransID = $J('#gid_replay' ).val() || -1;
		new Ajax.Request('https://store.steampowered.com/checkout/getfinalprice/',
		{
		    method:'get',
		    parameters: { 
				'count' : ++nGetFinalPriceCalls,
				'transid' : transid,
				'purchasetype' : g_bIsGiftForm ? 'gift' : 'self',
				'microtxnid' : microtxnid,
				'cart' : cart,
				'gidReplayOfTransID' : gidReplayOfTransID
			},
		    onSuccess: function(transport){
		    	g_bGetFinalPriceRunning = false;
				if ( transport.responseText ){
					try {
						var result = transport.responseText.evalJSON(true);
		      		} catch ( e ) {
		      			OnGetFinalPriceFailure( 0 );
		      		}
		      	   	if ( result.success == 1 )
		      	   	{
		      	   		OnGetFinalPriceSuccess( result );
		      	   		return;
		      	   	}
		      	   	else
		      	   	{
		      	   		OnGetFinalPriceFailure( result.purchaseresultdetail );
		      	   		return;
		      	   	}
			  	}
			  	
								OnGetFinalPriceFailure( 0 );
		    },
		    onFailure: function(){
								g_bGetFinalPriceRunning = false;
				OnGetFinalPriceFailure( 0 );
			}
		});
	} 
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed making GetFinalPrice request', e );
	}
}

var g_bRequiresCVVReEntry = false;
function OnGetFinalPriceSuccess( result )
{
	try 
	{
				$('stored_card_processing').hide();
		g_bRequiresCVVReEntry = result.requirecvv;
		
				UpdateReviewPageBillingInfoWithCurrentValues( result );
		
		if ( result )
		{
						
			if ( result.total )
				g_nPurchaseTotal = result.total;
			
			if ( result.steamAccountBalance )
				g_nSteamAccountBalance = result.steamAccountBalance;
			
			if ( result.formattedProviderRemaining )
				g_strProviderRemaining = result.formattedProviderRemaining;
			
						if ( result.providerpaymentmethod != null && result.total && result.steamAccountBalance )
			{
				if ( result.providerpaymentmethod == 0 && result.total > result.steamAccountBalance )
				{
					SetTabEnabled( 'payment_info' );
										g_bUseRemainingSteamAccount = true;
					ShowNextPaymentMethod();
					return;
				}
			}

			result.priceOfASubChanged ? $J('#checkout_review_cart_message').show() : $('checkout_review_cart_message').hide();
		}

		var method = $('payment_method');

				if ( $('is_external_finalize_transaction').value == 1 )
		{
			if ( $('col_right_review_payment_tips') )
			{
				$J('#col_right_review_payment_tips').show();
			}
		
			if ( result.externalurl )
			{
								var url = result.externalurl.replace( /%/g, '%25' );
				$('purchase_button_bottom').href = "javascript:PerformExternalFinalizeTransaction( '"+url.replace( /\'/g, "\\'" )+"', " + ( result.useexternalredirect ? "true" : "false" ) + " );";
				$J('#purchase_bottom_note_paypalgc').show();

				$('purchase_top').show();
				
				if ( method.value == 'giropay' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'GiroPay transactions are authorized through your bank\'s web site.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to GiroPay Authorization';

					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for GiroPay customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'In order to complete the purchase via Giropay you will be transported to your bank’s website where you will be asked to enter your online banking PIN and a unique TAN.  If you don’t have both PIN and TAN available to you at the moment, please choose a different payment method.  If you are not returned to Steam after 10 seconds, please click the "Return To Merchant" button and allow the transaction to process.<br/><br/>This process can take up to 60 seconds.  To avoid purchasing failures, please do not hit your back button or close the GiroPay window before the process is complete.';
					}
				}
				else if ( method.value == 'ideal' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'iDEAL transactions are authorized through iDEAL\'s website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to iDEAL Authorization';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for iDEAL customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure that you confirm your purchase on the iDEAL website.  If you are not returned to Steam after 10 seconds, please click the "Back to Shop" button after you have finished filling in your billing information and allow the transaction to process.<br/><br/>This process can take up to 60 seconds.  To avoid purchasing failures, please do not hit your back button or close the iDEAL window before the process is complete.';
					}
				}
				else if ( method.value == 'paysafe' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'PaySafe Card transactions are authorized through PaySafe\'s website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to PaySafe Card Authorization';					
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for PaySafeCard customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure that you confirm your purchase on the PaySafeCard website.  After filling in your code you will be automatically re-routed back to the Steam client which will confirm your purchase.  To avoid purchasing failures, please do not hit your back button or close the PaySafe window before the process is complete.';
					}
				}
				else if ( method.value == 'paypal' || method.value == 'storedpaypal' || method.value == 'updatepaypal' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'PayPal transactions are authorized through the PayPal web site. Click the button below to open a new web browser window to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Begin PayPal Purchase';

					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for PayPal customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure that you confirm your purchase on the PayPal website.  If you are not returned to Steam after 10 seconds, please click the "Return To Merchant" button and allow the transaction to process.<br/><br/>This process can take up to 60 seconds.  To avoid purchasing failures, please do not hit your back button or close the PayPal window before the process is complete.';
					}
				}
				else if ( method.value == 'sofort' )
				{
					if ( result.storeCountryCode == 'GB' || result.storeCountryCode == 'BE' )
					{
						$('purchase_bottom_note_paypalgc').innerHTML = 'DIRECTebanking transactions are authorized through the DIRECTebanking.com website.  Click the button below to open a new web browser to initiate the transaction.';
						$('purchase_button_bottom_text').innerHTML = 'Continue to DIRECTebanking.com';
						
						if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
						{
							$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for DIRECTebanking customers';
							$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure that you confirm your purchase on the DIRECTebanking website. When using DIRECTebanking as your payment method, make sure that you hit the "NEXT" button after you have finished filling in your TAN/PIN number. You will be automatically re-routed back to the Steam client which will confirm your purchase.<br/><br/>This process can take up to 60 seconds.  To avoid purchasing failures, please do not hit your back button or close the DIRECTebanking window before the process is complete.';
						}
					}
					else
					{
						$('purchase_bottom_note_paypalgc').innerHTML = 'Sofortüberweisung transactions are authorized through the sofortüberweisung.de website.  Click the button below to open a new web browser to initiate the transaction.';
						$('purchase_button_bottom_text').innerHTML = 'Continue to sofortüberweisung.de';
						if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
						{
							$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Sofortüberweisung customers';
							$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure that you confirm your purchase on the sofortüberweisung.de website.  When using Sofortüberweisung as your payment method, make sure that you hit the "NEXT" button after you have finished filling in your TAN/PIN number. You will be automatically re-routed back to the Steam client which will confirm your purchase.<br/><br/>This process can take up to 60 seconds.  To avoid purchasing failures, please do not hit your back button or close the Sofortüberweisung window before the process is complete.';
						}
					}
				}
				else if ( method.value == 'webmoney' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'WebMoney transactions are authorized through the WebMoney website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to WebMoney';					
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for WebMoney customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure that you confirm your purchase on the WebMoney website.  When using WebMoney as your payment method, after filling in your code you will be automatically re-routed back to the Steam client which will confirm your purchase.<br/><br/>This process can take up to 60 seconds.  To avoid purchasing failures, please do not hit your back button or close the WebMoney window before the process is complete.';
					}
				}
				else if ( method.value == 'moneybookers' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Skrill transactions are authorized through the Skrill website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Skrill';					

					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Skrill customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure that you confirm your purchase on the Skrill website by clicking the “CONFIRM” button after you have selected your payment method.  If you are not returned to Steam after 10 seconds, please click the "Return To Merchant" button and allow the transaction to process.<br/><br/>This process can take up to 60 seconds.  To avoid purchasing failures, please do not hit your back button or close the Skrill window before the process is complete.';
					}
				}
				else if ( method.value == 'alipay' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'AliPay transactions are authorized through the AliPay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to AliPay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for AliPay customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure that you confirm your purchase on the AliPay website.  If you are not returned to Steam after 10 seconds, please click the "Return To Merchant" button and allow the transaction to process.<br/><br/>This process can take up to 60 seconds.  To avoid purchasing failures, please do not hit your back button or close the AliPay window before the process is complete.';
					}
				}
				else if ( method.value == 'unionpay' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'UnionPay transactions are authorized through the UnionPay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to UnionPay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for UnionPay customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure that you confirm your purchase on the UnionPay website.  If you are not returned to Steam after 10 seconds, please click the "Return To Merchant" button and allow the transaction to process.<br/><br/>This process can take up to 60 seconds.  To avoid purchasing failures, please do not hit your back button or close the UnionPay window before the process is complete.';
					}
				}
				else if ( method.value == 'yandex' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Yandex transactions are authorized through the Yandex website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Yandex';

					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Yandex customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure that you confirm your purchase on the Yandex website.  If you are not returned to Steam after 10 seconds, please click the "Return To Merchant" button and allow the transaction to process.<br/><br/>This process can take up to 60 seconds.  To avoid purchasing failures, please do not hit your back button or close the Yandex window before the process is complete.';
					}
				}
				else if ( method.value == 'qiwi' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'QIWI Wallet transactions are authorized through the QIWI Wallet website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to QIWI Wallet';

					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for QIWI Wallet customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the QIWI Wallet website by signing in and approving the order from Steam that shows up in your QIWI Wallet Inbox.<br/><br/>This process can take up to 60 seconds.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
					
					// change the button to do something else
					$('purchase_button_bottom').href = "javascript:CreateQiwiInvoiceAndFinalizeTransaction( '"+url.replace( /\'/g, "\\'" )+"' );";
				}				
				else if ( method.value == 'beeline' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Mobile transactions are authorized through the Xsolla website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Xsolla';

					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Mobile Payment customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Xsolla website by entering your mobile phone number and email address.  You will receive an SMS text that you must respond to complete the transaction.<br/><br/>This process can take up to 60 seconds.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}				
				else if ( method.value == 'boleto' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Boleto Bancario transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Boleto Bancario customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure to save or print your Boleto from the Boacompra website as you complete your transaction.  An email from BoaCompra will also be sent to you with a link to the printable Boleto.<br/><br/>You will need to fund this billing slip before your transaction will be complete.  This process can take up to a few business days depending on when you complete payment of your Boleto.  Once the deposit of funds has been confirmed by your bank, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'boacompragold' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'BoaCompra Gold transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for BoaCompra Gold customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'bancodobrasilonline' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Banco Do Brasil Online transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Banco Do Brasil Online customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'itauonline' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Itau Online transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Itau Online customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'bradescoonline' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Bradesco Online transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Bradesco Online customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'pagseguro' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Pagseguro transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Pagseguro customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'visabrazil' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Visa (National) transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Visa (National) customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to several business days.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'amexbrazil' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'American Express (National) transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for American Express (National) customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to several business days.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'aura' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Aura transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Aura customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to several business days.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'hipercard' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Hipercard transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Hipercard customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to several business days.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'mastercardbrazil' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Mastercard (National) transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Mastercard (National) customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to several business days.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'dinerscardbrazil' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Diner\'s Club (National) transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Diner\'s Club (National) customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to several business days.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'multibanco' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Multibanco transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Multibanco customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'payshop' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Payshop transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Payshop customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'maestroboacompra' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Maestro transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Maestro customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'visaelectronboacompra' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Visa Electron transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Visa Electron customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'oxxo' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'OXXO transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for OXXO customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>An email from BoaCompra will also be sent to you with a link to the printable OXXO billing slip.<br/><br/>You will need to bring this billing slip to your nearest OXXO cashier, scan the barcode, and complete the transaction.  The payment will automatically be posted by 12:00pm the following business day.  Once the deposit of funds has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'toditocash' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Todito Cash transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Todito Cash customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'carnet' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Carnet transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Carnet customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'spei' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'SPEI transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for SPEI customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == '3pay' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Mobile transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for mobile customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'isbank' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Is Bank transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Is Bank customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'garanti' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Garanti transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Garanti customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'akbank' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Akbank transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Akbank customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'yapikredi' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Yapi Kredi transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Yapi Kredi customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'halkbank' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Halkbank transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Halkbank customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'bankasya' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Bank Asya transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Bank Asya customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'finansbank' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Finansbank transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Finansbank customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'denizbank' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'DenizBank transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for DenizBank customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'ptt' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'PTT transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for PTT customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'cashu' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'CashU transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to CashU';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for CashU customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'onecard' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'OneCard transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to OneCard';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for OneCard customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'tenpay' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Tenpay transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Tenpay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Tenpay customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'wechat' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'WeChat transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to WeChat';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for WeChat customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by scanning the QR code with your WeChat application.  Please be aware that your WeChat account must be linked to a valid Chinese bank issued card or the payment may be rejected.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'molpoints' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'MOL Points transactions are authorized through the MOL website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to MOL';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for MOL Points customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the MOL website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}				
				else if ( method.value == 'konbini' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Konbini transactions are authorized through the Degica website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Degica';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Konbini customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure to save or print your Konbini from the Degica website as you complete your transaction.  An email from Degica will also be sent to you with the details of your Konbini.<br/><br/>You will need to fund this billing slip before your transaction will be complete.  This process can take up to a few business days depending on when you complete payment of your Konbini.  Once the deposit of funds has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}				
				else if ( method.value == 'credit_card_japan' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Domestic Credit Card transactions are authorized through the Degica website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Degica';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Domestic Credit Card customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Degica website by signing in and completing your transaction.<br/><br/>This process can take up to several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}				
				else if ( method.value == 'bank_transfer_japan' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Bank transfer transactions are authorized through the Degica website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Degica';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Bank Transfer customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Degica website by signing in and completing your transaction.<br/><br/>This process can take up to a few business days depending on when you complete payment.  Once the deposit of funds has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}				
				else if ( method.value == 'payeasy' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Pay Easy transactions are authorized through the Degica website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Degica';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Pay Easy customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Degica website by signing in and completing your transaction.<br/><br/>This process can take up to a few business days depending on when you complete payment.  Once the deposit of funds has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}				
				else if ( method.value == 'webmoney_japan' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'WebMoney transactions are authorized through the Degica website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Degica';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for WebMoney customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Degica website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}				
				else if ( method.value == 'webmoney_japan_steam_card' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Steam Prepaid Card transactions are authorized by WebMoney through the Degica website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Degica';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Steam Prepaid Card customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Degica website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}				
				else if ( method.value == 'bitcash' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'BitCash transactions are authorized through the Degica website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Degica';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for BitCash customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Degica website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}				
				else if ( method.value == 'netcash' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'NetCash transactions are authorized through the Degica website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Degica';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for NetCash customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Degica website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}				
				else if ( method.value == 'nanaco' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Nanaco transactions are authorized through the Degica website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Degica';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Nanaco customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Degica website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}				
				else if ( method.value == 'zong' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Zong transactions are authorized through the PayPal Payments Hub website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to PayPal Payments Hub';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Zong customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the PayPal Payments Hub website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}				
				else if ( method.value == 'culturevoucher' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Culture Voucher transactions are authorized through the Degica website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Degica';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Culture Voucher customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Degica website by entering your cultureland account details.<br/><br/>This process can take up to 60 seconds.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}				
				else if ( method.value == 'happymoneyvoucher' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Happymoney Voucher transactions are authorized through the Degica website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Degica';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Happymoney Voucher customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Degica website by entering your voucher details.<br/><br/>This process can take up to 60 seconds.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'toss' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Toss transactions are authorized through the Degica website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Degica';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Toss customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Degica website by entering your Toss payment details.<br/><br/>This process can take up to 60 seconds.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'eclubpoints' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'eClub Points transactions are authorized through the eClub Store website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to eClub Store';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for eClub Points customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the eClub Store website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}				
				else if ( method.value == 'pse' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'PSE transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for PSE customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'exito' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Exito transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Exito customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'efecty' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Efecty transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Efecty customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure to save or print your payment slip from the Boacompra website as you complete your transaction.  An email from BoaCompra will also be sent to you with a link to the printable payment slip.<br/><br/>You will need to fund this billing slip before your transaction will be complete.  This process can take up to a few business days depending on when you complete payment.  Once the deposit of funds has been confirmed by your bank, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'baloto' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Baloto transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Baloto customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure to save or print your Baloto from the Boacompra website as you complete your transaction.  An email from BoaCompra will also be sent to you with a link to the printable Baloto.<br/><br/>You will need to fund this billing slip before your transaction will be complete.  This process can take up to a few business days depending on when you complete payment.  Once the deposit of funds has been confirmed by your bank, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'pinvalidda' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'payvalidda transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for payvalidda customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'mangirkart' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'MangirKart transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for MangirKart customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to 15 minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'bancocreditodeperu' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Banco Credito de Peru transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Banco Credito de Peru customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'bbvacontinental' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'BBVA Continental transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for BBVA Continental customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'safetypay' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'SafetyPay transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for SafetyPay customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'pagoefectivo' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'PagoEfectivo transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for PagoEfectivo customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure to save or print your payment slip from the Boacompra website as you complete your transaction.  An email from BoaCompra will also be sent to you with a link to the printable payment slip.<br/><br/>You will need to fund this billing slip before your transaction will be complete.  This process can take up to a few business days depending on when you complete payment.  Once the deposit of funds has been confirmed by your bank, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'trustly' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Trustly transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Trustly customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a few business days depending on when you complete payment.  Once you have approved payment, you will receive an email receipt confirming your purchase.';
					}
				}
				else if ( method.value == 'bitcoin' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Bitcoin transactions are authorized through the BitPay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BitPay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Bitcoin customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Make sure that you confirm your purchase on the BitPay website.  After completing payment, please click the "Continue to Valve" button and allow the transaction to process.<br/><br/>This process can take up to 60 seconds.  To avoid purchasing failures, please do not hit your back button or close the bitpay window before the process is complete.';
					}
				}	
				else if ( method.value == 'nodwin_cod' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Cash on delivery transactions are initiated through the Novaplay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Novaplay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Novaplay customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Start your payment through the Novaplay website by signing in and filling out the payment form.<br/><br/>Once you have completed that step, a representative from Novaplay will follow up with you to complete your purchase.';
					}
				}	
				else if ( method.value == 'credit_card_india' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Domestic credit card transactions are initiated through the Novaplay website.  Click the button below to open a new web browser to initiate the transaction.  This process may take up to 5 minutes to complete.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Novaplay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Novaplay customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Novaplay website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.<br/><br/>For questions regarding your payment processing status, please contact <a href="http://steamsupport.novaplay.in">NovaPlay</a>.';
					}
				}	
				else if ( method.value == 'debit_card_india' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Debit card transactions are initiated through the Novaplay website.  Click the button below to open a new web browser to initiate the transaction.  This process may take up to 5 minutes to complete.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Novaplay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Novaplay customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Novaplay website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.<br/><br/>For questions regarding your payment processing status, please contact <a href="http://steamsupport.novaplay.in">NovaPlay</a>.';
					}
				}	
				else if ( method.value == 'net_banking_india' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Net Banking transactions are initiated through the Novaplay website.  Click the button below to open a new web browser to initiate the transaction.  This process may take up to 5 minutes to complete.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Novaplay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Novaplay customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Novaplay website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.<br/><br/>For questions regarding your payment processing status, please contact <a href="http://steamsupport.novaplay.in">NovaPlay</a>.';
					}
				}	
				else if ( method.value == 'cash_card_india' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Cash Card transactions are initiated through the Novaplay website.  Click the button below to open a new web browser to initiate the transaction.  This process may take up to 5 minutes to complete.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Novaplay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Novaplay customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Novaplay website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.<br/><br/>For questions regarding your payment processing status, please contact <a href="http://steamsupport.novaplay.in">NovaPlay</a>.';
					}
				}	
				else if ( method.value == 'wallet_india' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Prepaid Wallet transactions are initiated through the Novaplay website.  Click the button below to open a new web browser to initiate the transaction.  This process may take up to 5 minutes to complete.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Novaplay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Novaplay customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Novaplay website by signing in and completing your transaction.<br/><br/>This process can take up to five minutes.  Once you have approved payment, you will receive an email receipt confirming your purchase.<br/><br/>For questions regarding your payment processing status, please contact <a href="http://steamsupport.novaplay.in">NovaPlay</a>.';
					}
				}	
				else if ( method.value == 'korean_mobile' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Mobile Payment transactions are authorized through the Degica website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Degica';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Mobile Payment customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Degica website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}								
				else if ( method.value == 'naranja' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Naranja transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Naranja customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'cencosud' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Cencosud transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Cencosud customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'cabal' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Cabal transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Cabal customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'pagofacil' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'PagoFacil transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for PagoFacil customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'rapipago' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Rapipago transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Rapipago customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'banconacionaldecostarica' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Banco Nacional de Costa Rica transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Banco Nacional de Costa Rica customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'bancopoplar' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Banco Poplar transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Banco Poplar customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'redpagos' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'RedPagos transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for RedPagos customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'spe' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'SPE transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for SPE customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'multicaja' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Multicaja transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Multicaja customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'redcompra' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'RedCompra transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for RedCompra customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'ziraatbank' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'ZiraatBank transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for ZiraatBank customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'vakiflarbank' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'VakiflarBank transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for VakiflarBank customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'kuveytturkbank' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'KuveytTurkBank transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for KuveytTurkBank customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'ekonomibank' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'EkonomiBank transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for EkonomiBank customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'pichincha' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Pichincha transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Pichincha customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'pichinchacash' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'PichinchaCash transactions are authorized through the BoaCompra website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to BoaCompra';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for PichinchaCash customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the BoaCompra website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'przelewy24' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Przelewy24 transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Przelewy24 customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'trustpay' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Trustpay transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Trustpay customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'poli' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'POLi transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for POLi customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'mercadopago' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'MercadoPago transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for MercadoPago customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'payu' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'PayU transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for PayU customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'vtcpaywallet' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'VTC Pay e-Wallet transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for VTC Pay e-Wallet customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'vtcpaycards' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Local credit card transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for local credit card customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'vtcpayonlinebanking' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Online banking transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for online banking customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'mrcash' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'MrCash transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for MrCash customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'eps' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'EPS transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for EPS customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'interac' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Interac transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Interac customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'santanderrio' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'Santander Rio transactions are authorized through the Smart2Pay website.  Click the button below to open a new web browser to initiate the transaction.';
					$('purchase_button_bottom_text').innerHTML = 'Continue to Smart2Pay';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for Santander Rio customers';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Complete your purchase through the Smart2Pay website by signing in and completing your transaction.<br/><br/>This process can take up to a several minutes.  Once payment has been confirmed, you will receive an email receipt confirming your purchase.';
					}
				}	
				else if ( method.value == 'cafefunded' )
				{
					$('purchase_bottom_note_paypalgc').innerHTML = 'This in person transaction will be authorized by $1%s. Click the button to open a new window to initiate the transaction.'.replace( '$1%s', sSiteName );
					$('purchase_button_bottom_text').innerHTML = 'Continue Transaction';
					if ( $('col_right_review_payment_tips_header_text') && $('col_right_review_payment_tips_info_text') ) 
					{
						$('col_right_review_payment_tips_header_text').innerHTML = 'Tips for In Person Transaction';
						$('col_right_review_payment_tips_info_text').innerHTML = 'Once you have paid the cashier, you will receive an email receipt confirming your purchase.';
					}
				}	
			}
			else
			{
				OnGetFinalPriceFailure( 0 );
				return;
			}
		}
		else
		{
			if ( $('col_right_review_payment_tips') )
			{
				$J('#col_right_review_payment_tips').hide();
			}

			$('purchase_button_bottom').href = "javascript:FinalizeTransaction();";
			$J('#purchase_bottom_note_paypalgc').hide();
			$('purchase_top').hide();
			$('purchase_button_bottom_text').innerHTML = 'Purchase';
		}
		
				$J('#purchase_button_bottom').show();
		$J('#purchase_button_disabled_bottom').hide();
		$J('#purchase_button_inprogress_bottom').hide();
		$J('#change_payment_method_button_bottom').hide();
		$J('#cancel_button_bottom').hide();

				if ( BIsStoredCreditCard() )
			SetTabEnabled( 'payment_info', false );
			
				if ( g_bIsUpdateBillingInfoForm )
		{
			if ( $('is_external_finalize_transaction').value == 1 )
			{
								ReportCheckoutJSError( 'Update payment page is not implemented for this payment method ' + $('payment_method').value );
			}
			else
			{
				FinalizeTransaction();
			}
		}
		else
		{
												SetTabEnabled( 'review' );
		}
	} 
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed handling GetFinalPrice success', e );
	}
}


function OnGetFinalPriceFailure( eErrorDetail )
{
	try 
	{
		SetTabEnabled( 'payment_info' );
		var error_text = 'An unexpected error has occurred. Your purchase has not been completed.<br>Please contact <a href="http://support.steampowered.com">Steam Support</a>.';
		switch ( eErrorDetail )
		{
			default:
				error_text = 'An unexpected error has occurred. Your purchase has not been completed.<br>Please contact <a href="http://support.steampowered.com">Steam Support</a>.';
				break;
			case 23:
				error_text = 'Your billing address doesn’t look like it matches up with your current country.  Please contact support for assistance or use a payment method registered to your current address.';
				break;
			case 51:
				var method = $('payment_method');
				switch (method.value)
				{
					case 'sofort':
						error_text = 'This purchase cannot be completed because the amount charged through Sofort must be at least 0,10 EUR.  Please select another payment method for your purchase and try again.';
						break;

					case 'beeline':
						error_text = 'This purchase cannot be completed because the amount charged through mobile carriers must be at least 10 RUB.  Please select another payment method for your purchase and try again.';
						break;
						
					case 'nodwin_cod':
					error_text = 'This purchase cannot be completed because the amount charged through Cash on Delivery must be at least 500 INR.  Please select another payment method for your purchase and try again.';
					break;

					default:
						error_text = 'This purchase cannot be completed because the amount is not allowed by the payment method.  Please select another payment method for your purchase and try again.';
						break;
				}
				break;
			case 1:
				error_text = 'Your billing information has failed address verification.  Please correct the error or contact support for assistance.';
				break;
			case 56:
				error_text = 'Hey big spender, easy does it! Your shopping cart total exceeds our maximum allowable purchase amount. Please <a href=\'https://store.steampowered.com/cart\'>edit the contents of your cart</a> and try again.';
				break;
			case 17:
				var method = $('payment_method');
				if ( method.value == 'giropay' )
				{
					error_text = 'This purchase cannot be completed because your bank is not supported by the GiroPay network.  Please select another payment method for your purchase and try again.';
				}
				break;
		}	
		
				UpdatePaymentInfoForm();
		DisplayErrorMessage( error_text );
	} 
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed hadnling GetFinalPrice failure', e );
	}
}


function SubmitSSA()
{
	try 
	{
				var errorString = '';
		
				var rgBadFields = { 
			ssa_body: false
		}
		
		var ssa_check = $('i_agree');
		if ( !ssa_check.checked )
		{
			errorString += "You must agree to the Steam Subscriber Agreement to continue.<br/>";
			rgBadFields.ssa_body = true;
		}
	
				for ( var key in rgBadFields )
		{
			if ( rgBadFields[key] )
				ValidationMarkFieldBad( key );
			else
				ValidationMarkFieldOk( key );
		}
	
				if ( errorString != '' )
		{
			DisplayErrorMessage( errorString );
		}
		else
		{
						document.forms['ssa'].submit();
		}
	} 
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed submitting SSA agreement', e );
	}
}


function IsRadioButtonChecked( objId )
{
	return $(objId).checked;
}
function CheckFriendDisplay()
{
	try
	{
		if ( $('send_via_email') )
		{
			if ( IsRadioButtonChecked( 'send_via_email' ) )
			{
				$( 'email_input' ).disabled = false;
			}
			else
			{
				$( 'email_input' ).disabled = true;
				$( 'email_input' ).value = '';
			}
		}
	} 
	catch(e)
	{
		ReportCheckoutJSError( 'Failed handling CheckFriendDisplay', e );
	}
}


function SelectGiftRecipient( id, name )
{
	try 
	{
		if ( $( currently_selected_friend_block ) )
		{
			$( currently_selected_friend_block ).removeClassName( 'active' );
		}
		if ( $( 'friend_block_'+id ) )
			$( 'friend_block_'+id ).addClassName( 'active' );
		
		currently_selected_friend_block = 'friend_block_'+id;
		currently_selected_friend_id = id;
		currently_selected_friend_name = name;
	} 
	catch( e ) 
	{
		ReportCheckoutJSError( 'Failed selecting gift recipient', e );
	}
}

function SubmitGiftDeliveryForm()
{
		var errorString = '';
	
		var rgBadFields = { 
		email_input : false, 
		friends_chooser : false,
		schedule_send_time : false
	};
	
	try 
	{

		if ( $J('#cart_send_schedule_options').hasClass( 'schedule_selected' ) && $J('.cart_send_choice.selected').hasClass('supports_schedule_send') )
		{
			var $ScheduleSendElement = $J('#cart_send_schedule_options').find( 'select, input' );
			var $TimeElement = $ScheduleSendElement.filter( '#schedule_send_time' );
			var b24hTime = ( $ScheduleSendElement.filter('#schedule_send_ampm').length == 0 );
			var rgTimeParse = $TimeElement.val().match( /([0-2]?[0-9]) *(?::|h) *([0-5][0-9])/ );
			if ( !rgTimeParse || rgTimeParse[1] > 23 ||
				( !b24hTime && ( rgTimeParse[1] > 12 || rgTimeParse[1] < 1 ) ) )
			{
				rgBadFields.schedule_send_time = true;
				errorString += 'The time of day specified is not valid.<br/>';
			}
			else
			{
				var rtTime = GatherScheduledSendFields();

				if ( rtTime && rtTime <= $J.now() / 1000 )
				{
					ShowConfirmDialog( 'Schedule delivery...', 
								'The time you\'ve selected to send your gift is in the past.  Would you like to send your gift immediately?', 
								'Send Immediately'
					).done( function() {
						if ( $J('#reschedule_send_now').length )
						{
							$J('#reschedule_send_now').prop('checked', true ).change();
							SubmitGiftDeliveryForm();
						}
						else
						{
							$J('#cart_send_schedule_options').removeClass( 'schedule_selected' );
							SubmitGiftDeliveryForm();
						}
					});
					return;
					
				}
			}
		}
		

		if ( $( 'send_via_email' ) && $( 'send_via_email' ).checked )
		{
			var email = $('email_input').value;
			var email_regex = /^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i
			if ( email == '' || !email_regex.test(email) )
			{
				errorString += 'Please enter a valid email address to deliver your gift by email.<br/>';
				rgBadFields.email_input = true;
			}
		}
		else if ( $('send_self') && $('send_self').checked )
		{
			// nothing to validate
		}
		else if ( $('unsend_gift') && $('unsend_gift').checked )
		{
			// nothing to validate
		}
		else if ( $('send_accountid' ) && $('send_accountid').checked )
		{
			if ( $('internal_giftee_accountid').value == '' )
			{
				errorString += 'Please select a friend to deliver your gift directly through Steam.<br/>';
				rgBadFields.internal_giftee_accountid = true;
			}
			else
				rgBadFields.internal_giftee_accountid = false;
		}
		else if ( $J('#reschedule_send_scheduled').is(':checked') || $J('#reschedule_send_now').is(':checked') )
		{
			// nothing to validate (date was validated above)
		}
		else if ( $J('#reschedule_send_cancel').is(':checked') )
		{
			ConfirmRescheduleCancel();
			return;
		}
		else
		{
			var bIsSomethingChecked = false;
			var rgRadios = Form.getInputs( 'gift_recipient_form', 'radio', 'friend_radio' );
			for( var i = 0; i < rgRadios.length; ++i )
			{
				if( rgRadios[i].checked ) 
					bIsSomethingChecked = true;
			}
			if ( !bIsSomethingChecked )
			{
				errorString += 'Please select a friend to deliver your gift directly through Steam.<br/>';
				rgBadFields.friends_chooser = true;
			}
		}
	} 
	catch( e ) 
	{
		ReportCheckoutJSError( 'Failed validating gift delivery form', e );
	}
	

	try 
	{
				for ( var key in rgBadFields )
		{
			if ( rgBadFields[key] )
				ValidationMarkFieldBad( key );
			else
				ValidationMarkFieldOk( key );
		}
	
				if ( errorString != '' )
		{
			DisplayErrorMessage( errorString );
		}
		else
		{
						$('error_display').innerHTML = '';
			$J('#error_display').hide();

			if ( g_bIsSendGiftForm )
			{
				if ( $('unsend_gift') && $('unsend_gift').checked )
				{
					UnsendGift();
					return;
				}
				else
				{
					UpdateWillBeSentToNote();
				}
			}
			
						if ( $('send_self') && $('send_self').checked )
			{
				ProceedToPaymentInfoTab();
			}
			else
			{
				SetTabEnabled( 'gift_note' );
			}
		}
	} 
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed showing errors or submitting gift delivery form', e );
	}
}

function SubmitGiftNoteForm()
{
		var errorString = '';
	
		var rgBadFields = { 
		gift_recipient_name : false, 
		gift_message_text : false, 
		gift_sentiment_trigger : false,
		gift_signature : false
	};
	
	try 
	{
		var recipient_name = $('gift_recipient_name').value;
		if ( recipient_name.length < 1 )
		{
			errorString += 'Please enter the recipients first name.<br/>';
			rgBadFields.gift_recipient_name = true;
		}
		
		var gift_message_text = $('gift_message_text').value;
		if ( gift_message_text.length < 1 )
		{
			errorString += 'Please enter a message to the gift recipient.<br/>';
			rgBadFields.gift_message_text = true;
		}
		
		var gift_signature = $('gift_signature').value;
		if ( gift_signature.length < 1 )
		{
			errorString += 'Please enter a signature for your gift.<br/>';
			rgBadFields.gift_signature = true;
		}
		
	
				for ( var key in rgBadFields )
		{
			if ( rgBadFields[key] )
				ValidationMarkFieldBad( key );
			else
				ValidationMarkFieldOk( key );
		}
	} 
	catch( e ) 
	{
		ReportCheckoutJSError( 'Failed validating gift message form', e );
	}

	try 
	{
				if ( errorString != '' )
		{
			DisplayErrorMessage( errorString );
		}
		else
		{
						$('error_display').innerHTML = '';
			$J('#error_display').hide();
	
						if ( g_bIsSendGiftForm )
			{
				SendGift();
				AnimateSubmitGiftNoteButton();
			}
			else
			{
				ProceedToPaymentInfoTab();
			}
		}
	}
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed showing errors or submitting gift delivery form', e );
	}
}

function ProceedToPaymentInfoTab()
{
	if ( BIsStoredCreditCard() || BIsSteamAccountSelected() )
	{
		InitializeTransaction();
		AnimateSubmitGiftNoteButton();
	}
	else
	{
		SetTabEnabled( 'payment_info' );
	}
}

function UpdateStateSelectState()
{
	try 
	{
		if ( g_bHasBillingStates )
		{
			$J('#billing_state_label').show();
			$J('#billing_state_input').show();
			$J('#billing_state_text').hide();
			$J('#billing_state_select_dselect_container').show();
		}
		else
		{
			$J('#billing_state_label').hide();
			$J('#billing_state_input').hide();
			$J('#billing_state_text').show();
			$J('#billing_state_select_dselect_container').hide();
		}

		Shipping_UpdateStateSelectState();
	}
	catch( e ) 
	{
		ReportCheckoutJSError( 'Failed in UpdateStateSelectState()', e );
	}
}

function BIsCreditCardMethod( method )
{
  if ( g_bUpdateBillingFormAddressOnly )
    return false;
    
	return method == 'mastercard' || method == 'visa' 
			|| method == 'amex' || method == 'jcb' 
			|| method == 'discover' || method == 'cartebleue' 
			|| method == 'dankort';
}

function BIsStoredCreditCard()
{
	if ( g_bUpdateBillingFormAddressOnly )
		return false;

	var method = $('payment_method');
	
	return method.value == 'storedcreditcard';
}

function BStoredCreditCardRequiresSecurityCode( method )
{
	return BIsStoredCreditCard() && ( g_bRequiresCVVReEntry || ( method == 'cartebleue' ) );
}

function BIsSteamAccountSelected()
{
	var method = $('payment_method');
	if ( method )
		return (method.value == 'steamaccount');
	
	return false;
}

function SaveProviderMethod()
{
	var method = $('payment_method');
	if ( method )
	{
		if ( method.value == 'steamaccount' )
			return;
		
		g_strProviderMethod = method.value;
	}
}

function ShowFirstPaymentStep()
{
		if ( g_bUseRemainingSteamAccount || g_nPaymentMethodStep == 2 )
	{
		SaveProviderMethod();
		DHighlightItemByValue( 'payment_method', 'steamaccount', true );						
	}
	
		g_nPaymentMethodStep = 1;
	g_bUseRemainingSteamAccount = false;
	
	UpdatePaymentInfoForm();
	ScrollCheckoutFormIntoView();
}

function ShowNextPaymentMethod()
{
		
	g_nPaymentMethodStep++;
	
		if ( g_nPaymentMethodStep == 2 ) 
	{
		if ( g_strProviderMethod != '' )
		{	
			DHighlightItemByValue( 'payment_method', g_strProviderMethod, true );
		}
		else
		{
			var paymentMethodDropList = $('payment_method_droplist');
				
			for ( var i = 0; i < paymentMethodDropList.childNodes.length; i++ )
			{
				var paymentNode = paymentMethodDropList.childNodes[i].childNodes[0];
				if ( paymentNode && rgPaymentMethodProperties[paymentNode.id] &&
					rgPaymentMethodProperties[paymentNode.id].can_be_split )
				{
					DHighlightItem( 'payment_method', i, true );
					break;
				}
			}			
		}
	}
	
	UpdatePaymentInfoForm();
	ScrollCheckoutFormIntoView();
}

function OnSteamAccountSelected()
{
		
	if ( g_nPurchaseTotal > g_nSteamAccountBalance )
	{
		g_bUseRemainingSteamAccount = true;
		ShowNextPaymentMethod();
		return;
	}
	
		SubmitPaymentInfoForm();
}

function SelectPaymentMethod( method )
{
	DHighlightItemByValue( 'payment_method', method, true );
	UpdatePaymentInfoForm();
}

function UpdatePaymentInfoForm()
{
	try 
	{
		$('error_display').innerHTML = '';
		$J('#error_display').hide();

		var method = $('payment_method');
		if ( !method )
			return;
	
		var pm = $('steamaccount');
		
		if ( pm )
		{
			g_nPaymentMethodStep == 2 ? $J(pm).hide() : $J(pm).show();
		}	

		var bCanBeSplit = true;
		
				if ( g_nPaymentMethodStep == 2 )
		{
						$('payment_header').innerHTML = 'Payment method, Step 2';
			$J('#payment_row_step2').show();
			$J('#payment_method_previous_button').show();

			if ( rgPaymentMethodProperties[method.value].can_be_split )
			{
				$('payment_info_method_label').innerHTML = 'Please select a payment method for the remaining' + ' ' + g_strProviderRemaining;
				g_bUseRemainingSteamAccount = true;
			}
			else
			{
				bCanBeSplit = false;
				g_bUseRemainingSteamAccount = false;
			}
		}
		else
		{
			$('payment_header').innerHTML = 'Payment method';
			$J('#payment_row_step2').hide();
			$J('#payment_method_previous_button').hide();
			$('payment_info_method_label').innerHTML = 'Please select a payment method';
		}
		
		var card_is_stored = BIsStoredCreditCard();
		
		if ( card_is_stored )
		{
			$('save_my_address_input').hide();
		}
		else
		{
			$('save_my_address_input').show();
		}
		
		var bShowCVV = false;
		var bShowCreditCardNumberExp = false;
		var bShowPhoneNumber = false;
		var bShowCountryVerification = false;
		var bShowBankAccountForm = false;
		var bShowMobileForm = false;
		var bShowPaymentSpecificNote = false;
		var bShowStoredPayPalDetails = false;
		var bDisabledPaymentMethod = false;
		var bShowBankSelection = false;
		var bPaymentMethodRefundable = rgPaymentMethodProperties[ method.value ].refundable;
		var bShowCafeFundedInstructions = false;
		var bShowSaveMyAddressOverride = false;
		
		$J('#payment_row_one').show();
		$J('#payment_row_eight').hide();
		
		if ( g_bIsUpdateBillingInfoForm )
		{
						$('submit_payment_info_btn').href = "javascript:SubmitPaymentInfoForm();";
			$( 'payment_info_form' ).onsubmit = function() { SubmitPaymentInfoForm(); return false; };
			SetButtonInnerHtml('submit_payment_info_btn', 'Save' );
			if ( g_bUpdateBillingFormAddressOnly )
			{
				$J('#payment_row_one').hide();
				$('payment_header').innerHTML = 'Update billing address';
			}
			else
			{
				$('payment_header').innerHTML = 'Update cached payment method';
			}
			$('payment_info_method_label').innerHTML = 'Select your existing cached payment method or enter a new payment method for future purchases and subscription renewals.';
		}
		else if ( g_bPurchaseContainsSubscription )
		{
						$('submit_payment_info_btn').href = "javascript:SubmitPaymentInfoForm();";
			$( 'payment_info_form' ).onsubmit = function() { SubmitPaymentInfoForm(); return false; };
			SetButtonInnerHtml('submit_payment_info_btn', 'Continue' );
			$('payment_info_method_label').innerHTML = 'Your purchase contains one or more items that will be billed at specified intervals in the future.  Steam will use any saved payment methods that you have on file for billing you at each renewal period.  If you have no saved payment methods at the time of renewal, your Steam wallet will be used for the payment.';
		}		
		else
		{
						$('submit_payment_info_btn').href = "javascript:SubmitPaymentInfoForm();";
			$( 'payment_info_form' ).onsubmit = function() { SubmitPaymentInfoForm(); return false; };
			SetButtonInnerHtml('submit_payment_info_btn', 'Continue' );
		}

				g_bShowAddressForm = g_bHasBillingStates || g_bRequireBillingInfo;

		if ( BIsStoredCreditCard() )
		{
			g_bShowAddressForm = false;
		}
		else if ( BIsCreditCardMethod( method.value ) )
		{
			// For any of these common credit card methods show all the form elements
			
						g_bShowAddressForm = true;
			bShowCreditCardNumberExp = true;
			bShowPhoneNumber = true;
						bShowCVV = !card_is_stored; 
		}
		else if ( method.value == 'paypal' )
		{
						g_bShowAddressForm = !g_bSkipAddressRequirementForPayPal;
			bShowPhoneNumber = g_bShowAddressForm;
			bShowCountryVerification = g_bSkipAddressRequirementForPayPal;
			bShowSaveMyAddressOverride = g_bEnableCachedPayPalCredentials;
			
			$('external_payment_processor_notice').innerHTML = 'Your PayPal transaction is initializing, please wait a moment before continuing...';
		}
		else if ( method.value == 'updatepaypal' )
		{
						g_bShowAddressForm = !g_bSkipAddressRequirementForPayPal;
			bShowPhoneNumber = g_bShowAddressForm;
			bShowCountryVerification = g_bSkipAddressRequirementForPayPal;
			
			$('external_payment_processor_notice').innerHTML = 'Your PayPal transaction is initializing, please wait a moment before continuing...';
			bShowPaymentSpecificNote = true;
			$('payment_method_specific_note').innerHTML = 'For your security, you will be required to re-authorize your purchase with PayPal.';
		}
		else if ( method.value == 'storedpaypal' )
		{
			g_bShowAddressForm = false;
			bShowCountryVerification = true;
			bShowStoredPayPalDetails = true;
		}
		else if ( method.value == 'giropay' )
		{
			bShowCountryVerification = true;
			bShowBankAccountForm = true;
		}
		else if ( BIsBankChoiceMethod( method.value ) )
		{
			bShowCountryVerification = true;
			bShowBankSelection = true;
		}
		else if ( method.value == 'paysafe' || method.value == 'sofort' || method.value == 'webmoney' || method.value == 'moneybookers'	|| method.value == 'alipay' || method.value == 'unionpay' || method.value == 'yandex'
			|| method.value == 'boacompragold' || method.value == 'pagseguro' || method.value == 'visabrazil'
			|| method.value == 'amexbrazil' || method.value == 'aura' || method.value == 'hipercard' || method.value == 'mastercardbrazil' || method.value == 'dinerscardbrazil'
			|| method.value == 'multibanco' || method.value == 'payshop' || method.value == 'maestroboacompra' || method.value == 'visaelectronboacompra'
			|| method.value == 'oxxo' || method.value == 'toditocash' || method.value == 'carnet'
			|| method.value == 'spei' || method.value == '3pay' || method.value == 'isbank'
			|| method.value == 'garanti' || method.value == 'akbank' || method.value == 'yapikredi'
			|| method.value == 'halkbank' || method.value == 'bankasya' || method.value == 'finansbank'
			|| method.value == 'denizbank' || method.value == 'ptt' || method.value == 'cashu'
			|| method.value == 'onecard'
			|| method.value == 'molpoints' || method.value == 'eclubpoints'
			|| method.value == 'oxxo' || method.value == 'toditocash' || method.value == 'pse' || method.value == 'exito' || method.value == 'efecty'
			|| method.value == 'baloto' || method.value == 'pinvalidda' || method.value == 'mangirkart' || method.value == 'bancocreditodeperu'  
			|| method.value == 'bbvacontinental' || method.value == 'pagoefectivo' || method.value == 'trustly' 
			|| method.value == 'nodwin_cod' || method.value == 'credit_card_india' || method.value == 'debit_card_india' 
			|| method.value == 'net_banking_india' || method.value == 'cash_card_india' || method.value == 'wallet_india' 
			|| method.value == 'naranja' || method.value == 'cencosud' || method.value == 'cabal' || method.value == 'pagofacil' 
			|| method.value == 'rapipago' || method.value == 'banconacionaldecostarica' || method.value == 'bancopoplar' || method.value == 'redpagos' 
			|| method.value == 'spe' || method.value == 'multicaja' || method.value == 'redcompra' || method.value == 'ziraatbank' || method.value == 'vakiflarbank' 
			|| method.value == 'kuveytturkbank' || method.value == 'ekonomibank' || method.value == 'pichincha' || method.value == 'pichinchacash' 
			|| method.value == 'przelewy24' || method.value == 'trustpay' || method.value == 'poli' || method.value == 'mercadopago' || method.value == 'payu' 
			|| method.value == 'mrcash' || method.value == 'eps' || method.value == 'interac' || method.value == 'santanderrio' || method.value == 'degica_mobile'
			|| method.value == 'zong' || method.value == 'credit_card_japan' || method.value == 'payeasy' 
			|| method.value == 'webmoney_japan' || method.value == 'webmoney_japan_steam_card' || method.value == 'bitcash' || method.value == 'netcash'
			|| method.value == 'nanaco'  || method.value == 'culturevoucher' || method.value == 'happymoneyvoucher' || method.value == 'toss'
		)
		{
			bShowCountryVerification = true;
		}
		else if ( method.value == 'boleto' || method.value == 'bancodobrasilonline' || method.value == 'itauonline' || method.value == 'bradescoonline' || method.value == 'safetypay' )
		{
			bShowCountryVerification = true;
			bShowPaymentSpecificNote = true;
			$('payment_method_specific_note').innerHTML = 'Your bank or payment processor may charge an additional service fee for using this payment method';
		}
		else if ( method.value == 'qiwi' )
		{
			bShowCountryVerification = true;
			bShowMobileForm = true;
		}
		else if ( method.value == 'konbini' || method.value == 'bank_transfer_japan' )
		{
			bShowCountryVerification = true;
			bShowPaymentSpecificNote = true;
			$('payment_method_specific_note').innerHTML = 'Your bank or payment processor may charge an additional service fee for using this payment method';
		}
		else if ( method.value == 'beeline' )
		{
			bShowCountryVerification = true;
			bShowPaymentSpecificNote = true;
			$('payment_method_specific_note').innerHTML = 'Your bank or payment processor may charge an additional service fee for using this payment method';
		}		
		else if ( method.value == 'bitcoin' )
		{
						bShowCountryVerification = $('billing_country').value != 'US';
		}
		else if ( method.value == 'cafefunded' )
		{
			g_bShowAddressForm = false;
			bShowCountryVerification = true;
			bShowCafeFundedInstructions = true;
		}	
		else if ( method.value == 'wechat' )
		{
			bShowCountryVerification = true;
			bShowPaymentSpecificNote = true;
			$('payment_method_specific_note').innerHTML = 'WeChat payments can only be made from WeChat accounts that have been linked to a valid Chinese bank issued card regardless of your location.  Please visit this <a href=\'http://kf.qq.com/faq/130807me2YZf140909yumYFb.html\' target=\'_blank\'>link</a> for more details.';
		}
		else if ( method.value == 'tenpay' )
		{
			bShowCountryVerification = true;
			bShowPaymentSpecificNote = true;
			$('payment_method_specific_note').innerHTML = 'Tenpay payments can only be made from Tenpay accounts that have been linked to a verified phone number.';
		}
		else if ( method.value == 'vtcpaywallet' || method.value == 'vtcpaycards' || method.value == 'vtcpayonlinebanking' )
		{
			bShowCountryVerification = true;			
			bShowPaymentSpecificNote = true;
			$('payment_method_specific_note').innerHTML = 'Please be advised that VTCPay will add VAT and corporate income tax for foreign enterprises to your purchase amount.';
		}
		else if ( method.value == 'steamaccount' )
		{
						$J('#payment_row_eight').show();
			
						
			$('external_payment_processor_notice').innerHTML = 'In the event your Steam Wallet balance doesn’t cover the full cost of this transaction, you’ll be asked to cover the remaining balance due with a secondary payment method.';
				
						$('submit_payment_info_btn').href = "javascript:OnSteamAccountSelected();";
			$( 'payment_info_form' ).onsubmit = function() { OnSteamAccountSelected(); return false; };
			SetButtonInnerHtml('submit_payment_info_btn', 'Continue' );
		}
		else if ( method.value == 'disabled' )
		{
			g_bShowAddressForm = false;
			bShowPaymentSpecificNote = true;
			bDisabledPaymentMethod = true;
			$('payment_method_specific_note').innerHTML = 'We are temporarily unable to process transactions with this payment method at this time.  We apologize for the inconvenience.';
		}
		else if ( method.value == 'disabled_for_wallet' )
		{
			g_bShowAddressForm = false;
			bShowPaymentSpecificNote = true;
			bDisabledPaymentMethod = true;
			$('payment_method_specific_note').innerHTML = 'This payment method cannot be used for purchasing wallet credit.';
		}
		
		if ( $('billing_country').value == 'AR' )
		{
			$('error_display').innerHTML = 'Due to recent changes to government laws in your region, we are unable to offer local payment methods for checkout at the current time.';
			$('error_display').style.display = 'block';			
		}
	

		$J('#submit_payment_info_btn').show();
		$J('#cant_use_payment_method_in_overlay').hide();
		
		var $CCFields = $J('#credit_card_row, #card_number_label, #card_number, #expiration_date_cvv_label, #expiration_date_label, #expiration_month_dselect_container, #expiration_year_dselect_container')
		if ( bShowCreditCardNumberExp )
			$CCFields.show();
		else
			$CCFields.hide();

				if ( bShowCVV  )
		{
			$('security_code_section' ).show();
			$('expiration_date_cvv_label').innerHTML = 'Expiration date and security code';
		}
		else
		{
			$('security_code_section' ).hide();
			$('expiration_date_cvv_label').innerHTML = 'Expiration date';
		}

		var $AddressFields = $J('#payment_row_address, #payment_header_title');
		if ( g_bShowAddressForm )
		{
			$AddressFields.show();
			if ( bShowPhoneNumber )
				$J('#payment_row_phone').show();
			else
				$J('#payment_row_phone').hide();
		}
		else
			$AddressFields.hide();

		var bShowSaveMyAddress = ( g_bShowAddressForm || bShowSaveMyAddressOverride ) && ( !g_bIsUpdateBillingInfoForm || g_bUpdateBillingFormAddressOnly );
		var strSaveMyAddressDisplay = bShowSaveMyAddress ? 'block' : 'none';
		$('payment_row_save_my_address').style.display = strSaveMyAddressDisplay;
		
		var strShowStoredPayPalDetails = bShowStoredPayPalDetails ? 'block' : 'none';
		$('payment_row_stored_paypal_details').style.display = strShowStoredPayPalDetails;
		
		var strBankAccountDisplay = !g_bEnableIBANForGiroPay && bShowBankAccountForm ? 'block' : 'none';
		var strBankAccountDisplayIBAN = g_bEnableIBANForGiroPay && bShowBankAccountForm ? 'block' : 'none';
		$('bank_code_row').style.display = strBankAccountDisplay;
		$('bank_iban_row').style.display = strBankAccountDisplayIBAN;
		
		var strCountryVerificationDisplay = bShowCountryVerification ? 'block' : 'none';
		$('payment_row_country_verification').style.display = strCountryVerificationDisplay;
		
		var strPaymentMethodSpecificNote = bShowPaymentSpecificNote ? 'list-item' : 'none';
		$('payment_method_specific_note').style.display = strPaymentMethodSpecificNote;	

		var strMobileVerificationDisplay = bShowMobileForm ? 'block' : 'none';
		$('mobile_number_row').style.display = strMobileVerificationDisplay;
		
		var strAllowPaymentMethod = !bDisabledPaymentMethod ? 'block' : 'none';
		$('youll_get_to_review').style.display = strAllowPaymentMethod;
		$('submit_payment_info_btn').style.display = strAllowPaymentMethod;
		$('payment_row_bank_name').style.display = ( bShowBankSelection && ( g_bHasBankDirectoryArray ) ) ? 'block' : 'none';
		
		var strPaymentMethodCanBeSplit = !bCanBeSplit ? 'list-item' : 'none';
		$('payment_method_unable_to_split' ).style.display = strPaymentMethodCanBeSplit;
		
		var strPaymentMethodNotRefundable = !bPaymentMethodRefundable ? 'list-item' : 'none';
		$('payment_row_not_refundable' ).style.display = strPaymentMethodNotRefundable;
		
		var strCafeFundedInstructions = bShowCafeFundedInstructions ? 'list-item' : 'none';
		$('payment_method_cafe_funded' ).style.display = strCafeFundedInstructions;

		var strPaymentMethodNotes = !bCanBeSplit || !bPaymentMethodRefundable || bShowPaymentSpecificNote || bShowCafeFundedInstructions ? 'block': 'none';
		$('payment_method_notes' ).style.display = strPaymentMethodNotes;
	} 
	catch( e ) 
	{
		ReportCheckoutJSError( 'Failed updating payment info form after payment method change', e );
	}
}

function IsDigitOrEditKeypress( e )
{
	try 
	{
		var keynum = 0;
		
		if( e.keyCode ) 	  	{
			keynum = e.keyCode;
		}
		else if( e.which ) 		{
			keynum = e.which;
		}
		
		// tab
		if ( keynum == 9 ) return true;
		// backspace
		if ( keynum == 8 ) return true;
		// delete
		if ( keynum == 46 ) return true;
		// arrows
		if ( keynum == 37 || keynum == 38 || keynum == 39 || keynum == 40 ) return true;
		
		// digits
		if ( keynum >= 48 && keynum <= 57 ) return true;
	} 
	catch( e ) 
	{
		ReportCheckoutJSError( 'Failed in IsDigitOrEditkeypress()', e );
	}
	
	return false;
}


var g_bAutoSubmitPaymentInfo = false;
function SubmitShippingInfoForm( bAutoSubmitPaymentInfo )
{
	g_bAutoSubmitPaymentInfo = bAutoSubmitPaymentInfo;
	try 
	{
				$('error_display').innerHTML = '';
		$('error_display').style.display = 'none';
		
		VerifyShippingAddress();
	}
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed showing errors or submitting shipping info form', e );
	}
}

var g_bVerifyShippingAddressCallRunning = false;
function VerifyShippingAddress()
{
		if( g_bVerifyShippingAddressCallRunning )
		return;
	
	try 
	{
				g_bVerifyShippingAddressCallRunning = true;
		
				AnimateSubmitPaymentInfoButton();

		Shipping_VerifyShippingAddress( g_sessionID, 'https://store.steampowered.com/checkout/verifyshippingaddress/',
			{
				onSuccess: function( result ) {
					g_bVerifyShippingAddressCallRunning = false;
					// Success...
					if ( result.success == 1 )
					{
						OnVerifyShippingAddressSuccess( result );
						return;
					}
					else
					{
						OnVerifyShippingAddressFailure();
						return;
					}

										OnVerifyShippingAddressFailure();
				},
				onFailure: function(){
										g_bVerifyShippingAddressCallRunning = false;
					OnVerifyShippingAddressFailure();
				}
			} );
	} 
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed gathering form data and calling VerifyShippingAddress', e );
	}
}


function OnVerifyShippingAddressSuccess( result )
{
	try 
	{
		ValidationMarkFieldOk( $('shipping_address') );
		ValidationMarkFieldOk( $('shipping_address_two') );
		ValidationMarkFieldOk( $('shipping_postal_code') );
		ValidationMarkFieldOk( $('shipping_city') );
		ValidationMarkFieldOk( $('shipping_phone') );
		
				if ( result.eShippingAddressVerificationDetail != 0 )
		{
						SetTabEnabled( 'shipping_info' );
			var error_text = 'We cannot ship your order to the address that you\'ve provided.';
			switch ( result.eShippingAddressVerificationDetail )
			{
				case 4:
					error_text = 'We cannot ship to the address you\'ve provided because part of your address is missing or looks invalid.';
					if ( $('shipping_address' ).value == '' )
						ValidationMarkFieldBad( $('shipping_address') );

					if ( $('shipping_phone' ).value == '' )
						ValidationMarkFieldBad( $('shipping_phone') );

					if ( $('shipping_city' ).value == '' )
						ValidationMarkFieldBad( $('shipping_city') );

					if ( $('shipping_postal_code' ).value == '' )
						ValidationMarkFieldBad( $('shipping_postal_code') );						
					break;

				case 3:
					error_text = 'We cannot ship to the address you\'ve provided because part of your address is too long.  Your combined name and each of the address fields can only be up to 35 characters long.';
					break;

				case 1:
				case 5:
					error_text = 'We cannot ship your order to P.O. Box, APO, FPO, or DPO address that you\'ve provided.';
					ValidationMarkFieldBad( $('shipping_address') );
					ValidationMarkFieldBad( $('shipping_address_two') );
					break;

				case 6:
					error_text = 'We cannot ship your order because the postal code you provided belongs to a region outside of the 48 continental United States.';
					break;
					
				case 7:
					error_text = 'Due to the Coronavirus, carriers currently will not deliver shipments to your location.  As a result, we are unable to process your order.';
					ValidationMarkFieldBad( $('shipping_postal_code') );
					break;					

				case 2:
					error_text = 'We cannot ship your order to the address that you\'ve provided because it contains characters that are not latin-based.';
					break;
					
				case 8:
					error_text = 'Your postal code appears to be incorrect and should match this format \'%1$s\'.<br>Please verify and re-enter your postal code to complete the order.'.replace( /%1\$s/, result.verificationDetailExample );
					ValidationMarkFieldBad( $('shipping_postal_code') );
					break;
			}
			DisplayErrorMessage( error_text );		
		}
		else if ( result.bValidAddress || result.bSuggestedAddressMatches )
		{
			ShippingAddressVerified( false );
		}
		else
		{
			Shipping_UpdateFieldsFromVerificationCall( result );
			$('shipping_info_confirm').show();
			$('shipping_info_entry').hide();

						var error_text = 'We\'ve found a suggestion for your shipping address.';
			
			DisplayErrorMessage( error_text );
		}
	} 
	catch( e ) 
	{
		ReportCheckoutJSError( 'Failed handling VerifyShippingAddress success', e );
	}
}

function ShowShippingAddressForm()
{
	$('shipping_info_entry').show();
	$('shipping_info_confirm').hide();
	
		$('error_display').innerHTML = '';
	$('error_display').style.display = 'none';
}

function ShippingAddressVerified( bUseCorrected )
{
	if ( bUseCorrected )
	{
		Shipping_UpdateAddressWithCorrectedFields();
	}
	
	ShowShippingAddressForm();
	
	if ( g_bAutoSubmitPaymentInfo )
	{
		SubmitPaymentInfoForm();
	}
	else
	{
		SetTabEnabled( 'payment_info' );
	}
}

function OnVerifyShippingAddressFailure()
{
	try 
	{
				SetTabEnabled( 'shipping_info' );
		var error_text = 'There seems to have been an error initializing or updating your transaction.  Please wait a minute and try again or contact support for assistance.';
		
		DisplayErrorMessage( error_text );
	} 
	catch (e) 
	{
		ReportCheckoutJSError( 'Failed handling VerifyShippingAddress failure', e );
	}
}

function SubmitPaymentInfoForm()
{
		var method = $('payment_method');
	if ( !method )
		return;

		var errorString = '';
	
		var rgBadFields = { 
		card_number : false, 
		first_name : false,
		last_name : false,
		billing_address : false,
		security_code : false,
		billing_city : false,
		billing_state_text : false,
		billing_phone : false,
		billing_postal_code : false,
		expiration_month_trigger : false,
		expiration_year_trigger : false,
		payment_method_trigger : false,
		billing_state_select_trigger : false,
		bank_account : false,
		bank_code : false,
		bank_iban : false,
		bank_bic : false,
		mobile_number_label: false
	}
	
	try 
	{
		var card_is_stored = BIsStoredCreditCard(); 
				if ( BIsCreditCardMethod( method.value ) )
		{
						if ( !card_is_stored )
			{
				var val = $( 'security_code' ).value;
				var len = val.length;
				var requiredLen = ( method.value == 'amex' ) ? 4 : 3;
				if ( len != requiredLen )
				{
					errorString += 'Please enter your card security code.<br/>';
					rgBadFields.security_code = true;
				}
				else if ( len > 0 )
				{
					var bAllDigits = true;
					for ( i = 0; i < len; ++i )
					{
						var c = val.charAt(i);
						if ( c < '0' || c > '9' )
						{
							bAllDigits = false;
						}
					}
					if ( !bAllDigits )
					{
						errorString += 'Please enter your card security code.<br/>';
						rgBadFields.security_code = true;
					}
				}
			}
			
			var dateNow = new Date();
			var month = dateNow.getMonth()+1; // 0-11 in JS
			var year = dateNow.getFullYear();
			if ( ( $( 'expiration_year' ).value == '' ) || ( $('expiration_month').value == '' ) || ( $( 'expiration_year' ).value < year ) || ( $('expiration_year').value == year && $('expiration_month').value < month ) )
			{
				errorString += 'Please enter a valid expiration date.<br/>';
				rgBadFields.expiration_month_trigger = true;
				rgBadFields.expiration_year_trigger = true;
			}
		}

		if ( method.value == 'qiwi' )
		{
			// Expect 10 digits, we'll make sure we at least have that many digits
			var num = $( 'mobile_number').value;
			
			// check to make sure qiwi phone number starts with +7 or +38
			var re = new RegExp(/^\+7|^\+38/ );
			var m = re.exec(num);
		
			if ( m == null )
			{
				errorString += 'Please enter your 10 digit mobile account number.<br/>';
				rgBadFields.mobile_number_label = true;
			}
			else
			{
				num = num.replace( m, "" );
				num = num.replace(/\D/g, "");
			
				var digitsFound = 0;
				for ( i = 0; i < num.length; ++i )
				{
					var c = num.charAt(i);
					if ( c >= '0' && c <= '9' )
						++digitsFound;
				}
				if ( digitsFound != 10 )
				{
					errorString += 'Please enter your 10 digit mobile account number.<br/>';
					rgBadFields.mobile_number_label = true;
				}
			}
		}
		else if ( ( !g_bSkipAddressRequirementForPayPal && ( method.value == 'paypal' || method.value == 'updatepaypal' ) ) || BIsCreditCardMethod( method.value ) || g_bShowAddressForm )
		{
			errorString += BillingAddress_VerifyAddressFields( rgBadFields, g_bHasBillingStates );
		}
		
		if ( method.value == 'giropay' )
		{
			if ( !g_bEnableIBANForGiroPay )
			{
				if ( isNaN( $('bank_account').value ) || $('bank_account').value.length < 1 || $('bank_account').value.length > 10 )
				{
					errorString += 'Please enter your account number.<br/>';
					rgBadFields.bank_account = true;
				}
				if ( isNaN( $('bank_code').value ) || $('bank_code').value.length < 1 || $('bank_code').value.length > 8 )
				{
					errorString += 'Please enter your bank code.<br/>';
					rgBadFields.bank_code = true;
				}
			}
			else
			{
				if ( $('bank_iban').value.length < 15 || $('bank_iban').value.length > 50 )
				{
					errorString += 'Please verify and enter your IBAN (International Bank Account Number).<br/>';
					rgBadFields.bank_iban = true;
				}
				else
				{
										
										var sIBAN = $('bank_iban').value.substring(4).toUpperCase() + $('bank_iban').value.substring(0, 4).toUpperCase();
					
										var sCalculatedIBAN = '';
					var nACode = 'A'.charCodeAt( 0 );
					
					for ( var i = 0; i < sIBAN.length; i++ )
					{
						var c = sIBAN.substring( i, i + 1 );

						if ( isNaN( c ) )
						{
							var nCharCode = c.charCodeAt( 0 );
							
							sCalculatedIBAN += ( nCharCode - nACode + 10 );
						}
						else
						{
							sCalculatedIBAN += c;
						}
					}
					
										
					while ( sCalculatedIBAN.length > 10 )
					{
						var sLHS = sCalculatedIBAN.slice( 0, 9 );
						sCalculatedIBAN = ( parseInt( sLHS ) % 97 ) + sCalculatedIBAN.slice( sLHS.length );
					}
				
					
					if ( ( parseInt( sCalculatedIBAN ) % 97 ) != 1 )
					{
						errorString += 'Please verify and enter your IBAN (International Bank Account Number).<br/>';
						rgBadFields.bank_iban = true;
					}
				}
				
				if ( $('bank_bic').value.length != 8 && $('bank_bic').value.length != 11 && $('bank_bic').value.length != 12 )
				{
					errorString += 'Please verify and enter your SWIFT code.<br/>';
					rgBadFields.bank_bic = true;
				}
			}
		}
	} 
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed validating payment info form', e );
	}
		
	try 
	{
				for ( var key in rgBadFields )
		{
			if ( rgBadFields[key] )
			{
				ValidationMarkFieldBad( key );
			}
			else
			{
				ValidationMarkFieldOk( key );
			}
		}
	
				if ( errorString != '' )
		{
						var rgErrors = errorString.split( '<br/>' );
			if ( rgErrors.length > 3 )
			{
				errorString = '';
				errorString = rgErrors[0] + '<br/>' + rgErrors[1] + '<br/>' + 'And find more errors highlighted below.' + '<br/>';
			}		
		
			DisplayErrorMessage( errorString );
		}
		else
		{
						$('error_display').innerHTML = '';
			$('error_display').style.display = 'none';
			
						if ( $('cancel_pending_verification') )
				$('cancel_pending_verification').style.display = 'none';
			
						InitializeTransaction();
		}
	} 
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed showing error or submitting payment info form', e );
	}
}


function UpdateReviewPageBillingInfoWithCurrentValues( price_data )
{
	try 
	{
				var method = $('payment_method');
		if ( method && price_data )
		{
			var providerPaymentMethod = price_data.providerpaymentmethod ? price_data.providerpaymentmethod : 0;
			var steamAccountTotal = price_data.steamAccountTotal ? price_data.steamAccountTotal : 0;
			var formattedProviderTotal = price_data.formattedProviderTotal ? price_data.formattedProviderTotal : '';
			var formattedSteamAccountTotal = price_data.formattedSteamAccountTotal ? price_data.formattedSteamAccountTotal : '';
			var hitMinProviderAmount = price_data.hitminprovideramount ? price_data.hitminprovideramount : false;

			var card_number;
			if ( method.value == 'storedcreditcard' )
			{
				method = $('stored_payment_method');
				card_number = $('stored_card_number');
				if ( BStoredCreditCardRequiresSecurityCode( method.value ) )
				{
					$('payment_method_review_row_provider_cvv').style.display = 'block';
					$('security_code_cached').value = '';
				}
			}
			else
			{
				card_number = $( 'card_number' );
				$('payment_method_review_row_provider_cvv').style.display = 'none';
			}
			if ( card_number )
				card_number = card_number.value
			else
				card_number = '';

						$('payment_method_review_row_provider').style.display = 'block';
			$('payment_method_review_row_steam_account').style.display = 'none';
			$('payment_method_review_row_min_provider_amount').style.display = 'none';
			$('payment_method_review_provider_total').style.display = 'none';
			$('payment_method_review_steam_account_total').style.display = 'none';
			
			if ( providerPaymentMethod == 0 )
			{
								$('payment_method_review_row_provider_cvv').style.display = 'none';
				$('payment_method_review_row_steam_account').style.display = 'block';
				$('payment_method_review_row_provider').style.display = 'none';
			}
			else if ( steamAccountTotal > 0 )
			{
								$('payment_method_review_row_steam_account').style.display = 'block';
				$('payment_method_review_provider_total').style.display = 'block';
				$('payment_method_review_steam_account_total').style.display = 'block';
				$('payment_method_review_row_min_provider_amount').style.display = hitMinProviderAmount ? 'block' : 'none';				
			}
			else
			{
						
			}

						$('payment_method_review_provider_total').innerHTML = formattedProviderTotal;
			$('payment_method_review_steam_account_total').innerHTML = formattedSteamAccountTotal;
						$('checkout_review_payment_info_area').style.display = g_bShowAddressForm ? '' : 'none';

						if ( method.value == 'visa' && providerPaymentMethod == 2 )
			{	
				$('payment_method_review_text').innerHTML = 'Visa'+' ending in '+ (card_number.substr( Math.max( 0, card_number.length-4 ) ) );
			}
			else if ( method.value == 'mastercard' && providerPaymentMethod == 2 )
			{
				$('payment_method_review_text').innerHTML = 'MasterCard'+' ending in '+ (card_number.substr( Math.max( 0, card_number.length-4 ) ) );
			}
			else if ( method.value == 'amex' && providerPaymentMethod == 2 )
			{
				$('payment_method_review_text').innerHTML = 'American Express'+' ending in '+ (card_number.substr( Math.max( 0, card_number.length-4 ) ) );
			}
			else if ( method.value == 'discover' && providerPaymentMethod == 2 )
			{
				$('payment_method_review_text').innerHTML = 'Discover'+' ending in '+ (card_number.substr( Math.max( 0, card_number.length-4 ) ) );
			}
			else if ( method.value == 'jcb' && providerPaymentMethod == 2 )
			{
				$('payment_method_review_text').innerHTML = 'JCB'+' ending in '+ (card_number.substr( Math.max( 0, card_number.length-4 ) ) );
			}
			else if ( method.value == 'cartebleue' && providerPaymentMethod == 2 )
			{
				$('payment_method_review_text').innerHTML = 'Carte Bleue'+' ending in '+ (card_number.substr( Math.max( 0, card_number.length-4 ) ) );
			}
			else if ( method.value == 'dankort' && providerPaymentMethod == 2 )
			{
				$('payment_method_review_text').innerHTML = 'Visa Dankort'+' ending in '+ (card_number.substr( Math.max( 0, card_number.length-4 ) ) );
			}
			else if ( method.value == 'steamaccount' && providerPaymentMethod == 0 )
			{
			}
			else if ( method.value == 'storedpaypal' && providerPaymentMethod == 4 )
			{
				$('payment_method_review_text').innerHTML = 'My PayPal Account (' + $('stored_paypal_email').value + ')';
			}
			else if ( method.value == 'paypal' && providerPaymentMethod == 4 )
			{
				$('payment_method_review_text').innerHTML = 'PayPal';
			}
			else if ( method.value == 'updatepaypal' && providerPaymentMethod == 4 )
			{
				$('payment_method_review_text').innerHTML = 'PayPal';
			}
			else if ( method.value == 'giropay' && providerPaymentMethod == 3 )
			{
				$('payment_method_review_text').innerHTML = 'GiroPay';
			}
			else if ( method.value == 'paysafe' && providerPaymentMethod == 6 )
			{
				$('payment_method_review_text').innerHTML = 'PaySafeCard';
			}
			else if ( method.value == 'ideal' && providerPaymentMethod == 5 )
			{
				$('payment_method_review_text').innerHTML = 'iDEAL';
			}
			else if ( method.value == 'sofort' && providerPaymentMethod == 7 )
			{
								if ( price_data.storeCountryCode == 'GB' || price_data.storeCountryCode == 'BE' )
				{
					$('payment_method_review_text').innerHTML = 'DIRECTebanking.com';
				}
				else
				{
					$('payment_method_review_text').innerHTML = 'Sofortüberweisung';					
				}
					
			}
			else if ( method.value == 'webmoney' && providerPaymentMethod == 9 )
			{
				$('payment_method_review_text').innerHTML = 'WebMoney';
			}
			else if ( method.value == 'moneybookers' && providerPaymentMethod == 10 )
			{
				$('payment_method_review_text').innerHTML = 'Skrill';
			}
			else if ( method.value == 'alipay' && providerPaymentMethod == 11 )
			{
				$('payment_method_review_text').innerHTML = 'AliPay';
			}
			else if ( method.value == 'unionpay' && providerPaymentMethod == 78 )
			{
				$('payment_method_review_text').innerHTML = 'UnionPay';
			}
			else if ( method.value == 'yandex' && providerPaymentMethod == 12 )
			{
				$('payment_method_review_text').innerHTML = 'Yandex';
			}
			else if ( method.value == 'qiwi' && providerPaymentMethod == 14 )
			{
				$('payment_method_review_text').innerHTML = 'QIWI Wallet';
			}
			else if ( method.value == 'beeline' && providerPaymentMethod == 33 )
			{
				$('payment_method_review_text').innerHTML = 'Mobile Payments';
			}
			else if ( method.value == 'boleto' && providerPaymentMethod == 18 )
			{
				$('payment_method_review_text').innerHTML = 'Boleto Bancario';
			}
			else if ( method.value == 'boacompragold' && providerPaymentMethod == 19 )
			{
				$('payment_method_review_text').innerHTML = 'BoaCompra Gold';
			}
			else if ( method.value == 'bancodobrasilonline' && providerPaymentMethod == 20 )
			{
				$('payment_method_review_text').innerHTML = 'Banco Do Brasil Online';
			}
			else if ( method.value == 'itauonline' && providerPaymentMethod == 21 )
			{
				$('payment_method_review_text').innerHTML = 'Itau Online';
			}
			else if ( method.value == 'bradescoonline' && providerPaymentMethod == 22 )
			{
				$('payment_method_review_text').innerHTML = 'Bradesco Online';
			}
			else if ( method.value == 'pagseguro' && providerPaymentMethod == 23 )
			{
				$('payment_method_review_text').innerHTML = 'Pagseguro';
			}
			else if ( method.value == 'visabrazil' && providerPaymentMethod == 24 )
			{
				$('payment_method_review_text').innerHTML = 'Visa (National)';
			}
			else if ( method.value == 'amexbrazil' && providerPaymentMethod == 25 )
			{
				$('payment_method_review_text').innerHTML = 'American Express (National)';
			}
			else if ( method.value == 'aura' && providerPaymentMethod == 26 )
			{
				$('payment_method_review_text').innerHTML = 'Aura';
			}
			else if ( method.value == 'hipercard' && providerPaymentMethod == 27 )
			{
				$('payment_method_review_text').innerHTML = 'Hipercard';
			}
			else if ( method.value == 'mastercardbrazil' && providerPaymentMethod == 28 )
			{
				$('payment_method_review_text').innerHTML = 'Mastercard (National)';
			}
			else if ( method.value == 'dinerscardbrazil' && providerPaymentMethod == 29 )
			{
				$('payment_method_review_text').innerHTML = 'Diner\'s Club (National)';
			}
			else if ( method.value == 'multibanco' && providerPaymentMethod == 45 )
			{
				$('payment_method_review_text').innerHTML = 'Multibanco';
			}
			else if ( method.value == 'payshop' && providerPaymentMethod == 46 )
			{
				$('payment_method_review_text').innerHTML = 'Payshop';
			}
			else if ( method.value == 'maestroboacompra' && providerPaymentMethod == 47 )
			{
				$('payment_method_review_text').innerHTML = 'Maestro (Domestic)';
			}
			else if ( method.value == 'visaelectronboacompra' && providerPaymentMethod == 121 )
			{
				$('payment_method_review_text').innerHTML = 'Visa Electron (Domestic)';
			}
			else if ( method.value == 'oxxo' && providerPaymentMethod == 48 )
			{
				$('payment_method_review_text').innerHTML = 'OXXO';
			}
			else if ( method.value == 'toditocash' && providerPaymentMethod == 49 )
			{
				$('payment_method_review_text').innerHTML = 'Todito Cash';
			}
			else if ( method.value == 'carnet' && providerPaymentMethod == 50 )
			{
				$('payment_method_review_text').innerHTML = 'Carnet';
			}
			else if ( method.value == 'spei' && providerPaymentMethod == 51 )
			{
				$('payment_method_review_text').innerHTML = 'SPEI';
			}
			else if ( method.value == '3pay' && providerPaymentMethod == 52 )
			{
				$('payment_method_review_text').innerHTML = 'Mobile Payments';
			}
			else if ( method.value == 'isbank' && providerPaymentMethod == 53 )
			{
				$('payment_method_review_text').innerHTML = 'Is Bank';
			}
			else if ( method.value == 'garanti' && providerPaymentMethod == 54 )
			{
				$('payment_method_review_text').innerHTML = 'Garanti';
			}
			else if ( method.value == 'akbank' && providerPaymentMethod == 55 )
			{
				$('payment_method_review_text').innerHTML = 'Akbank';
			}
			else if ( method.value == 'yapikredi' && providerPaymentMethod == 56 )
			{
				$('payment_method_review_text').innerHTML = 'Yapi Kredi';
			}
			else if ( method.value == 'halkbank' && providerPaymentMethod == 57 )
			{
				$('payment_method_review_text').innerHTML = 'Halkbank';
			}
			else if ( method.value == 'bankasya' && providerPaymentMethod == 58 )
			{
				$('payment_method_review_text').innerHTML = 'Bank Asya';
			}
			else if ( method.value == 'finansbank' && providerPaymentMethod == 59 )
			{
				$('payment_method_review_text').innerHTML = 'Finansbank';
			}
			else if ( method.value == 'denizbank' && providerPaymentMethod == 60 )
			{
				$('payment_method_review_text').innerHTML = 'DenizBank';
			}
			else if ( method.value == 'ptt' && providerPaymentMethod == 61 )
			{
				$('payment_method_review_text').innerHTML = 'PTT';
			}
			else if ( method.value == 'cashu' && providerPaymentMethod == 62 )
			{
				$('payment_method_review_text').innerHTML = 'CashU';
			}
			else if ( method.value == 'onecard' && providerPaymentMethod == 66 )
			{
				$('payment_method_review_text').innerHTML = 'OneCard';
			}
			else if ( method.value == 'tenpay' && providerPaymentMethod == 84 )
			{
				$('payment_method_review_text').innerHTML = 'Tenpay';
			}
			else if ( method.value == 'wechat' && providerPaymentMethod == 85 )
			{
				$('payment_method_review_text').innerHTML = 'WeChat';
			}
			else if ( method.value == 'molpoints' && providerPaymentMethod == 31 )
			{
				$('payment_method_review_text').innerHTML = 'MOL Points';
			}
			else if ( method.value == 'konbini' && providerPaymentMethod == 34 )
			{
				$('payment_method_review_text').innerHTML = 'Konbini';
			}
			else if ( method.value == 'credit_card_japan' && providerPaymentMethod == 36 )
			{
				$('payment_method_review_text').innerHTML = 'Credit Card (Domestic)';
			}
			else if ( method.value == 'bank_transfer_japan' && providerPaymentMethod == 37 )
			{
				$('payment_method_review_text').innerHTML = 'Bank Transfer (Japan)';
			}
			else if ( method.value == 'payeasy' && providerPaymentMethod == 38 )
			{
				$('payment_method_review_text').innerHTML = 'Pay Easy';
			}
			else if ( method.value == 'webmoney_japan' && providerPaymentMethod == 65 )
			{
				$('payment_method_review_text').innerHTML = 'WebMoney';
			}
			else if ( method.value == 'webmoney_japan_steam_card' && providerPaymentMethod == 125 )
			{
				$('payment_method_review_text').innerHTML = 'Steam Prepaid Card';
			}
			else if ( method.value == 'bitcash' && providerPaymentMethod == 81 )
			{
				$('payment_method_review_text').innerHTML = 'BitCash';
			}
			else if ( method.value == 'netcash' && providerPaymentMethod == 82 )
			{
				$('payment_method_review_text').innerHTML = 'NetCash';
			}
			else if ( method.value == 'nanaco' && providerPaymentMethod == 83 )
			{
				$('payment_method_review_text').innerHTML = 'nanacoギフト';
			}
			else if ( method.value == 'zong' && providerPaymentMethod == 39 )
			{
				$('payment_method_review_text').innerHTML = 'Zong';
			}
			else if ( method.value == 'culturevoucher' && providerPaymentMethod == 40 )
			{
				$('payment_method_review_text').innerHTML = 'Culture Voucher';
			}
			else if ( method.value == 'happymoneyvoucher' && providerPaymentMethod == 42 )
			{
				$('payment_method_review_text').innerHTML = 'Happymoney Voucher';
			}
			else if ( method.value == 'toss' && providerPaymentMethod == 127 )
			{
				$('payment_method_review_text').innerHTML = 'Toss';
			}
			else if ( method.value == 'eclubpoints' && providerPaymentMethod == 35 )
			{
				$('payment_method_review_text').innerHTML = 'eClub Points';
			}
			else if ( method.value == 'pse' && providerPaymentMethod == 67 )
			{
				$('payment_method_review_text').innerHTML = 'PSE';
			}
			else if ( method.value == 'exito' && providerPaymentMethod == 68 )
			{
				$('payment_method_review_text').innerHTML = 'Exito';
			}
			else if ( method.value == 'efecty' && providerPaymentMethod == 69 )
			{
				$('payment_method_review_text').innerHTML = 'Efecty';
			}
			else if ( method.value == 'baloto' && providerPaymentMethod == 70 )
			{
				$('payment_method_review_text').innerHTML = 'Baloto';
			}
			else if ( method.value == 'pinvalidda' && providerPaymentMethod == 71 )
			{
				$('payment_method_review_text').innerHTML = 'payvalida';
			}
			else if ( method.value == 'mangirkart' && providerPaymentMethod == 72 )
			{
				$('payment_method_review_text').innerHTML = 'MangirKart';
			}
			else if ( method.value == 'bancocreditodeperu' && providerPaymentMethod == 73 )
			{
				$('payment_method_review_text').innerHTML = 'Banco Credito de Peru';
			}
			else if ( method.value == 'bbvacontinental' && providerPaymentMethod == 74 )
			{
				$('payment_method_review_text').innerHTML = 'BBVA Continental';
			}
			else if ( method.value == 'safetypay' && providerPaymentMethod == 75 )
			{
				$('payment_method_review_text').innerHTML = 'SafetyPay';
			}
			else if ( method.value == 'pagoefectivo' && providerPaymentMethod == 76 )
			{
				$('payment_method_review_text').innerHTML = 'PagoEfectivo';
			}
			else if ( method.value == 'trustly' && providerPaymentMethod == 77 )
			{
				$('payment_method_review_text').innerHTML = 'Trustly';
			}
			else if ( method.value == 'bitcoin' && providerPaymentMethod == 79 )
			{
				$('payment_method_review_text').innerHTML = 'Bitcoin';
			}			
			else if ( method.value == 'nodwin_cod' && providerPaymentMethod == 86 )
			{
				$('payment_method_review_text').innerHTML = 'Cash on Delivery';
			}
			else if ( method.value == 'credit_card_india' && providerPaymentMethod == 87 )
			{
				$('payment_method_review_text').innerHTML = 'Credit Card (Domestic)';
			}
			else if ( method.value == 'debit_card_india' && providerPaymentMethod == 88 )
			{
				$('payment_method_review_text').innerHTML = 'Debit Card (Domestic)';
			}
			else if ( method.value == 'net_banking_india' && providerPaymentMethod == 89 )
			{
				$('payment_method_review_text').innerHTML = 'Net Banking';
			}
			else if ( method.value == 'cash_card_india' && providerPaymentMethod == 90 )
			{
				$('payment_method_review_text').innerHTML = 'Cash Card';
			}
			else if ( method.value == 'wallet_india' && providerPaymentMethod == 91 )
			{
				$('payment_method_review_text').innerHTML = 'Prepaid Wallet (Domestic)';
			}
			else if ( method.value == 'korean_mobile' && providerPaymentMethod == 92 )
			{
				$('payment_method_review_text').innerHTML = 'Mobile Payments';
			}
			else if ( method.value == 'naranja' && providerPaymentMethod == 93 )
			{
				$('payment_method_review_text').innerHTML = 'Naranja';
			}
			else if ( method.value == 'cencosud' && providerPaymentMethod == 94 )
			{
				$('payment_method_review_text').innerHTML = 'Cencosud';
			}
			else if ( method.value == 'cabal' && providerPaymentMethod == 95 )
			{
				$('payment_method_review_text').innerHTML = 'Cabal';
			}
			else if ( method.value == 'pagofacil' && providerPaymentMethod == 96 )
			{
				$('payment_method_review_text').innerHTML = 'PagoFacil';
			}
			else if ( method.value == 'rapipago' && providerPaymentMethod == 97 )
			{
				$('payment_method_review_text').innerHTML = 'Rapipago';
			}
			else if ( method.value == 'banconacionaldecostarica' && providerPaymentMethod == 98 )
			{
				$('payment_method_review_text').innerHTML = 'Banco Nacional De Costa Rica';
			}
			else if ( method.value == 'bancopoplar' && providerPaymentMethod == 99 )
			{
				$('payment_method_review_text').innerHTML = 'BancoPoplar';
			}
			else if ( method.value == 'redpagos' && providerPaymentMethod == 100 )
			{
				$('payment_method_review_text').innerHTML = 'RedPagos';
			}
			else if ( method.value == 'spe' && providerPaymentMethod == 101 )
			{
				$('payment_method_review_text').innerHTML = 'SPE';
			}
			else if ( method.value == 'multicaja' && providerPaymentMethod == 102 )
			{
				$('payment_method_review_text').innerHTML = 'Multicaja';
			}
			else if ( method.value == 'redcompra' && providerPaymentMethod == 103 )
			{
				$('payment_method_review_text').innerHTML = 'RedCompra';
			}
			else if ( method.value == 'ziraatbank' && providerPaymentMethod == 104 )
			{
				$('payment_method_review_text').innerHTML = 'ZiraatBank';
			}
			else if ( method.value == 'vakiflarbank' && providerPaymentMethod == 105 )
			{
				$('payment_method_review_text').innerHTML = 'VakiflarBank';
			}
			else if ( method.value == 'kuveytturkbank' && providerPaymentMethod == 106 )
			{
				$('payment_method_review_text').innerHTML = 'KuveytTurkBank';
			}
			else if ( method.value == 'ekonomibank' && providerPaymentMethod == 107 )
			{
				$('payment_method_review_text').innerHTML = 'EkonomiBank';
			}
			else if ( method.value == 'pichincha' && providerPaymentMethod == 108 )
			{
				$('payment_method_review_text').innerHTML = 'Pichincha';
			}
			else if ( method.value == 'pichinchacash' && providerPaymentMethod == 109 )
			{
				$('payment_method_review_text').innerHTML = 'PichinchaCash';
			}
			else if ( method.value == 'przelewy24' && providerPaymentMethod == 110 )
			{
				$('payment_method_review_text').innerHTML = 'Przelewy24';
			}
			else if ( method.value == 'trustpay' && providerPaymentMethod == 111 )
			{
				$('payment_method_review_text').innerHTML = 'Trustpay';
			}
			else if ( method.value == 'poli' && providerPaymentMethod == 112 )
			{
				$('payment_method_review_text').innerHTML = 'POLi';
			}
			else if ( method.value == 'mercadopago' && providerPaymentMethod == 113 )
			{
				$('payment_method_review_text').innerHTML = 'MercadoPago';
			}
			else if ( method.value == 'payu' && providerPaymentMethod == 114 )
			{
				$('payment_method_review_text').innerHTML = 'PayU';
			}
			else if ( method.value == 'vtcpaywallet' && providerPaymentMethod == 115 )
			{
				$('payment_method_review_text').innerHTML = 'VTC Pay e-Wallet';
			}
			else if ( method.value == 'vtcpaycards' && providerPaymentMethod == 119 )
			{
				$('payment_method_review_text').innerHTML = 'Local Credit Cards';
			}
			else if ( method.value == 'vtcpayonlinebanking' && providerPaymentMethod == 120 )
			{
				$('payment_method_review_text').innerHTML = 'Online Banking';
			}
			else if ( method.value == 'mrcash' && providerPaymentMethod == 116 )
			{
				$('payment_method_review_text').innerHTML = 'MrCash';
			}
			else if ( method.value == 'eps' && providerPaymentMethod == 117 )
			{
				$('payment_method_review_text').innerHTML = 'EPS';
			}
			else if ( method.value == 'interac' && providerPaymentMethod == 118 )
			{
				$('payment_method_review_text').innerHTML = 'Interac';
			}
			else if ( method.value == 'santanderrio' && providerPaymentMethod == 63 )
			{
				$('payment_method_review_text').innerHTML = 'Santander Rio';
			}
			else if ( method.value == 'cafefunded' && providerPaymentMethod == 122 )
			{
				$('payment_method_review_text').innerHTML = 'In Person Transaction: ' + sSiteName;
			}
			else if ( method.value == 'valve' && providerPaymentMethod == 129 )
			{
				$('payment_method_review_text').innerHTML = 'None';
			}
		}
		
		$J('#review_address_body').text( $('first_name').value+' '+$('last_name').value );
		$J('#review_address_body').append( '<br>', document.createTextNode( $('billing_address').value ) );
		if ( $('billing_address_two').value.length > 0 )
		{
			$J('#review_address_body').append( '<br>', document.createTextNode($('billing_address_two').value ) );
		}
			
		if ( g_bHasBillingStates )
		{
			$J('#review_address_body').append( '<br>', document.createTextNode( $('billing_city').value+', '+$('billing_state_select').value ) );
		}
		else
		{
			$J('#review_address_body').append( '<br>', document.createTextNode( $('billing_city').value+', '+$('billing_state_text').value ) );
		}
		$J('#review_address_body').append( '<br>', document.createTextNode(  $('billing_country').value ) );

		if ( g_bRequiresShipping )
		{
			$J('#shipping_review_name').text( $('shipping_first_name').value+' '+$('shipping_last_name').value );
			$J('#review_shipping_address_body').text( $('shipping_address').value );
			if ( $('shipping_address_two').value.length > 0 )
			{
				$J('#review_shipping_address_body').append( '<br>', document.createTextNode( $('shipping_address_two').value ) );
			}
			
			if ( g_bHasBillingStates )
			{
				$J('#review_shipping_address_body').append( '<br>', document.createTextNode( $('shipping_city').value+', '+$('shipping_state_select').value ) );
			}
			else
			{
				$J('#review_shipping_address_body').append( '<br>', document.createTextNode( $('shipping_city').value+', '+$('shipping_state_text').value ) );
			}

			$J('#review_shipping_address_body').append( '<br>', document.createTextNode( $('shipping_postal_code').value ) );
			$J('#review_shipping_address_body').append( '<br>', document.createTextNode( $('shipping_country').value ) );
		}
		else
		{
			$('checkout_review_shipping_address_area').style.display = 'none';
		}

		$J('#review_phone_body').text( $('billing_phone').value );


				if( $('checkout_review_gift_willbesent') && $('checkout_review_gift_willbekept') )
		{
			if ( $('send_self') && $('send_self').checked )
			{
				$('checkout_review_gift_willbesent').hide();
				$('checkout_review_gift_willbekept').show();
			}
			else
			{
				var rtFutureDate = GatherScheduledSendFields();
				if ( rtFutureDate )
				{
					$('checkout_review_gift_willbesent').update( 'Your gift purchase for %1$s will be sent on %2$s.'.replace( /%1\$s/, currently_selected_friend_name ).replace( /%2\$s/, new Date( rtFutureDate * 1000 ).toLocaleString() ) );
				}
				else
				{
					$('checkout_review_gift_willbesent').update( 'Your gift purchase for&nbsp;<span id="giftee_name_review"></span>&nbsp;will be sent upon completion of your purchase.' );
				}
				$('checkout_review_gift_willbesent').show();
				$('checkout_review_gift_willbekept').hide();
			}
		}

		var $giftee_name_review = $J('#giftee_name_review');
		if ( $giftee_name_review.length )
		{
			if ( $( 'send_via_email' ) && $( 'send_via_email' ).checked )
			{
				$giftee_name_review.text( $( 'email_input' ).value );
			}
			else
			{
				// this value is already escaped
				$giftee_name_review.html( currently_selected_friend_name );
			}
		}
		
		if ( $('checkout_review_gift_refundnote_wallet') )
		{
			if ( method.value == 'steamaccount' && providerPaymentMethod == 0 )
			{
				$('checkout_review_gift_refundnote_wallet').hide();
			}
			else
			{
				$('checkout_review_gift_refundnote_wallet').show();
			}
		}
		
				if ( price_data )
		{
			if ( price_data.base )
				$('review_subtotal_value').innerHTML = price_data.formattedSubTotal;
			else
				$('review_subtotal_value').innerHTML = '';
			
			// deal with promotion elements
			var promotionNodes = document.getElementsByClassName('cart_total_row_promotion');

			for (var i = 0; i < promotionNodes.length; i++)
			{
				promotionNodes[i].parentNode.removeChild(element);
			}
			
			if ( price_data.promotions )
			{
				var insertNode = $( 'cart_price_summary' );
				
				for ( var i = 0; i < price_data.promotions.length; i++ )
				{
					var newElement = document.createElement('div');
					newElement.className = 'cart_total_row cart_total_row_promotion';
					newElement.setAttribute( 'id', 'cart_price_summary_text' );
					
					var newPrice = document.createElement('div');
					newPrice.className = 'price';
					newPrice.innerHTML = price_data.promotions[i].formattedDiscount;
					newElement.appendChild(newPrice);
					
					var newDescription = document.createElement('div');
					newDescription.innerHTML = price_data.promotions[i].description;
					newElement.appendChild( newDescription);
					insertNode.parentNode.insertBefore( newElement, insertNode.nextSibling );
					
					insertNode = newElement;
				}
				
				$('cart_price_summary_discounted_subtotal').style.display =  'block';
				$('review_discounted_subtotal_value').style.display = 'block';
				$('review_discounted_subtotal_value').innerHTML = price_data.formattedDiscountedSubTotal;	
			}
			else
			{
				$('cart_price_summary_discounted_subtotal').style.display =  'none';
				$('review_discounted_subtotal_value').style.display = 'none';
			}
				
			if ( price_data.formattedTax && price_data.formattedTax != '' )
			{
				$('review_taxes_value').innerHTML = price_data.formattedTax;
				$('cart_price_summary_taxes').style.display = 'block';
				$('review_taxes_value').style.display = 'block';

				if ( price_data.taxdetails.billing.state != '' || ( g_bRequiresShipping && price_data.taxdetails.shipping.state != '') )
				{
					var taxState = '';
					if ( price_data.taxdetails.billing.state != '' )
					{
						taxState = price_data.taxdetails.billing.state;
						if ( g_bRequiresShipping && price_data.taxdetails.shipping.state != '' && price_data.taxdetails.shipping.state != taxState )
						{
							taxState = taxState + '/' + price_data.taxdetails.shipping.state;
							$('cart_price_summary_taxes_different_shipping').style.display = 'inline-block';
						}
						else
						{
							$('cart_price_summary_taxes_different_shipping').style.display = 'none';
						}
					}
					else if ( g_bRequiresShipping )
					{
						taxState = price_data.taxdetails.shipping.state;
						$('cart_price_summary_taxes_different_shipping').style.display = 'inline-block';
					}
					$('cart_price_summary_taxes_text').innerHTML = 'Tax' + ' (' + taxState + ')';
				}
				else
				{
					$('cart_price_summary_taxes_different_shipping').style.display = 'none';
					$('cart_price_summary_taxes_text').innerHTML = 'Tax';
				}
			}
			else
			{
				$('cart_price_summary_taxes').style.display =  'none';
				$('review_taxes_value').style.display = 'none';
			}

			if ( price_data.formattedShipping && price_data.formattedShipping != '' )
			{
				$('review_shipping_value').innerHTML = price_data.formattedShipping;
				$('cart_price_summary_shipping').style.display = 'block';
				$('review_shipping_value').style.display = 'block';
			}
			else
			{
				$('cart_price_summary_shipping').style.display =  'none';
				$('review_shipping_value').style.display = 'none';
			}

			if ( price_data.formattedImportFee && price_data.formattedImportFee != '' )
			{
				$('review_import_fee_value').innerHTML = price_data.formattedImportFee;
				$('cart_price_summary_import_fee').style.display = 'block';
				$('review_import_fee_value').style.display = 'block';
			}
			else
			{
				$('cart_price_summary_import_fee').style.display =  'none';
				$('review_import_fee_value').style.display = 'none';
			}			

			if ( price_data.base )
				$('review_total_value').innerHTML = price_data.formattedTotal;
			else
				$('review_total_value').innerHTML = '';
				
			$('checkout_review_cart_area').innerHTML = price_data.lineItemsHTML;
			
			// bugbug - kurt - show promotion discount data?
			
			if ( price_data.taxNotice && price_data.taxNotice != '' )
			{
				$('checkout_review_tax_notice').innerHTML = price_data.taxNotice;
				$('checkout_review_tax_notice').style.display = 'block';
			}
			else
			{
				$('checkout_review_tax_notice').style.display = 'none';
			}
			
			if ( price_data.purchaseNotice && price_data.purchaseNotice != '' )
			{
				//in V5, this is a seperate notice
				$('checkout_review_purchase_notice').innerHTML = price_data.purchaseNotice;
				$('checkout_review_purchase_notice_area').show();
			}
		}
	} 
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed updating review page with new billing/pricing data', e );
	}		
}



function NewSetTabEnabledClosure( a_tab_name )
{
	var tab_name = a_tab_name;
	return function() { SetTabEnabled( tab_name ) };
}


function SetTabEnabled( tab_name, bResetTab )
{
		if ( bResetTab == undefined )
		bResetTab = true;
		
		try 
	{
		if ( g_bFinalizeTransactionInProgress )
			return;
	} 
	catch( e )
	{
	}

		if ( g_timeoutPoll )
	{
		clearTimeout( g_timeoutPoll );	
	}
	g_timeoutPoll = false;
	g_bPollingForTransactionStatus = false;
		
	try 
	{
				var bTabNameOK = false;
		for( var i=0; i < rgValidTabs.length; ++i )
		{
			if ( rgValidTabs[i] == tab_name )
			{
				bTabNameOK = true;
				break;
			}
		}
		
				if ( !bTabNameOK )
			return;
			
		for( var i=0; i < rgValidTabs.length; ++i )
		{
			var curTab = rgValidTabs[i];
			
						if ( curTab != tab_name && $( rgValidTabs[i]+'_tab_select' ).className == 'cart_tab_on' )
			{
				$( curTab+'_tab_select' ).className = 'cart_tab_inactive';
				$( curTab+'_tab_select_left' ).className = 'cart_tab_left_inactive';
				$( curTab+'_tab_select_right' ).className = 'cart_tab_right_inactive';
				
																if ( curTab == 'review' )
					$( curTab+'_tab_select' ).onclick = function() { SubmitPaymentInfoForm(); };
				else
					$( curTab+'_tab_select' ).onclick = NewSetTabEnabledClosure( curTab );
				
				$( curTab+'_tab' ).style.display = 'none';
				$( 'col_right_'+curTab ).style.display = 'none';
				if ( $('footer_note_'+curTab) ) $('footer_note_'+curTab).hide();
			}
			else if ( curTab == tab_name )
			{
				$( curTab+'_tab_select' ).className = 'cart_tab_on';
				$( curTab+'_tab_select_left' ).className = 'cart_tab_left_on';
				$( curTab+'_tab_select_right' ).className = 'cart_tab_right_on';
				$( curTab+'_tab_select' ).onclick = function() { return true; };
				
				$( curTab+'_tab' ).style.display = 'block';
				$( 'col_right_'+curTab ).style.display = 'block';
				if ( $('footer_note_'+curTab) ) $('footer_note_'+curTab).show();
				
				if ( rgFocusOnTabSelect && rgFocusOnTabSelect[curTab] )
				{
										try {
						$( rgFocusOnTabSelect[curTab] ).focus();
					} catch(e) {
											}
				}	
				
				if ( bResetTab && curTab == 'payment_info' )
				{					
										ShowFirstPaymentStep();
				}
			}
		}

		// scroll back to the top (mostly for mobile devices)
		ScrollToIfNotInView( $J('.checkout_main'), null, 20 );
		
				$('error_display').innerHTML = '';
		$('error_display').style.display = 'none';
		
				$('footer').hide();
		$('footer').show();
	} 
	catch(e) 
	{
		ReportCheckoutJSError( 'Failed in SetTabEnabled(\''+tab_name+'\')', e );
	}
	
}

function UpdateGiftTextCharsRemaining()
{
	try 
	{
		var element = $( 'gift_message_text' );
		if ( !element )
			return;
			
		var len = element.value.length;
		if ( len > 160 )
		{
			element.value = element.value.substring( 0, 160 );
		}
		
		var remaining = 160 - Math.min( len, 160 );
		$( 'message_chars_left' ).innerHTML = remaining;
	}
	catch(e)
	{
		ReportCheckoutJSError( 'Failed in UpdateGiftTextCharsRemaining', e );
	}
}

function HandleFinalizeTransactionFailure( ePaymentType, eErrorDetail, bShowBRSpecificCreditCardError, sErrorText )
{
	try
	{
		var error_text = '';

		if ( sErrorText && sErrorText != '' )
		{
			error_text = sErrorText;			
		}
		else
		{
			switch ( ePaymentType )
			{
				case 2:
				{
					if ( bShowBRSpecificCreditCardError && ( 
						eErrorDetail == 1 
						|| eErrorDetail == 4 
						|| eErrorDetail == 0 
						|| eErrorDetail == 2 
						|| eErrorDetail == 13 
						)
					)
					{
						error_text = 'Your credit card transaction was rejected.<br/><br/>Some Brazilian banks may reject purchases with international credit cards when purchasing in foreign stores that offer prices in Reais.  We suggest you try the transaction again, selecting the national version of your card type or another payment method of your preference.';
					}
					else
					{
						switch ( eErrorDetail )
						{
							default:
							case 3:
							case 8:
							case 9:
							case 7:
							case 11:
							case 57:
								error_text = 'An unexpected error has occurred. Your purchase has not been completed.<br>Please contact <a href="http://support.steampowered.com">Steam Support</a>.';
								break;
							case 1:
								error_text = 'Your purchase has not been completed. Your credit card information has been declined by your credit card company due to an incorrect address being entered.<br><br>Note that in some cases, your credit card company may put a \'hold\' on funds in your account, but you will not be charged. After correcting any errors in the information displayed below, please try your purchase again.';
								break;
							case 4:
								error_text = 'Your computer is either currently unable to reach the Steam servers, or the service may be temporarily disabled. Please try again later.';
								break;
							case 0:
								error_text = 'Your purchase has not been completed. Your credit card information has been declined by your credit card company.<br><br>Note that in some cases, your credit card company may put a \'hold\' on funds in your account, but you will not be charged. After correcting any errors in the information displayed below, please try your purchase again.';
								break;
							case 2:
								error_text = 'Your purchase has not been completed. Your credit card information has been declined by your credit card company due to insufficient funds in the account.<br><br>Note that in some cases, your credit card company may put a \'hold\' on funds in your account, but you will not be charged.';
								break;
							case 13:
								error_text = 'Sorry, but one of the items you tried to purchase is not available for purchase in this country. Your purchase has been cancelled.';
								break;
							case 35:
								error_text = 'Your purchase has not been completed.<br>The amount being added to your Steam Wallet would exceed the maximum allowed Steam Wallet balance.';
								break;
							case 44:
								error_text = 'Your purchase was not completed. Your account is currently locked from purchasing. Please contact Steam Support for details.';
								break;
							case 46:
								error_text = 'For the protection of the account holder, this purchase has been declined. Further purchasing will be temporarily limited - please contact Steam Support to resolve this issue.';
								break;
						}
					}
				}
				break;	

				default:
				{
					if ( ePaymentType == 122 && g_winExternal )
					{
						g_winExternal.close();
						g_winExternal = false;
					}

					switch ( eErrorDetail )
					{
						default:
						case 3:
						case 8:
						case 9:
						case 7:
						case 11:
						case 57:
							error_text = 'An unexpected error has occurred. Your purchase has not been completed.<br>Please contact <a href="http://support.steampowered.com">Steam Support</a>.';
							break;
						case 13:
							error_text = 'Sorry, but one of the items you tried to purchase is not available for purchase in this country. Your purchase has been cancelled.';
							break;
						case 4:
							error_text = 'Your computer is either currently unable to reach the Steam servers, or the service may be temporarily disabled. Please try again later.';
							break;
						case 0:
						case 22:
							error_text = 'Your purchase has not been completed.<br>The payment processor has reported an authorization failure. Please select a different payment method.';
							break;
						case 16:
							error_text = 'Your purchase has not been completed.<br>The payment processor has reported an authorization failure. Please select a different payment method.';
							break;
						case 17:
						case 2:
							error_text = 'Your purchase has not been completed.<br>The payment processor has reported a problem with the funding source associated with your account. Please <a href=\'javascript:SetTabEnabled("payment_info");\'>select a different payment method</a> or update your funding source with PayPal and try again.';
							break;
						case 18:
							error_text = 'Your purchase has not been completed.<br>The payment processor has reported a problem with the address associated with your account. You can either correct this problem through the processor, or select a different payment method.';
							break;
						case 19:
							error_text = 'Your purchase has not been completed.<br>Your chosen payment method is currently unavailable in your country. Please choose a different payment method.';
							break;
						case 20:
							error_text = 'Your purchase has not been completed.<br>The payment processor has reported a problem with your account. Please contact the processor or choose an alternate payment method.';
							break;
						case 21:
							error_text = 'Your purchase has not been completed.<br>The payment processor has reported that your account needs to be verified or funded to complete the purchase. Please contact the processor or choose an alternate payment method.';
							break;
						case 35:
							error_text = 'Your purchase has not been completed.<br>The amount being added to your Steam Wallet would exceed the maximum allowed Steam Wallet balance.';
							break;
						case 44:
							error_text = 'Your purchase was not completed. Your account is currently locked from purchasing. Please contact Steam Support for details.';
							break;
						case 46:
							error_text = 'For the protection of the account holder, this purchase has been declined. Further purchasing will be temporarily limited - please contact Steam Support to resolve this issue.';
							break;
					}
				}
			}
		}
	}
	catch(e)
	{
		ReportCheckoutJSError( 'Failed choosing error string for FinalizeTransaction failure', e );
	}
		
	
	try 
	{
				if ( error_text != '' )
		{
			DisplayErrorMessage( error_text );
		}
		
				$J('#purchase_button_bottom').hide();
		$J('#purchase_button_inprogress_bottom').hide();
		$J('#purchase_button_disabled_bottom').show();
		$J('#change_payment_method_button_bottom').show();
		$J('#cancel_button_bottom').show();
	}
	catch( e )
	{
		ReportCheckoutJSError( 'Failed showing error after FinalizeTransaction failure', e );
	}
}

function NukeCartCookie()
{
	try
	{
		var date = new Date();
		date.setTime(date.getTime()+(-10*24*60*60*1000));
		var expires = "expires="+date.toGMTString();
		document.cookie = 'shoppingCartGID'+"=-1; "+expires+"; path=/";
		document.cookie = 'workshopShoppingCartGID'+"=-1; "+expires+"; path=/";
	}
	catch ( e )
	{
		ReportCheckoutJSError( 'Failed nuking cart cookie', e );
	}
}

function OnPurchaseSuccess( result )
{
	try 
	{
		if ( g_bIsUpdateBillingInfoForm )
		{
						if ( $('cache_return_url') )
				window.location = $('cache_return_url').value;
			else
				window.location = 'https://store.steampowered.com/account/';
			return true;
		}
	
		$('receipt_total_price').innerHTML = result.purchasereceipt.formattedTotal;
		$('receipt_confirmation_code').innerHTML = result.purchasereceipt.transactionid;
		$('receipt_track_img').innerHTML = result.strReceiptPageHTML;
		
		if ( result.purchasereceipt.points_earned )
		{
			$('lny_tokens').style.display = 'block';
			$('lny_tokens_points').innerHTML = result.purchasereceipt.points_earned;
		}
	
		DisplayReceiptPage();
		
		if ( result.purchaseresultdetail == 29 )
		{
			$('purchase_summary_area').style.display = 'none';
			$('receipt_error_display').style.display = 'block';
			
			$('receipt_error_display').innerHTML = 'Your purchase is pending and will be reviewed shortly. You will be notified when it is completed.';
			
			Effect.ScrollTo( 'receipt_error_display' );
			new Effect.Highlight( 'receipt_error_display', { endcolor : '#000000', startcolor : '#ff9900' } );				
		}

		if ( typeof GDynamicStore != 'undefined' )
			GDynamicStore.InvalidateCache();
	}
	catch( e )
	{
		ReportCheckoutJSError( 'Error updating receipt body', e );
	}
	
		try
	{
		NukeCartCookie();
		var item_count = $('cart_item_count_value');
		if ( item_count )
			item_count.innerHTML = '0 '+'items in your cart';
	}
	catch ( e )
	{
		ReportCheckoutJSError( 'Failed nuking cart cookie or updating item_count display', e );
	}

}

function DisplayReceiptPage()
{
	$('cart_area').style.display = 'none';
	$('receipt_area').style.display = 'block';
	$('pending_receipt_area').style.display = 'none';
	
	var method = $('payment_method');
	if ( method.value == 'cafefunded' && g_winExternal )
	{
		g_winExternal.close();
		g_winExternal = false;
	}

	if ( $('checkout_pipeline') && $('receipt_pipeline') )
	{
				$('checkout_pipeline').hide();
		$('receipt_pipeline').show();
	}

	if ( $('checkout_logo_default') && $('checkout_logo_receipt' ) )
	{
				$('checkout_logo_default').hide();
		$('checkout_logo_receipt').show();
	}

	if ( $('col_right_receipt') )
	{
		$('col_right_receipt').siblings().invoke('hide');
		$('col_right_receipt').show();
	}

	if ( $('logsuccessfulpurchase_form') )
	{
		var form = $('logsuccessfulpurchase_form');
		form.request();		}
}


function DisplayPendingReceiptPage()
{
	$('cart_area').style.display = 'none';
	$('col_right_review').style.display = 'none';
	$('pending_receipt_area').style.display = 'block';

	$('pending_receipt_total_price').innerHTML = $('review_total_value').innerHTML;
	$('pending_receipt_confirmation_code').innerHTML = $('transaction_id').value;
	
	var method = $('payment_method');
	
	switch ( method.value )
	{
		case 'boleto':
		case 'boacompragold':
		case 'bancodobrasilonline':
		case 'itauonline':
		case 'bradescoonline':
		case 'pagseguro':
		case 'visabrazil':
		case 'amexbrazil':
		case 'hipercard':
		case 'aura':
		case 'mastercardbrazil':
		case 'dinerscardbrazil':
		case 'multibanco':
		case 'payshop':
		case 'maestroboacompra':
		case 'visaelectronboacompra':
		case 'oxxo':
		case 'toditocash':
		case 'carnet':
		case 'spei':
		case '3pay':
		case 'isbank':
		case 'garanti':
		case 'akbank':
		case 'yapikredi':
		case 'halkbank':
		case 'bankasya':
		case 'finansbank':
		case 'denizbank':
		case 'ptt':
		case 'cashu':
		case 'efecty':
		case 'baloto':
		case 'pagoefectivo':
			$('pending_purchase_summary_payment_method_description').innerHTML = 'Your purchase is in progress.  We are currently waiting for confirmation from your bank or payment processor.  This process can take a few days for confirmation.';
			$('pending_purchase_summary_payment_method_notes_text').innerHTML = 'Steam will send an email receipt to you when payment is received for this purchase. For questions regarding your payment processing status, please contact <a href="https://go4gold.uol.com.br/pt-br/categoria-faq/STEAM">BoaCompra</a>.';
			break;

		case 'molpoints':
		case 'pagofacil':
		case 'rapipago':
		case 'redpagos':
		case 'santanderrio':
			$('pending_purchase_summary_payment_method_description').innerHTML = 'Your purchase is in progress.  We are currently waiting for confirmation from your bank or payment processor.  This process can take a few days for confirmation.';
			$('pending_purchase_summary_payment_method_notes_text').innerHTML = 'Steam will send an email receipt to you when payment is received for this purchase.';
			break;
			
		case 'konbini':
		case 'bank_transfer_japan':
		case 'payeasy':
			$('pending_purchase_summary_payment_method_description').innerHTML = 'Your purchase is in progress.  We are currently waiting for confirmation from your bank or payment processor.  This process can take a few days for confirmation.';
			$('pending_purchase_summary_payment_method_notes_text').innerHTML = 'Steam will send an email receipt to you when payment is received for this purchase. For questions regarding your payment processing status, please contact <a href="http://www.degica.com/contact">Degica</a>.';
			break;
			
		case 'eclubpoints':
			$('pending_purchase_summary_payment_method_description').innerHTML = 'Your purchase is in progress.  We are currently waiting for confirmation from your bank or payment processor.  This process can take a few days for confirmation.';
			$('pending_purchase_summary_payment_method_notes_text').innerHTML = 'Steam will send an email receipt to you when payment is received for this purchase. For questions regarding your payment processing status, please contact <a href="https://www.eclubstore.com">eClub Store</a>.';
			break;
			
		case 'bitcoin':
			$('pending_purchase_summary_payment_method_description').innerHTML = 'Your purchase is in progress.  We are currently waiting for settlement on the bitcoin network.  This settlement requires at least one blockchain confirmation and can take several minutes to a few hours.';
			$('pending_purchase_summary_payment_method_notes_text').innerHTML = 'For questions regarding your payment processing status, please contact <a target="_blank" href="https://help.bitpay.com/8450-Disputes-/">BitPay</a>.';
			break;
			
		case 'unionpay':
			$('pending_purchase_summary_payment_method_description').innerHTML = 'Your purchase is in progress.  We are currently waiting for confirmation from our payment processor.  This process normally takes several minutes.';
			$('pending_purchase_summary_payment_method_notes_text').innerHTML = 'In extreme cases, this can take up to several days. Steam will email you a receipt when payment is received and your purchase is completed.';
			break;
			
		case 'wechat':
			$('pending_purchase_summary_payment_method_description').innerHTML = 'Your purchase is in progress.  We are currently waiting for confirmation from WeChat. This process normally takes several minutes.';
			$('pending_purchase_summary_payment_method_notes_text').innerHTML = 'In extreme cases, this can take up to several hours. Steam will email you a receipt when payment is received from WeChat and your purchase is completed.';
			break;			

		case 'tenpay':
			$('pending_purchase_summary_payment_method_description').innerHTML = 'Your purchase is in progress.  We are currently waiting for confirmation from Tenpay. This process normally takes several minutes.';
			$('pending_purchase_summary_payment_method_notes_text').innerHTML = 'In extreme cases, this can take up to several hours. Steam will email you a receipt when payment is received from Tenpay and your purchase is completed.';
			break;			
						
		case 'nodwin_cod':
			$('pending_purchase_summary_payment_method_description').innerHTML = 'Your purchase is in progress.  We are currently waiting for confirmation from NovaPlay once you have completed the cash on delivery process.';
			$('pending_purchase_summary_payment_method_notes_text').innerHTML = 'You will shortly receive an email from NovaPlay confirming your order and next steps.  Steam will email you a receipt when payment is received from NovaPlay and your purchase is completed. For questions regarding your payment processing status, please contact <a href="http://steamsupport.novaplay.in">NovaPlay</a>.';
			break;			
					
		case 'cafefunded':
			$('pending_purchase_summary_payment_method_description').innerHTML = '';
			$('pending_purchase_summary_payment_method_notes_text').innerHTML = 'checkout_receipt_pending_cafefunded_details';
			break;
					
						
		default:
			break;
	}

	NukeCartCookie();
	
	if ( $('checkout_pipeline') && $('receipt_pipeline') )
	{
				$('checkout_pipeline').hide();
		$('receipt_pipeline').show();
	}

	if ( $('checkout_logo_default') && $('checkout_logo_receipt' ) )
	{
				$('checkout_logo_default').hide();
		$('checkout_logo_receipt').show();
	}

	if ( $('col_right_pending_receipt') )
	{
		$('col_right_pending_receipt').siblings().invoke('hide');
		$('col_right_pending_receipt').show();
	}
}

var g_eLastAuthenticationStep = false;
function DisplayCreditCardAuthentication( authentication_data, txnid, retries )
{
	if ( !authentication_data )
	{
		try
		{
			new Ajax.Request('https://store.steampowered.com/checkout/authenticationdetails/',
			{
			    method:'get',
			    parameters: { 
					'transid' : txnid
				},
			    onSuccess: function(transport)
			    {
					var result = transport.responseText.evalJSON(true);

					if ( result.eresult != 1 )
					{
						var error_text = 'There seems to have been an error initializing or updating your transaction.  Please wait a minute and try again or contact support for assistance.';
						DisplayErrorMessage( error_text );
						return;					
					}		    	

					authentication_data = result.data;
			    },
			    onFailure: function()
			    {

					var error_text = 'There seems to have been an error initializing or updating your transaction.  Please wait a minute and try again or contact support for assistance.';
					DisplayErrorMessage( error_text );
					return;
			    }
		    } );
		}
		catch( e )
		{
			var error_text = 'There seems to have been an error initializing or updating your transaction.  Please wait a minute and try again or contact support for assistance.';
			DisplayErrorMessage( error_text );			
			ReportCheckoutJSError( 'Failed showing error after DisplayCreditCardAuthentication failure', e );
		}
	}

	if ( authentication_data.threed_secure_step == g_eLastAuthenticationStep )
	{
		// no change, so keep polling
		g_timeoutPoll = setTimeout( NewPollForTransactionStatusClosure( g_LastFinalizedTransactionID, retries, 5 ), 15*1000 );
		return;
	}

	g_eLastAuthenticationStep = authentication_data.threed_secure_step;

	switch ( authentication_data.threed_secure_step )
	{
		case 1:
		case 5:
			  		g_timeoutPoll = setTimeout( NewPollForTransactionStatusClosure( g_LastFinalizedTransactionID, retries, 5 ), 2*1000 );
  		return;							
			
		case 2:
									var params = [];
			params.push( { name: "MD", value: authentication_data.md } );
			params.push( { name: "PaReq", value: authentication_data.pa_request } );
			params.push( { name: "TermUrl", value: authentication_data.term_url } );
						
			PostUrlInNewBlankWindow( authentication_data.issuer_url, params );
						g_timeoutPoll = setTimeout( NewPollForTransactionStatusClosure( g_LastFinalizedTransactionID, retries, 5 ), 15*1000 );
			return;
			
		case 3:
						
		case 4:
						
		default:
			var error_text = 'There seems to have been an error initializing or updating your transaction.  Please wait a minute and try again or contact support for assistance.';
			DisplayErrorMessage( error_text );
			return;						
	}
}

var g_nFinalizeWorkingButtonState = 1;
function AnimateFinalizeWorkingButton()
{
	try
	{
				if ( !g_bFinalizeTransactionInProgress && !g_bPollingForTransactionStatus )
			return;
			
		g_nFinalizeWorkingButtonState++;
		if ( g_nFinalizeWorkingButtonState > 3 )
			g_nFinalizeWorkingButtonState = 1;
			
		var append = '';
		if ( g_nFinalizeWorkingButtonState == 1 )
		{
			append = '.';
		}
		else if ( g_nFinalizeWorkingButtonState == 2 ) 
		{
			append = '..';
		}
		else 
		{
			append = '...';
		} 
		
		SetButtonInnerHtml('purchase_button_inprogress_bottom', 'Working'+append );
		
		setTimeout( AnimateFinalizeWorkingButton, 500 );
	}
	catch ( e )
	{
		ReportCheckoutJSError( 'Error animating finalize working button', e );
	}
}


function HandlePollForTransactionStatusFailure()
{
	try
	{
		var method = $('payment_method');

		if ( method.value == 'unionpay' || method.value == 'wechat' || method.value == 'tenpay' )
		{
			DisplayPendingReceiptPage();
			return;
		}
		
		if ( method.value == 'cafefunded' )
		{
			g_winExternal.close();
			g_winExternal = false;
		}

		var error_text = '';
		error_text = 'Your purchase may have been completed, but there was a problem checking on the status of this transaction.  Please check your <a href="http://store.valvesoftware.com/account/">account status page</a> or your email for a confirmation receipt.';
	}
	catch(e)
	{
		ReportCheckoutJSError( 'Failed choosing error string for PollForTransactionStatus failure', e );
	}
		
	
	try 
	{
				if ( error_text != '' )
		{
			DisplayErrorMessage( error_text );
		}
		
				$J('#purchase_button_bottom').hide();
		$J('#purchase_button_inprogress_bottom').hide();
		$J('#purchase_button_disabled_bottom').show();
		$J('#change_payment_method_button_bottom').hide();
		$J('#cancel_button_bottom').show();
	}
	catch( e )
	{
		ReportCheckoutJSError( 'Failed showing error after PollForTransactionStatus failure', e );
	}
}

	
var g_nGetPurchaseStatusCalls = 0;
var g_timeoutPoll = false;
var g_bPollingForTransactionStatus = false;
function PollForTransactionStatus( txnid, retries, timeout )
{
	g_bPollingForTransactionStatus = true;
	
		AnimateFinalizeWorkingButton();
	
		if ( retries < 0 )
	{
		g_bFinalizeTransactionInProgress = false;
		g_timeoutPoll = false;
		HandlePollForTransactionStatusFailure();
		return;
	}
		
	try 
	{
		new Ajax.Request('https://store.steampowered.com/checkout/transactionstatus/',
		{
		    method:'get',
		    parameters: { 
				'count' : ++g_nGetPurchaseStatusCalls,
				'transid' : txnid
			},
		    onSuccess: function(transport)
		    {
				if ( transport.responseText )
				{
					try {
						var result = transport.responseText.evalJSON(true);
			      		} catch ( e ) {
		      							    			g_timeoutPoll = setTimeout( NewPollForTransactionStatusClosure( txnid, retries-1, timeout ), timeout*1000 );
		      				return;
		      			}
		      		
			      					      		var bNeedsApproval = (result.success == 22 && result.purchaseresultdetail == 29);
			      		var bPurchaseResultDelayed = (result.success == 22 && result.purchaseresultdetail == 66);
			      		var bNeedsAuthentication = (result.success == 22 && result.purchaseresultdetail == 86);
			      		if ( result.success == 22 && !bNeedsApproval && !bPurchaseResultDelayed && !bNeedsAuthentication )
		      			{
		      						      				g_timeoutPoll = setTimeout( NewPollForTransactionStatusClosure( txnid, retries-1, timeout ), timeout*1000 );
			      			return;
			      		}
	      		
			      		g_bFinalizeTransactionInProgress = false;
			      		g_bPollingForTransactionStatus = false;
								g_timeoutPoll = false;
					
			      	   				      	   	if ( result.success == 1 || bNeedsApproval )
		      		   	{
		      	   			OnPurchaseSuccess( result );
		      	   			return;
			      	   	}
			      	   	else if ( bPurchaseResultDelayed )
			      	   	{
			      	   		DisplayPendingReceiptPage();
			      	   	}
			      	   	else if ( bNeedsAuthentication )
			      	   	{
			      	   		DisplayCreditCardAuthentication( result.authenticationdetails, txnid, retries-1 );
			      	   		return;
			      	   	}
			      	   	else
			      	   	{
		      		   		var ePaymentMethod = 2;
		      	   			if ( result.purchasereceipt && result.purchasereceipt.paymentmethod )
		      	   				ePaymentMethod = result.purchasereceipt.paymentmethod;
		      	   			
			      	   		HandleFinalizeTransactionFailure( ePaymentMethod, result.purchaseresultdetail, result.bShowBRSpecificCreditCardError, result.errorDescription );
			      	   		return;
			      	   	}
				}
			  	
			  			      		g_bFinalizeTransactionInProgress = false;
			  	g_bPollingForTransactionStatus = false;
				g_timeoutPoll = false;
				HandleFinalizeTransactionFailure( 2, 3, false, '' );
		    },
		    onFailure: function()
			{
						      		g_timeoutPoll = setTimeout( NewPollForTransactionStatusClosure( txnid, retries-1, timeout ), timeout*1000 );
			      	return;
			}
		});
	}
	catch( e ) 
	{
		ReportCheckoutJSError( 'Error submitting TransactionStatus request', e );
	}
}

function NewPollForTransactionStatusClosure( txnid, retries, timeout )
{
	var closure_txnid = txnid;
	var closure_retries = retries;
	var closure_timeout = timeout;
	return function() { PollForTransactionStatus( closure_txnid, closure_retries, closure_timeout ); };
}

var g_LastFinalizedTransactionID = -1;
function FinalizeTransaction()
{
	var method = $('payment_method');
		if ( g_bFinalizeTransactionInProgress || g_timeoutPoll ) 
		return;

		if ( BStoredCreditCardRequiresSecurityCode( method.value ) && $('security_code_cached').value == '' )
	{
		DisplayErrorMessage( 'Please enter your card security code.' );
		ValidationMarkFieldBad( $('security_code_cached' ) );
		return;
	}

		if ( !g_bIsUpdateBillingInfoForm && ( !$('accept_ssa') || !$('accept_ssa').checked ) )
	{
		DisplayErrorMessage( 'You must agree to the terms of the Steam Subscriber Agreement to complete this transaction.' );
		ValidationMarkFieldBad( $('purchase_confirm_ssa') );
		return;
	}
	
	if ( !g_bIsUpdateBillingInfoForm && $('accept_right_withdrawal') && !$('accept_right_withdrawal').checked )
	{
		DisplayErrorMessage( 'You must agree to the terms of your statutory right of withdrawal.' );
		ValidationMarkFieldBad( $('purchase_confirm_right_withdrawal') );
		return;
	}		
	

	 
	if ( $('transaction_id').value == -1 || $('transaction_id').value == '' )
	{
		HandleFinalizeTransactionFailure( 2, 0, false, '' );
		return;
	}
	
		
		g_bFinalizeTransactionInProgress = true;
	
	try
	{
				$J('#purchase_button_bottom').hide();
		$J('#purchase_button_disabled_bottom').hide();
		$J('#purchase_button_inprogress_bottom').show();
		$J('#change_payment_method_button_bottom').hide();
		$J('#cancel_button_bottom').hide();
	}
	catch ( e )
	{
		ReportCheckoutJSError( 'Error disabling buttons during FinalizeTransaction', e );
	}

	try
	{
				setTimeout( AnimateFinalizeWorkingButton, 500 );
	}
	catch ( e )
	{
		ReportCheckoutJSError( 'Error initializing finalize working animation', e );
	}
	
	try 
	{
				g_LastFinalizedTransactionID = $('transaction_id').value;
		$('transaction_id').value = -1;
		
		// Create this here, so its not nested within the onSuccess closure	
		var StatusPollFunc = NewPollForTransactionStatusClosure( g_LastFinalizedTransactionID, 60, 5 );
		
		new Ajax.Request('https://store.steampowered.com/checkout/finalizetransaction/',
		{
		    method:'post',
		    parameters: { 
								'transid' : g_LastFinalizedTransactionID,
				'CardCVV2' : ( BIsStoredCreditCard() ? $('security_code_cached').value : $('security_code').value )
			},
		    onSuccess: function(transport){
				if ( transport.responseText ){
					try {
						var result = transport.responseText.evalJSON(true);
		      		} catch ( e ) {
		      			// Failure
		      			HandleFinalizeTransactionFailure( 2, 3, false, '' );
		      			g_bFinalizeTransactionInProgress = false;
		      			return;
		      		}
		      		
		      				      		var bNeedsApproval = (result.success == 22 && result.purchaseresultdetail == 29);
			      	var bNeedsAuthentication = (result.success == 22 && result.purchaseresultdetail == 86);
		      		if ( result.success == 22 && !bNeedsApproval && !bNeedsAuthentication )
		      		{
		      					      			g_timeoutPoll = setTimeout( StatusPollFunc, 2*1000 );
		      			return;
		      		}
		      		
		      		g_bFinalizeTransactionInProgress = false;
		      	   	// Success...
		      	   	if ( result.success == 1 || bNeedsApproval )
		      	   	{
		      	   		OnPurchaseSuccess( result );
		      	   		return;
		      	   	}
		      	   	else if ( bNeedsAuthentication )
		      	   	{
		      	   		DisplayCreditCardAuthentication(false, g_LastFinalizedTransactionID, 60);
		      	   		return;
		      	   	}
		      	   	else
		      	   	{
		      	   		var ePaymentMethod = 2;
		      	   		if ( result.purchasereceipt && result.purchasereceipt.paymentmethod )
		      	   			ePaymentMethod = result.purchasereceipt.paymentmethod;
		      	   			
		      	   		HandleFinalizeTransactionFailure( ePaymentMethod, result.purchaseresultdetail, result.bShowBRSpecificCreditCardError, result.errorDescription );
		      	   		return;
		      	   	}
			  	}
			  	
			  				  	g_bFinalizeTransactionInProgress = false;
				HandleFinalizeTransactionFailure( 2, 3, false, '' );
		    },
		    onFailure: function(){
								g_bFinalizeTransactionInProgress = false;
				HandleFinalizeTransactionFailure( 2, 3, false, '' );
			}
		});
	}
	catch( e ) 
	{
		ReportCheckoutJSError( 'Error submitting FinalizeTransaction request', e );
	}
}

function SSAPopup()
{
		var win = window.open( 'https://store.steampowered.com/checkout/ssapopup','steam_ssa','width=536,height=546,resize=yes,scrollbars=yes');
	win.focus();
}

function RefundPaymentMethodsPopup()
{
		var win = window.open( 'https://store.steampowered.com/steam_refunds_methods','steam_refund_details','width=1024,height=768');
	win.focus();
}

function HardwareAgreementPopup()
{
		var win = OpenUrlInNewBlankWindow( 'https://store.steampowered.com/hardware_order_terms','steam_hardwareterms' );
	win.focus();
}

function HardwareLimitedWarrantyPopup()
{
		var win = OpenUrlInNewBlankWindow( 'https://support.steampowered.com/kb_article.php?ref=4577-TUJV-6223','steam_limited_warranty_terms' );
	win.focus();
}

function DisplayErrorMessage( strMessage )
{
	$('error_display').innerHTML = strMessage;
	$('error_display').style.display = 'block';
	Effect.ScrollTo( 'error_display' );
	
	new Effect.Highlight( 'error_display', { endcolor : '#000000', startcolor : '#ff9900' } );
}

function ValidationMarkFieldBad( elem )
{
	if ( $(elem) )
	{
		if ( $(elem).hasClassName( 'highlight_on_error' ) )
			new Effect.Morph( elem, {style: 'color: #FF9900', duration: 0.5 } );
		else
			new Effect.Morph( elem, {style: 'border-color: #FF9900', duration: 0.5 } )
	}
}

function ValidationMarkFieldOk( elem )
{
	if ( $(elem) )
	{
		if ( $(elem).hasClassName( 'highlight_on_error' ) )
			$(elem).style.color='';
		else
			$(elem).style.borderColor = '';
	}

}

function UpdateWillBeSentToNote()
{
	var elSentToNote = $('sendgift_willbesentto');
	if ( elSentToNote )
	{
		if ( $( 'send_via_email' ) && $( 'send_via_email' ).checked )
		{
			$('sendto_email').show();
			$('sendto_steamaccount').hide();
			$('sendto_email_value').update( $( 'email_input' ).value );
		}
		else
		{
			$('sendto_email').hide();
			$('sendto_steamaccount').show();
			$('sendto_steamaccount_value').update( currently_selected_friend_name );
			$J('#sendto_steamaccount_value').attr('data-miniprofile', currently_selected_friend_id || '' );
		}
		elSentToNote.show();
	}
}

// could validate we rendered correct timezone with:
// 		parseInt( V_GetCookie( 'timezoneOffset' ) ) * -1 / 60 == (new Date()).getTimezoneOffset()
function GatherScheduledSendFields()
{
	if ( !$J('#cart_send_schedule_options').hasClass( 'schedule_selected' ) )
		return 0;
	
	var year = $J('#schedule_send_year').val();
	var month = $J('#schedule_send_month').val();
	var day = $J('#schedule_send_day').val();

	var rgTimeParse = $J('#schedule_send_time').val().match( /([0-2]?[0-9]) *(?::|h) *([0-5][0-9])/ );
	
	if ( !rgTimeParse )
		return 0;	// should have validated before
	
	var hour = parseInt( rgTimeParse[1] );
	var minute = parseInt( rgTimeParse[2] );
	
	var b24hTime = (  $J('#schedule_send_ampm').length == 0 );
	if ( !b24hTime )
	{
		if ( hour == 12 )
			hour -= 12;	
		if ( $J('#schedule_send_ampm' ).val() == 'pm' )
			hour += 12;
	}

	var d = new Date( year, month - 1, day, hour, minute );
	return d.getTime() / 1000;
}

var g_bSendGiftCallRunning = false;
function SendGift()
{
		if( g_bSendGiftCallRunning )
		return;

	var giftee_account_id = 0;
	var giftee_email = '';
	var giftee_name = '';
	var gift_message = '';
	var gift_sentiment = '';
	var gift_signature = '';
	var gift_scheduled_send = 0;
	var gift_is_reschedule = typeof g_bIsReschedule != 'undefined' && g_bIsReschedule;

	try
	{
				if ( $( 'send_via_email' ) && $( 'send_via_email' ).checked )
		{
			giftee_email = $( 'email_input' ).value;
		}
		else
		{
			giftee_account_id = currently_selected_friend_id;
		}
		giftee_name = $('gift_recipient_name').value;
		gift_message = $('gift_message_text').value;
		gift_sentiment = $('gift_sentiment').value;
		gift_signature = $('gift_signature').value;
		gift_scheduled_send = GatherScheduledSendFields();

		if ( $J('#reschedule_send_now').is(':checked') )
			gift_scheduled_send = 0;

				g_bSendGiftCallRunning = true;

		new Ajax.Request('https://store.steampowered.com/checkout/sendgiftsubmit/',
		{
		    method:'post',
		    parameters: {
				// gift info
				'GifteeAccountID' : giftee_account_id,
				'GifteeEmail' : giftee_email,
				'GifteeName' : giftee_name,
				'GiftMessage' : gift_message,
				'GiftSentiment' : gift_sentiment,
				'GiftSignature' : gift_signature,
				'ScheduledSendOnDate': gift_scheduled_send,
				'GiftGID':		g_gidGift,
				'SessionID':	g_sessionID,
				'IsReschedule':	gift_is_reschedule
			},
		    onSuccess: function(transport){
		    	g_bSendGiftCallRunning = false;
				if ( transport.responseJSON && transport.responseJSON.success )
				{
					var result = transport.responseJSON.success;
			      	   	// Success...
					if ( result == 1 || result == 22 )
					{
						if ( gift_scheduled_send )
							$J('#send_gift_success_msg').html( 'Your gift has been scheduled for delivery' );
						else
							$J('#send_gift_success_msg').html( 'Your gift has been sent' );

						OnSendGiftSuccess( result );
					}
					else
					{
						OnSendGiftFailure( result );
					}
			  	}
				else
				{
										OnSendGiftFailure( 2  );
				}
			},
			onFailure: function()
			{
								g_bSendGiftCallRunning = false;
				OnSendGiftFailure( 3  );
			}
		});
	}
	catch(e)
	{
		ReportCheckoutJSError( 'Failed gathering form data and calling DoSendGift', e );
	}
}


function OnSendGiftSuccess( result )
{
	// show receipt tab
	DisplayReceiptPage();
}

function OnUnsendGiftSuccess( result )
{
	$('send_gift_success').hide();
	$('unsend_gift_success').show();
	DisplayReceiptPage();
}

function OnSendGiftFailure( eresult )
{
	try
	{
		SetTabEnabled( 'gift_recipient' );
		var error_text = 'There seems to have been an error initializing or updating your transaction.  Please wait a minute and try again or contact support for assistance.';

		DisplayErrorMessage( error_text );
	}
	catch (e)
	{
		ReportCheckoutJSError( 'Failed handling OnSendGiftFailure failure', e );
	}
}

function UnsendGift()
{
		if( g_bSendGiftCallRunning )
		return;

	try
	{
				g_bSendGiftCallRunning = true;

		new Ajax.Request('https://store.steampowered.com/checkout/unsendgiftsubmit/',
		{
		    method:'post',
		    parameters: {
				// gift info
				'GiftGID':		g_gidGift,
				'SessionID':	g_sessionID
			},
		    onSuccess: function(transport){
		    	g_bSendGiftCallRunning = false;
				if ( transport.responseJSON && transport.responseJSON.success )
				{
					var result = transport.responseJSON.success;
			      	   	// Success...
			      	   	if ( result == 1 || result == 22 )
			      	   	{
							OnUnsendGiftSuccess( result );
			      	   	}
					else
					{
						OnSendGiftFailure( result );
					}
			  	}
				else
				{
										OnSendGiftFailure( 2  );
				}
			},
			onFailure: function()
			{
								g_bSendGiftCallRunning = false;
				OnSendGiftFailure( 3  );
			}
		});
	}
	catch(e)
	{
		ReportCheckoutJSError( 'Failed gathering form data and calling DoSendGift', e );
	}
}

function ConfirmRescheduleCancel()
{
	ShowConfirmDialog(
		'Cancel sending this gift',
		'Are you sure you want to cancel sending this gift?  If you do cancel, you\'ll receive a full refund.',
		'Yes, cancel and refund',
		'No, don\'t cancel'
	).done( function () {
		UnsendGift();
	});
}


