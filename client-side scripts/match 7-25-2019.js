/* 

Copyright 2019 Andras Molnar

Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
and associated documentation files (the "Software"), to deal in the Software without 
restriction, including without limitation the rights to use, copy, modify, merge, publish, 
distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the 
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or 
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING 
BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

The licensee undertakes to mention the name SMARTRIQS, the name of the licensor (Andras Molnar) 
and to cite the following article in all publications in which results of experiments conducted 
with the Software are published: Molnar, A. (2019). “SMARTRIQS: A Simple Method Allowing 
Real-Time Respondent Interaction in Qualtrics Surveys". Retrieved from https://smartriqs.com

*/

Qualtrics.SurveyEngine.addOnload(function()
{
var page = this; page.hideNextButton();				
console.log("Begin MATCH");

// Get DOM elements
var infoBox = document.getElementById("infoBox");

// Get parameters from Qualtrics
if ("${e://Field/serverURL}" == false) {
	var serverURL = "https://server.smartriqs.com/php";
	console.log("Default server");
} 
else{	// use custom server URL if serverURL is defined in Qualtrics
	var serverURL = "${e://Field/serverURL}";
	console.log("Custom server: " + serverURL);
}	
var maxWaitTime 	= parseInt(Qualtrics.SurveyEngine.getEmbeddedData("maxWaitTime"));	
	if (maxWaitTime > 600 || maxWaitTime < 30 || isNaN(maxWaitTime)) 	{maxWaitTime = 180;} // use default if too high or too low
var freezeTime 		= parseInt(Qualtrics.SurveyEngine.getEmbeddedData("freezeTime"));
	if (freezeTime > 30 || freezeTime < 1 	|| isNaN(freezeTime)) 		{freezeTime = 3;}	// use default if too high or too low
var dropInactivePlayers = parseInt(Qualtrics.SurveyEngine.getEmbeddedData("dropInactivePlayers"));
	if (dropInactivePlayers > 60 || dropInactivePlayers < 3	|| isNaN(dropInactivePlayers)) {dropInactivePlayers = 10;}	// use default if too high or too low
var botMatch 		= Qualtrics.SurveyEngine.getEmbeddedData("botMatch");
	if (botMatch != "yes"){botMatch = "no";}

if ("${e://Field/terminateText}" == false){
	var terminateText = "The survey has been terminated. Please contact the researcher to receive partial compensation for your participation.";
}
else{
	var terminateText = "${e://Field/terminateText}";
	console.log("Terminate text set manually: " + terminateText);
}

// This is an experimental feature, not included in the documentation
	
	// Toggle match alert ON / OFF		
	
if ("${e://Field/matchAlert}" == "yes"){
	var matchAlert = 1;
	var pageTitle = document.getElementsByTagName("title")[0]; // Grab page title element
	var oldTitle = pageTitle.innerHTML; // Save old title
	var alertUpdateInterval = 1000;
	var alertDummy = 1;
	console.log("Match alert turned ON");
}
else {
	var matchAlert = 0;
	console.log("Match alert turned OFF");
}

	
function updateAlert() {
setTimeout(function () {
	//console.log(alertDummy + " updated version 3");	
 	if (alertDummy % 2 === 0 ) {		pageTitle.innerHTML = "&#9989; MATCHED! &#9989;"; 	} 
	else {		pageTitle.innerHTML = "&#10004; MATCHED! &#10004;";	}
	
	
	
	if (alertDummy < 10) {alertDummy++; updateAlert();}
	//console.log(alertDummy);
	
    },  alertUpdateInterval);
}	
	
	
// end of experimental section
	
	
	
console.log("Max wait time = " + maxWaitTime + "s | Freeze time = " + freezeTime + "s | Drop inactive = " + dropInactivePlayers + "s | BOT match = " + botMatch);

// Initiate variables
var timeOut 		= "no";
var attemptCount 	= 1;
var errorCount 		= 0;
var status 			= "";
var request 		= new httpRequest();
request.method 		= "GET";

attemptMatch();


// Function that attempt matching
function attemptMatch() {
	setTimeout(function () {
		makeRequest();
		console.log("Attempt = " + attemptCount + " | Status = " + status);
		if (attemptCount == maxWaitTime) {timeOut = "yes";}
		if (status == "matched" && attemptCount >= freezeTime){	
			console.log("End MATCH");

			if (bots.length < 1){
				console.log("Matched with other participant(s)");
				if (matchAlert == 1) {
					updateAlert();
					// alert("Successfully matched!");
				}
				
				if (Qualtrics.SurveyEngine.getEmbeddedData("groupSize") == 2){
					infoBox.innerHTML = "You have been successfully matched with another participant.";
				}
				else{
					infoBox.innerHTML = "You have been successfully matched with " + (Qualtrics.SurveyEngine.getEmbeddedData("groupSize") - 1) + " other participants.";
				}
				setTimeout(function () {page.showNextButton();}, 1000 * freezeTime);
			}
			else{
				if (botMatch == "yes"){
					console.log("Matched with BOT(s)");
					if (matchAlert == 1) {
						updateAlert();
						// alert("Matched with BOT(s).");
					}
					
					botArray = bots.split(",");	
					numBots = botArray.length;
					if (Qualtrics.SurveyEngine.getEmbeddedData("groupSize") == 2){
						infoBox.innerHTML = "Unfortunately, there is no one else available.<br><br>You have been matched with a BOT.";
					}
					else{
						infoBox.innerHTML = "Unfortunately, there are not enough other participants available.<br><br>You have been matched with " + (Qualtrics.SurveyEngine.getEmbeddedData("groupSize") - 1 - numBots) + " other participant(s) and " + numBots + " BOT(s).";
					}
					setTimeout(function () {page.showNextButton();}, 1000 * freezeTime);
				}
				else {
					console.log("No available participant -- Survey terminated");
					if (matchAlert == 1) {alert("Survey terminated.");}
					
					infoBox.innerHTML = "Unfortunately, there are not enough other participants available.<br><br>" + terminateText;
					Qualtrics.SurveyEngine.setEmbeddedData( "timeOutLog", "No available participant -- Survey terminated" );
					setTimeout(function () {page.showNextButton();}, 2000 * freezeTime);
				}
			}
		}
		else {
		// Check if there was any error. If yes, display and stop matching
			if (status.includes("ERROR") == true){	infoBox.innerHTML = status;} 
			else{attemptCount++;	attemptMatch(); } // Otherwise, keep trying to match
		}
	},  1000);
}


// Function that sends data to server
function makeRequest() {
	request.url = serverURL + "/match.php" +
	"?researcherID=" 			+	Qualtrics.SurveyEngine.getEmbeddedData("researcherID") + 
	"&studyID=" 				+	Qualtrics.SurveyEngine.getEmbeddedData("studyID") +
	"&participantID=" 			+ 	Qualtrics.SurveyEngine.getEmbeddedData("participantID") + 
	"&groupSize=" 				+ 	Qualtrics.SurveyEngine.getEmbeddedData("groupSize")  + 
	"&numStages=" 				+ 	Qualtrics.SurveyEngine.getEmbeddedData("numStages") + 
	"&conditions=" 				+ 	Qualtrics.SurveyEngine.getEmbeddedData("conditions") + 
	"&participantCondition="	+ 	Qualtrics.SurveyEngine.getEmbeddedData("participantCondition") + 
	"&roles=" 					+ 	Qualtrics.SurveyEngine.getEmbeddedData("roles") + 
	"&participantRole=" 		+ 	Qualtrics.SurveyEngine.getEmbeddedData("participantRole") + 
	"&timeZone=" 				+ 	Qualtrics.SurveyEngine.getEmbeddedData("timeZone") +
	"&dropInactivePlayers=" 	+ 	dropInactivePlayers + 
	"&timeOut=" 				+ 	timeOut + 
	"&timeOutLog=" 				+ 	String(Qualtrics.SurveyEngine.getEmbeddedData("timeOutLog"));
	
	console.log("Request made");
	
	// Create callback for success containing the response
	request.success = function(response)
	{
		console.log("Request success!");
		var resp = response;
		var parser = new DOMParser()
		var parsed = parser.parseFromString(resp,"text/html");
		status = 				parsed.getElementsByTagName("status")[0].innerHTML;
		groupID = 				parsed.getElementsByTagName("groupID")[0].innerHTML;
		participantCondition = 	parsed.getElementsByTagName("participantCondition")[0].innerHTML;
		participantRole = 		parsed.getElementsByTagName("participantRole")[0].innerHTML;
		openSpots = 			parsed.getElementsByTagName("openSpots")[0].innerHTML;
		bots =		 			parsed.getElementsByTagName("bots")[0].innerHTML;
		errorCount = 			parsed.getElementsByTagName("errorCount")[0].innerHTML;
		timeOutLog = 			parsed.getElementsByTagName("timeOutLog")[0].innerHTML;

		// Save retrieved values to Qualtrics
		Qualtrics.SurveyEngine.setEmbeddedData( 'groupID', 				groupID );
		Qualtrics.SurveyEngine.setEmbeddedData( 'participantCondition', participantCondition );
		Qualtrics.SurveyEngine.setEmbeddedData( 'participantRole', 		participantRole );	
		Qualtrics.SurveyEngine.setEmbeddedData( 'timeOutLog', 			timeOutLog );	
	
		// Update "waiting for ... participants" message
		document.getElementById("openSpots").innerHTML 	= openSpots;
	};

	// Create a fail callback containing the error
	request.fail = function(error){console.log(error);};

	// Send request
	request.send();
}


// HTTP request (AJAX)
function httpRequest()
{
    var ajax = null,
        response = null,
        self = this;

    this.method = null;
    this.url = null;
    this.async = true;
    this.data = null;

    this.send = function()
    {
        ajax.open(this.method, this.url, this.asnyc);
        ajax.send(this.data);
    };

    if(window.XMLHttpRequest)
    {
        ajax = new XMLHttpRequest();
    }
    else if(window.ActiveXObject)
    {
        try
        {
            ajax = new ActiveXObject("Msxml2.XMLHTTP.6.0");
        }
        catch(e)
        {
            try
            {
                ajax = new ActiveXObject("Msxml2.XMLHTTP.3.0");
            }
            catch(ee)
            {
                self.fail("not supported");
            }
        }
    }

    if(ajax == null)
    {
        return false;
    }

    ajax.onreadystatechange = function()
    {
        if(this.readyState == 4)
        {
            if(this.status == 200)
            {
                self.success(this.responseText);
            }
            else
            {
                self.fail(this.status + " - " + this.statusText);
            }
        }
    };
}


});
