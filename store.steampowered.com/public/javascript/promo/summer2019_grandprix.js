
g_bAjaxinFlight = false;
var g_rtSaleStart = 1561482000;

function ShowJoinTeamDialog()
{
	if ( !g_AccountID )
	{
		// prompt for login
		ShowConfirmDialog( 'Steam Grand Prix',
			'You must login to Steam before you can join the races.',
			'Login'
		).done( function() {
			window.location = 'https://store.steampowered.com/login/?redir=grandprix';
		});

		return;
	}

	var $elContent = $J( '#join_team_dialog' );
	$elContent.show();
	var fnOK = function() { };

	var $modal = _BuildDialog( null, $elContent, [], fnOK, { bExplicitDismissalOnly: false } );
	$modal.SetRemoveContentOnDismissal( false );
	$modal.OnDismiss( function() { $elContent.hide(); } );
	$modal.Show();
}

function JoinTeam()
{
	if ( !$J( '.prix_team_selection.join_team.selected' ).length )
		return;

	var eTeamID = $J( '.prix_team_selection.join_team.selected' ).data( 'teamid' );
	var strTeamName= $J( '.prix_team_selection.join_team.selected' ).data( 'name' );
	var strRawName = $J( '.prix_team_selection.join_team.selected' ).data( 'raw_name' );
	var elThrobber = $J( '#jointeam_throbber' );
	var elJoinButton = $J( '#jointeam_button' );
	var elError = $J( '#prix_jointeam_error' );

	elThrobber.show();
	elJoinButton.hide();
	elError.hide();
	g_bAjaxinFlight = true;
	$J.post(
		'https://store.steampowered.com/grandprix/ajaxjointeam/',
		{ sessionid: g_sessionID, teamid: eTeamID }
	).done( function ( data )
	{
		if ( data.success != 1 )
		{
			elError.show();
		}
		else
		{
			var strWelcome = 'Welcome To<div>Team %1$s</div>'.replace( /%1\$s/g, strTeamName );
			$J( '#welcome_joined_team' ).html( strWelcome );
			$J( '.prix_jointeam_select_ctn' ).hide();
			$J( '.prix_jointeam_joined_ctn' ).show();
			$J( '.prix_jointeam_joined_ctn' ).css( 'background-image', 'url( "https://steamcdn-a.akamaihd.net/store/promo/summer2019/helmet_' + strRawName + '.png?v2" )' );
		}
	}).fail( function()
	{
		elError.show();
	}).always( function()
	{
		elThrobber.hide();
		elJoinButton.show();
		g_bAjaxinFlight = false;
	});
}

function ReloadToSection( strHash )
{
	location.hash = strHash;
	location.reload(true);
}

function ToggleHowTo()
{
	var elArrow = $J( '#prix_howto_link' ).find( 'div' );
	var elHowTo = $J( '.prix_racing_questions_ctn' );
	var bHowToVisible = elHowTo.is( ':visible' );

	V_SetCookie( "bHidePrixHowTo", bHowToVisible ? 1 : 0 , 30 );

	elArrow.removeClass();
	if ( bHowToVisible )
	{
		elHowTo.slideUp();
		elArrow.addClass( 'prix_arrow_up' );
	}
	else
	{
		elHowTo.slideDown();
		elArrow.addClass( 'prix_arrow_down' );
	}
}

function SwitchTeam()
{
	if ( !g_mapConsumables[5] )
	{
		return;
	}

	if ( g_mapConsumables[5].timestamp_expiration < ( Math.floor(Date.now() / 1000) ) )
	{
		return;
	}

	var $dialog = ShowConfirmDialog(  'Confirm Random Team Change',
			'Are you sure you want to randomly change teams and earn %1$s max points? This can only be used once and cannot be undone.'.replace( /%1\$s/g, v_numberformat( 1000 ) ),
			'Change Teams' );

	$dialog.done( function() {
		g_bAjaxinFlight = true;
		$J.post(
			'https://store.steampowered.com/grandprix/ajaxuseconsumable/',
			{ sessionid: g_sessionID, teamid: g_nCurrentTeam, consumable: 5 }
		).done( function ( data )
		{
			if ( data.success != 1 )
			{
				ShowAlertDialog( 'Error', 'We encountered an error when trying to change your team. Please try again.' );
			}
			else
			{
				location.reload();
			}
		}).fail( function()
		{
			ShowAlertDialog( 'Error', 'We encountered an error when trying to change your team. Please try again.' );
		}).always( function()
		{
			g_bAjaxinFlight = false;
		});
	} );

}

function AttackTeam( eTeamEventConsumable )
{
	if ( !eTeamEventConsumable || !g_mapConsumables[eTeamEventConsumable] )
		return;

	if ( !$J( '.prix_attackcard_ctn.selected' ).length )
		return;

	$J( '.prix_attackcard_ctn' ).removeClass( 'prix_shake_animation' );
	var eTeamID = $J( '.prix_attackcard_ctn.selected' ).data( 'teamid' );

	g_bAjaxinFlight = true;
	$J.post(
		'https://store.steampowered.com/grandprix/ajaxuseconsumable/',
		{ sessionid: g_sessionID, teamid: eTeamID, consumable: eTeamEventConsumable }
	).done( function ( data )
	{
		if ( data.success != 1 )
		{
			ShowAlertDialog( 'Error', 'We encountered an issue while attacking that team. Please try again later.' );
		}
		else
		{
			g_mapConsumables[eTeamEventConsumable].quantity--;

			var strClassType ='attack';
			if ( eTeamEventConsumable == 4 )
			{
				strClassType = 'steal';
			}

			var elAttackContainer = $J( '.prix_action_ctn.' + strClassType );
			var elBtnContainer = $J( '.prix_action_btn.' + strClassType );
			if ( g_mapConsumables[eTeamEventConsumable].quantity == 0 )
			{
				elAttackContainer.removeClass( 'enabled' );
				elBtnContainer.removeClass( 'enabled' );
				elAttackContainer.addClass( 'disabled' );
				elBtnContainer.addClass( 'disabled' );

				delete g_mapConsumables[eTeamEventConsumable];
			}

			if ( $J.isEmptyObject( g_mapConsumables[ 4 ] ) &&  $J.isEmptyObject( g_mapConsumables[ 1 ] ) )
			{
				$J( '.prix_attackteam_selection' ).removeClass( 'enabled' );
				$J( '.prix_attackcard_ctn ' ).removeClass( 'enabled' );
				$J( '.prix_attackteam_selection' ).addClass( 'disabled' );
				$J( '.prix_attackcard_ctn ' ).addClass( 'disabled' );
			}

			$J( '.prix_attackcard_ctn.selected' ).addClass( 'prix_shake_animation' );
			elAttackContainer.find( '.prix_action_subtext2 span'  ).text( !g_mapConsumables[eTeamEventConsumable] ? 0 : g_mapConsumables[eTeamEventConsumable].quantity );

			setTimeout(function() {
				$J( '.prix_attackcard_ctn' ).removeClass( 'selected' );
				$J( '.prix_attackcard_ctn' ).removeClass( 'prix_shake_animation' );
			}, 5000);

		}
	}).fail( function()
	{
		ShowAlertDialog( 'Error', 'We encountered an issue while attacking that team. Please try again later.' );
	}).always( function()
	{
		g_bAjaxinFlight = false;
	});
}

function BoostTeam()
{
	if ( !g_nCurrentPoints )
		return;

	g_bAjaxinFlight = true;
	$J.post(
		'https://store.steampowered.com/grandprix/ajaxboostteam/',
		{ sessionid: g_sessionID }
	).done( function ( data )
	{
		if ( data.success != 1 )
		{
			ShowAlertDialog( 'Error', 'We encountered an issue while boosting your team. Please try again later.' );
		}
		else
		{
			var strImageSrc = 'https://steamcdn-a.akamaihd.net/store/promo/summer2019/button_boost_default.png';
			var strDialog = '<div class="prix_dialog_ctn">';
			var strDialogDesc = '<div class="prix_dialog_content">';
			strDialogDesc += '<div class="prix_consumable_drop" >' + 'Nice work, ace. You\'ve boosted your team\'s distance and speed in the race.' + '</div>';
			if ( data.granted_consumables.length > 0 )
			{
				if ( data.granted_consumables.length == 2 )
				{
					strImageSrc = "https://steamcdn-a.akamaihd.net/store/promo/summer2019/button_attack_both_granted.png";
					strDialogDesc += '<div class="prix_consumable_drop" >' + 'You\'ve also been randomly awarded a Steal Progress Attack! You can use this to steal boost progress from another team and apply it to your team' + '</div>';
					strDialogDesc += '<div class="prix_consumable_drop" >' + 'You\'ve also been randomly awarded a Slow Down Attack! You can use this to slow down another team of your choice.' + '</div>';
				}
				else
				{
					for (var i = 0; i < data.granted_consumables.length; i++)
					{
						if (data.granted_consumables[i].type == 4 )
						{
							strImageSrc = 'https://steamcdn-a.akamaihd.net/store/promo/summer2019/button_setback_attack.png';
							strDialogDesc += '<div class="prix_consumable_drop" >' + 'You\'ve also been randomly awarded a Steal Progress Attack! You can use this to steal boost progress from another team and apply it to your team' + '</div>';

						}
						else if (data.granted_consumables[i].type == 1 )
						{
							strImageSrc = 'https://steamcdn-a.akamaihd.net/store/promo/summer2019/random_drop_attack.png';
							strDialogDesc += '<div class="prix_consumable_drop" >' + 'You\'ve also been randomly awarded a Slow Down Attack! You can use this to slow down another team of your choice.' + '</div>';
						}
					}
				}
			}
			strDialogDesc += '<div class="prix_consumable_drop" >' + 'Head to the Pit Stop to redeem your shiny new Grand Prix tokens for rewards, or return to the race to complete Quests and continue to boost your way to the finish.' + '</div>';
			strDialogDesc += '</div>'
			strDialog += '<img src="' + strImageSrc +'">';
			strDialog += strDialogDesc;
			strDialog += '</div>';

			ShowConfirmDialog( 'BOOOOOOST!',
				strDialog,
				'Make a Pit Stop...',
				'Return to Race'  )
			.done( function() {
				window.location = 'https://store.steampowered.com/pitstop';
			} )
			.fail( function() { location.reload(); } );
		}
	}).fail( function()
	{
		ShowAlertDialog( 'Error', 'We encountered an issue while boosting your team. Please try again later.' );
	}).always( function()
	{
		g_bAjaxinFlight = false;
	});
}

function FailedToUpdateQuests( $elQuestCtn, unAppId )
{
	// TODO: impl
}

function UpdateQuestsWithData( $elQuestCtn, unAppId, data )
{
	var rgApp = GStoreItemData.rgAppData[ unAppId ];
	$elQuestCtn.find('.prix_quest_appname').text( rgApp['name'] );

	var $elQuestList = $elQuestCtn.find('.prix_quest_questlist');
	$elQuestList.empty();
	for ( var key in data.progress.stats )
	{
		if ( !data.progress.stats.hasOwnProperty( key ) )
			continue;

		$elQuest = $J('<div class="prix_quest"><div class="prix_quest_points"></div><div class="prix_quest_name"></div><div class="prix_quest_completed"></div></div>');
		$elQuest.find('.prix_quest_points').text( '%1$s points each'.replace( /%1\$s/g, data.progress.stats[key].points_each ) );
		$elQuest.find('.prix_quest_name').text( data.progress.stats[key].name );
		$elQuest.find('.prix_quest_completed').text( '%1$s completed'.replace( /%1\$s/g, data.progress.stats[key].completed ) );

		if ( data.progress.stats[key].name.length >= 25 )
		{
			$elQuest.find('.prix_quest_name').attr('title', data.progress.stats[key].name );
		}

		$elQuestList.append( $elQuest );
	}

	if ( data.progress.achievements_summary.num_achievements_completed != 0 &&
	     data.progress.achievements_summary.num_achievements_total != 0 &&
	     data.progress.achievements_summary.num_achievement_points != 0 )
	{
		$elQuest = $J('<div class="prix_quest"><div class="prix_quest_points"></div><div class="prix_quest_name"></div><div class="prix_quest_completed"></div></div>');
		$elQuest.find('.prix_quest_points').text( '%1$s points total'.replace( /%1\$s/g, v_numberformat( data.progress.achievements_summary.num_achievement_points ) ) );
		$elQuest.find('.prix_quest_name').text( 'Achievements Summary' );
		var strCompletedText = '%1$s / %2$s completed for points';
		strCompletedText = strCompletedText.replace( /%1\$s/g, data.progress.achievements_summary.num_achievements_completed );
		strCompletedText = strCompletedText.replace( /%2\$s/g, data.progress.achievements_summary.num_achievements_total )
		$elQuest.find('.prix_quest_completed').text( strCompletedText );

		$elQuestList.append( $elQuest );
	}
}

function UpdateQuests( $elQuestCtn, unAppId )
{
	$J.get(
		'https://store.steampowered.com/grandprix/ajaxgetappquestprogress/',
		{ sessionid: g_sessionID, appid: unAppId }
	).done( function( data ) {
		if ( data.success != 1 )
		{
			FailedToUpdateQuests( $elQuestCtn, unAppId );
			return;
		}

		UpdateQuestsWithData( $elQuestCtn, unAppId, data );
	}).fail( function() {
		FailedToUpdateQuests( $elQuestCtn, unAppId );
	});
}

function UpdateOwnedGameQuest( $Item )
{
	var $elQuestCtn = $J( '#own_quest_ctn' );
	UpdateQuests( $elQuestCtn, $Item.data( 'appid' ) );
}

function UpdateSaleGameQuest( $Item )
{
	var $elQuestCtn = $J( '#sale_quest_ctn' );
	UpdateQuests( $elQuestCtn, $Item.data( 'appid' ) );
}

function UpdatePastAchievementGameQuest( $Item )
{
	var $elQuestCtn = $J( '#past_achievement_quest_ctn' );
	UpdatePastAchievementWithData( $elQuestCtn, $Item.data( 'appid' ), g_rgAppPoints );
}

function UpdatePastAchievementWithData( $elQuestCtn, unAppId, data )
{
	var rgApp = GStoreItemData.rgAppData[ unAppId ];
	$elQuestCtn.find('.prix_quest_appname').text( rgApp ? rgApp['name'] : '' );

	var achievementData = false;
	for ( var key in data )
	{
		if ( unAppId == key )
		{
			achievementData = data[key];
		}
	}
	
	var $elQuestList = $elQuestCtn.find('.prix_quest_questlist');
	$elQuestList.empty();
	if ( achievementData )
	{
		var $elAchievement = $J('<div class="prix_achievement"><div class="prix_achievement_points"></div><div class="prix_achievement_name"></div><div class="prix_achievements_completed"></div><div class="prix_claim_achievement_points"></div></div>');
		$elAchievement.find('.prix_achievement_name').text( '%1$s points earned'.replace( /%1\$s/g, achievementData.total_points ) );
		$elAchievement.find('.prix_achievements_completed').text( '%1$s completed'.replace( /%1\$s/g, achievementData.num_achievements ) );

		$elQuestList.append( $elAchievement );
		
		$elAchievement.find('.prix_claim_achievement_points').hide();
		var nMeterPointsAvailable = Math.max( g_nBoostBankCapacity - g_nCurrentPoints, 0 );
		
		if ( g_nCurrentTeam == 0 )
		{
			var $elQuest = $J('<div class="prix_achievement_detail"><div class="prix_achievement_points">&nbsp;</div><div class="prix_achievement_name_warning"></div><div class="prix_achievements_overflow_description"></div></div>');
			$elQuest.find('.prix_achievement_name_warning').text( 'Join a team!' );
			$elQuest.find('.prix_achievements_overflow_description').text( 'You must first join a team before you can claim your points' );
			$elQuestList.append( $elQuest );		
		}
		else if ( nMeterPointsAvailable == 0 )
		{
			var $elQuest = $J('<div class="prix_achievement_detail"><div class="prix_achievement_points">&nbsp;</div><div class="prix_achievement_name_warning"></div><div class="prix_achievements_overflow_description"></div></div>');
			$elQuest.find('.prix_achievement_name_warning').text( 'You already reached your max points' );
			$elQuest.find('.prix_achievements_overflow_description').text( 'Upgrade your maximum points or wait until tomorrow to claim your points' );
			
			$elQuestList.append( $elQuest );		
		}
		// no more points from past achievements
		else if ( achievementData.total_points == 0 )
		{
			var $elQuest = $J('<div class="prix_achievement_detail"><div class="prix_achievement_points">&nbsp;</div><div class="prix_achievement_name_warning"></div><div class="prix_achievements_overflow_description info"></div></div>');

			// earned everything?
			if ( achievementData.total_achievements == achievementData.num_earned_achievements )
			{
				$elAchievement.find('.prix_achievement_name').text( '%1$s points earned'.replace( /%1\$s/g, v_numberformat( achievementData.earned_points ) ) );
				$elAchievement.find('.prix_achievements_completed').text( '%1$s completed'.replace( /%1\$s/g, v_numberformat( achievementData.num_earned_achievements ) ) );

				$elQuest.find('.prix_achievement_name_warning').text( 'All Done!' );
				$elQuest.find('.prix_achievements_overflow_description').text( 'You\'ve completed all the achievements for this game.' );
			}
			else
			{
				$elQuest.find('.prix_achievement_name_warning').text( 'More to Go' );

				$elAchievement.find('.prix_achievement_name').text( '%1$s points earned'.replace( /%1\$s/g, v_numberformat( achievementData.earned_points ) ) );
				$elAchievement.find('.prix_achievements_completed').text( '%1$s completed'.replace( /%1\$s/g, v_numberformat( achievementData.num_earned_achievements ) ) );

				var strCompletedText = 'You\'ve completed %1$s / %2$s achievements for points in the Steam Grand Prix. You can earn more points for each achievement you unlock. The more rare the achievement, the more points it\'s worth!';
				strCompletedText = strCompletedText.replace( /%1\$s/g, v_numberformat( achievementData.num_earned_achievements ) );
				strCompletedText = strCompletedText.replace( /%2\$s/g, v_numberformat( achievementData.total_achievements ) );
				$elQuest.find('.prix_achievements_overflow_description').text( strCompletedText );
			}

			$elQuestList.append( $elQuest );
		}
		// can claim points for past achievements
		else
		{
			$elAchievement.find('.prix_claim_achievement_points').show();
			$elAchievement.find('.prix_claim_achievement_points').click( function() { ClaimPastAchievement(unAppId ) } );

			if ( nMeterPointsAvailable < achievementData.total_points )
			{
				var $elQuest = $J('<div class="prix_achievement_detail"><div class="prix_achievement_points">&nbsp;</div><div class="prix_achievement_name"></div><div class="prix_achievements_overflow_description prix_overflow_1"></div><div class="prix_achievements_overflow_description prix_overflow_2"></div></div>');
				$elQuest.find('.prix_achievement_name').text( 'Claim %1$s/%2$s Points Now'.replace( /%1\$s/g, nMeterPointsAvailable ).replace( /%2\$s/g, achievementData.total_points ) );
				$elQuest.find('.prix_overflow_1').text( 'You can only claim %1$s points more before reaching your max'.replace( /%1\$s/g, nMeterPointsAvailable ) );
				$elQuest.find('.prix_overflow_2').text( 'Any extra achievements will still be available to redeem later, you won\'t lose any points!.'.replace( /%1\$s/g, achievementData.total_points - nMeterPointsAvailable ) );
					
				$elQuestList.append( $elQuest );		
			}
			else
			{
				var $elQuest = $J('<div class="prix_achievement_detail"><div class="prix_achievement_points">&nbsp;</div><div class="prix_achievement_name"></div><div class="prix_achievements_completed">&nbsp;</div></div></div>');
				$elQuest.find('.prix_achievement_name').text( 'Claim %1$s Points Now'.replace( /%1\$s/g, achievementData.total_points ) );
				$elQuestList.append( $elQuest );
			}
		}
	}
	else
	{
		return;
	}
}

function ClaimPastAchievement( unAppId )
{
	g_bAjaxinFlight = true;
	$J.post(
		'https://store.steampowered.com/grandprix/ajaxclaimpointsforpastachievements/',
		{ sessionid: g_sessionID, appid: unAppId }
	).done( function ( data )
	{
		if ( data.success != 1 )
		{
			ShowAlertDialog( 'Error', 'We encountered an issue while claiming your achievement points. Please try again later.' );
		}
		else
		{
		  window.location = '?' + unAppId + '#boost';
		}
	}).fail( function()
	{
		ShowAlertDialog( 'Error', 'We encountered an issue while claiming your achievement points. Please try again later.' );
	}).always( function()
	{
		g_bAjaxinFlight = false;
	});	
}

function UpdateTeamScoresWithData( data )
{
	if ( data.sale_day != g_nSaleDay )
	{
		// Close everyone's socket over the next minute
		if ( !g_bWaitingOnWebSocketRetry )
		{
			var cmsClose = Math.floor( Math.random() * 60000 );
			g_bWaitingOnWebSocketRetry = true;
			setTimeout( function() { g_sockTeamScores.close(); }, cmsClose );
		}

		return;
	}

	var cminDayStart = ((data.current_time - g_rtSaleStart) / 60) % 1440;

	
	var rgScoresByTeamId = [];
	var flMaxMult = 1;
	var flMinAdjScorePercent = 1;
	var flMaxAdjScorePercent = 0;
	var flAvgScorePercent = 0;
	for ( var i = 0; i < data.scores.length; i++ )
	{
		var oTeamScore = data.scores[i];
		rgScoresByTeamId[oTeamScore.teamid] = oTeamScore.score_pct;

		var flMult = parseFloat( oTeamScore.current_multiplier_boosts || 1 );
		if ( flMult > flMaxMult )
			flMaxMult = flMult;

		var flScorePercent = parseFloat( oTeamScore.score_pct );
		flAvgScorePercent += flScorePercent;

		var flAdjustedScorePercent = (cminDayStart/1440) * (flScorePercent);
		data.scores[i].score_pct_adj = flAdjustedScorePercent;

		if ( flAdjustedScorePercent < flMinAdjScorePercent )
		{
			flMinAdjScorePercent = flAdjustedScorePercent;
		}

		if ( flAdjustedScorePercent > flMaxAdjScorePercent )
		{
			flMaxAdjScorePercent = flAdjustedScorePercent;
		}
	}

	flAvgScorePercent /= data.scores.length;

	// Update leaderboard (prix_header_teams_ctn)
	var $elStandings = $J( '.prix_header_teams_ctn .prix_standing ' );
	$elStandings.detach().sort( function( a, b ) {
		// "Today's standings" text always first
		if ( $J(a).hasClass('prix_current_standings') )
			return -1;
		if ( $J(b).hasClass('prix_current_standings') )
			return 1;

		return rgScoresByTeamId[$J(a).data('teamid')] - rgScoresByTeamId[$J(b).data('teamid')];
	} );

	$J( '.prix_header_teams_ctn' ).append( $elStandings );

	$elStandings.find('img').hide();
	$elStandings.removeClass( 'prix_winning_standing' );

	var nRank = $elStandings.length;
	$elStandings.each( function() {
		$J(this).find('.team_standing').text( nRank );

		// Show leader's image
		if ( nRank == 1 )
		{
			if ( !window.UseSmallScreenMode() )
				$J(this).find('img').show();
			$J(this).addClass( 'prix_winning_standing' );
		}

		nRank--;
	} );

	var bFinishLineInSight = cminDayStart > 1380;
	//bFinishLineInSight = true;
	var flZoomMin = flMinAdjScorePercent;
	var flZoomMax = bFinishLineInSight ? 1 : flMaxAdjScorePercent;

	var flDisplayMin = 15;
	var flDisplayMax = bFinishLineInSight ? 96.5 : 85;
	var flDisplayRange = flDisplayMax - flDisplayMin;

	
	// Place the checkpoints, two per hour
	
	if ( bFinishLineInSight )
	{
		$J( '.prix_finishline_img' ).show();
		$J( '.prix_raceboard_teams_ctn' ).css( 'border-image-slice', '0 100%' );
	}
	else
	{
		$J( '.prix_finishline_img' ).hide();
		$J( '.prix_raceboard_teams_ctn' ).css( 'border-image-slice', '0' );
	}

	for ( var i = 0; i < data.scores.length; i++ )
	{
		var oTeamScore = data.scores[i];
		var flScorePercent = parseFloat( oTeamScore.score_pct );
		var flAdjustedScorePercent = (cminDayStart/1440) * (flScorePercent);


		var flZoomedScorePercent = (((flAdjustedScorePercent-flZoomMin)/(flZoomMax-flZoomMin)) * flDisplayRange) + flDisplayMin;
		var flMult = parseFloat( oTeamScore.current_multiplier_boosts || 1 );

		var $elStandingBar = $J( '.prix_standing_bar.team_' + oTeamScore.teamid );
		$elStandingBar.css( 'width', flZoomedScorePercent.toFixed( 2 ) + '%' );

		
		if ( oTeamScore.score_dist )
		{
			$elStandingBar.find( '.prix_standing_bar_score' ).text( parseFloat(oTeamScore.score_dist).toFixed( 2 ) + 'km' );
		}


		var strDeboostsFormatted = '';
		if ( oTeamScore.current_active_deboosts )
		{
			if ( oTeamScore.current_active_deboosts >= 10000 )
			{
				strDeboostsFormatted = '-' + parseInt( oTeamScore.current_active_deboosts / 100 ).toLocaleString() + 'x';
			}
			else
			{
				strDeboostsFormatted = '-' + ( parseFloat( oTeamScore.current_active_deboosts ) / 100 ).toFixed( 2 ).replace( /^0+/, '' ) + 'x';
			}
		}

		var $elAttackCard = $J( '.prix_attackcard_ctn.team_' + oTeamScore.teamid );
		$elAttackCard.find( '.prix_attackteam_deboost' ).text( strDeboostsFormatted );

		var $elMeter = null;
		if ( g_nCurrentTeam == oTeamScore.teamid )
		{
			$elMeter = $J( '.prix_currentboost_ctn .prix_boostmeter_value' );
		}
		else
		{
			$elMeter = $elAttackCard.find( '.prix_boostmeter_value' );
		}

		$elMeter.css( 'width', ((Math.sqrt( flMult ) / Math.sqrt( flMaxMult )) * 100).toFixed( 2 ) + '%' );

		if ( flMult >= 10000 )
		{
			$elMeter.text( parseInt( flMult ).toLocaleString() );
		}
		else if ( flMult >= 1000 )
		{
			$elMeter.text( parseInt( flMult ).toLocaleString() + 'x' );
		}
		else
		{
			$elMeter.text( flMult.toFixed( 1 ) + 'x' );
		}

		if ( g_nCurrentTeam == oTeamScore.teamid )
		{
			$J( '.prix_playerboost_team_attack' ).text( strDeboostsFormatted || 0 );

			var nActiveBoosts = parseInt(oTeamScore.current_active_boosts) - parseInt(oTeamScore.current_active_deboosts) || 0;
			var nNextTier = ( 100 * ( ( nActiveBoosts / 100 ) + 1 ) );

			var $elCurrentTeam = $J( '.prix_standing_currentteam' );
			if ( flZoomedScorePercent >= 80 )
			{
				$elCurrentTeam.hide();
			}
			else
			{
				$elCurrentTeam.show();
			}

		}
	}
}

var g_bWaitingOnWebSocketRetry = false;
var g_sockTeamScores = null;
function SubscribeToTeamScoreUpdates()
{
	g_bWaitingOnWebSocketRetry = false;
	if ( !("WebSocket" in window) )
	{
		console.log( "No web socket support" );
		return;
	}

	g_sockTeamScores = new WebSocket( "wss:\/\/community.steam-api.com\/websocket\/" );

	g_sockTeamScores.onopen = function() {
		var subscribe = { message: "subscribe", seqnum: 1, feed: "TeamEventScores" };
		g_sockTeamScores.send( JSON.stringify( subscribe )  );
	};

	g_sockTeamScores.onerror = function() {
		var cmsRetry = 90000 + Math.floor(Math.random() * 60000);
		console.log( "WebSocket error. Retry in " + cmsRetry + "ms." );
		try
		{
			g_sockTeamScores.close();
		}
		catch ( exception )
		{
		}

		if ( !g_bWaitingOnWebSocketRetry )
		{
			g_bWaitingOnWebSocketRetry = true;
			setTimeout( SubscribeToTeamScoreUpdates, cmsRetry );
		}
	};

	g_sockTeamScores.onclose = function() {
		if ( !g_bWaitingOnWebSocketRetry )
		{
			g_bWaitingOnWebSocketRetry = true;

			var cmsRetry = 90000 + Math.floor(Math.random() * 60000);
			console.log( "WebSocket closed. Retry in " + cmsRetry + "ms." );
			setTimeout( SubscribeToTeamScoreUpdates, cmsRetry );
		}
	};

	g_sockTeamScores.onmessage = function( oMessage ) {
		var data = $J.parseJSON( oMessage.data );
		if ( data && data.message && data.message == "feedupdate" )
		{
			if ( data.feed == "TeamEventScores" )
			{
				var feed = $J.parseJSON( data.data );
				if ( !feed || !feed.scores )
				{
					return;
				}

				UpdateTeamScoresWithData( feed );
			}
		}
	};
}
