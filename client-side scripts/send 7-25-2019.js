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
with the Software are published:

Molnar, A. (2019). 
“SMARTRIQS: A Simple Method Allowing Real-Time Respondent Interaction in Qualtrics Surveys". 
Journal of Behavioral and Experimental Finance, 22, 161-169. doi: 10.1016/j.jbef.2019.03.005

*/

Qualtrics.SurveyEngine.addOnload(function()
{
var page = this; page.hideNextButton();				
console.log("Begin SEND");

// Get parameters from Qualtrics
if ("${e://Field/serverURL}" == false) {
	var serverURL = "https://server.smartriqs.com/php";
	console.log("Default server");
} 
else{	// use custom server URL if serverURL is defined in Qualtrics
	var serverURL = "${e://Field/serverURL}";
	console.log("Custom server: " + serverURL);
}	
var freezeTime 		= parseInt(Qualtrics.SurveyEngine.getEmbeddedData("freezeTime"));
	if (freezeTime > 30 || freezeTime < 1 	|| isNaN(freezeTime)) 		{freezeTime = 3;}	// use default if too high or too low
var sendData = encodeURIComponent(Qualtrics.SurveyEngine.getEmbeddedData(Qualtrics.SurveyEngine.getEmbeddedData("sendData")));
	if (sendData == "[.....]")	{sendData = "N/A";}

if ("${e://Field/terminateText}" == false){
	var terminateText = "The survey has been terminated. Please contact the researcher to receive partial compensation for your participation.";
}
else{
	var terminateText = "${e://Field/terminateText}";
	console.log("Terminate text set manually: " + terminateText);
}	
	
// Initialize variables
var status = "null";
var errorCount = 0;
var valueInDatabase = "";
var request = new httpRequest();
request.method = "GET";

makeRequest();

// This function sends data to the server
function makeRequest() {
	request.url = serverURL + "/send.php" +
	"?researcherID=" 	+ Qualtrics.SurveyEngine.getEmbeddedData("researcherID") + 
	"&studyID=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("studyID") + 
	"&participantID=" 	+ Qualtrics.SurveyEngine.getEmbeddedData("participantID") + 
	"&groupSize=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("groupSize") + 
	"&timeZone=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("timeZone") +
	"&numStages=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("numStages") + 
	"&sendStage=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("sendStage") + 
	"&timeOutLog=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("timeOutLog") + 
	"&sendValue=" 		+ sendData;
	
	// Create callback for success containing the response
	request.success = function(response)
	{
		var resp = response;
		var parser = new DOMParser()
		var parsed = parser.parseFromString(resp,"text/html");
		status = parsed.getElementsByTagName("status")[0].innerHTML;
		valueInDatabase = parsed.getElementsByTagName("valueInDatabase")[0].innerHTML;
		errorCount = parsed.getElementsByTagName("errorCount")[0].innerHTML;
		timeOutLog = parsed.getElementsByTagName("timeOutLog")[0].innerHTML;
		
		// Save the retrieved value to Qualtrics	
		Qualtrics.SurveyEngine.setEmbeddedData( Qualtrics.SurveyEngine.getEmbeddedData("sendData") , valueInDatabase );

		// Check if there was any error. If yes, display text
		if (errorCount > 0) {document.getElementById("infoBox").innerHTML = status;}
		
		// Otherwise, check if this participant timed out
		else {
			if (status == "timed out") {
				if (valueInDatabase == "terminated"){
					document.getElementById("infoBox").innerHTML = "You have been inactive for too long.<br><br>" + terminateText;
				}
				else {
					document.getElementById("infoBox").innerHTML = "You have been inactive for too long.<br>In order to let the other participant(s) continue the study,<br>the computer has generated a response for you: " + valueInDatabase + "<br><br>You can continue the study.";
				}
				
				// If there was a timeout, do not automatically proceed to the next page. Display warning message then show next button after a short delay
				Qualtrics.SurveyEngine.setEmbeddedData( "timeOutLog", timeOutLog );
				setTimeout(function () {page.showNextButton();}, 1000 * freezeTime);
			}
			// Otherwise proceed to next page
			else {
				console.log("SEND successful");
				page.clickNextButton();
			}
		}
	};

	// Create a fail callback containing the error
	request.fail = function(error){	console.log(error);	};

	// Send request
	request.send();
}


// HTTP request (AJAX) function
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
