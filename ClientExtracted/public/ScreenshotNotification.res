"public/ScreenshotNotification.res"
{
	"ScreenshotNotification"
	{
		"ControlName"		"CScreenshotNotification"
		"fieldName"		"ScreenshotNotification"
		"xpos"		"0"
		"ypos"		"0"
		"wide"		"240"
		"tall"		"74"
		"AutoResize"		"0"
		"PinCorner"		"0"
		"visible"		"1"
		"enabled"		"1"
		"tabPosition"		"0"
		"paintbackground"		"1"
		style="Notification"
	}
	
	"ScreenshotImage"
	{
		"ControlName"		"ImagePanel"
		"fieldName"		"ScreenshotImage"
		"xpos"		"14"
		"ypos"		"14"
		"wide"		"48"
		"tall"		"48"
		"AutoResize"		"0"
		"PinCorner"		"0"
		"visible"		"1"
		"enabled"		"1"
		"tabPosition"		"0"
		"paintbackground"		"1"
		"gradientVertical"		"0"
		"scaleImage"		"0"
	}
	
	"LabelInfo"
	{
		"ControlName"		"Label"
		"fieldName"			"LabelInfo"
		"xpos"				"68"
		"ypos"				"32"
		"wide"				"172"
		"tall"				"14"
		"AutoResize"		"0"
		"PinCorner"			"0"
		"visible"			"1"
		"enabled"			"1"
		"tabPosition"		"0"
		"paintbackground"	"1"
		"labelText"			"#Friends_ScreenshotNotification_Info"
		"textAlignment"		"north-west"
		"wrap"				"0"
		"font"				FriendsSmall
		"textcolor"			"Friends.OfflineColor"
	}
	
	"LabelGame"
	{
		"ControlName"		"Label"
		"fieldName"			"LabelGame"
		"xpos"				"68"
		"ypos"				"14"
		"wide"				"172"
		"tall"				"14"
		"AutoResize"		"0"
		"PinCorner"			"0"
		"visible"			"1"
		"enabled"			"1"
		"tabPosition"		"0"
		"paintbackground"	"1"
		"labelText"			"%name%"
		"textAlignment"		"north-west"
		"wrap"				"1"
		"font"				FriendsSmall
		"textcolor"			"Friends.OnlineColor"
	}	
}
