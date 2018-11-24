/* 

Copyright 2018 Andras Molnar

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
with the Software are published: Molnar, A. (2018). “SMARTRIQS: A Simple Method Allowing 
Real-Time Respondent Interaction in Qualtrics Surveys". Retrieved from https://smartriqs.com

*/

Qualtrics.SurveyEngine.addOnload(function()
{
var page = this; page.hideNextButton();
console.log("Begin COMPLETE");

// Get values from Qualtrics
if ("${e://Field/serverURL}" == false) {
	var serverURL = "https://server.smartriqs.com/php";
	console.log("Default server");
} 
else{	// use custom server URL if serverURL is defined in Qualtrics
	var serverURL = "${e://Field/serverURL}";
	console.log("Custom server: " + serverURL);
}	
var timeOutLog = 	Qualtrics.SurveyEngine.getEmbeddedData("timeOutLog");
if (timeOutLog == "null") {	Qualtrics.SurveyEngine.setEmbeddedData( "timeOutLog", "OK -- no issues");}
else {	Qualtrics.SurveyEngine.setEmbeddedData( "timeOutLog", timeOutLog.substring(4));}

// Initialize parameters
var request = new httpRequest();
request.method = "GET";

makeRequest();

function makeRequest() {
	request.url = serverURL + "/complete.php" +
	"?researcherID=" 	+ Qualtrics.SurveyEngine.getEmbeddedData("researcherID") + 
	"&studyID=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("studyID") + 
	"&participantID=" 	+ Qualtrics.SurveyEngine.getEmbeddedData("participantID") + 
	"&groupSize=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("groupSize") + 
	"&numStages=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("numStages");
	
	// Create callback for success containing the response
	request.success = function(response){console.log("COMPLETE succesful"); page.clickNextButton();};

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
