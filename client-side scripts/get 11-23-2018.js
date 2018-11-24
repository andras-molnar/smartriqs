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
var page = this; page.hideNextButton ();				
console.log("Begin GET");

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
console.log("Max wait time = " + maxWaitTime + "s | Freeze time = " + freezeTime + "s");

// Initialize variables
var request = new httpRequest();
request.method = "GET";
var saveDataArray 		= Qualtrics.SurveyEngine.getEmbeddedData("saveData").split(",");
var numValues 			= saveDataArray.length;
var numValuesToGet		= Qualtrics.SurveyEngine.getEmbeddedData("getData").split(",").length;
var retrievedValue 		= [];
var participantValue	= null;
var attemptCount 		= 1;
var timeOut 			= "no";
var status 				= null;
var missingValues 		= 0;
var errorCount 			= 0;
var errorLog 			= "";

attemptGet();


// Function that attempts to retrieve values
function attemptGet() {
	setTimeout(function () {
		if (attemptCount == maxWaitTime) {timeOut = "yes";}
		makeRequest();
		console.log("Attempt = " + attemptCount + " | Status = " + status);
		if (status == "ready" && attemptCount >= freezeTime){
			if (Qualtrics.SurveyEngine.getEmbeddedData("operation")) {runOperations();}
			if (errorCount == 0){
				if (timeOut == "yes"){
					document.getElementById("infoBox").innerHTML = timeOutResponsesLog;  
					setTimeout(function () {page.showNextButton();}, 1000 * freezeTime);
				}
				else{
					console.log("GET successful");
					page.clickNextButton();
				}	
			}
		}
		else {
		// Check if there was any error. If yes, display it and stop the experiment
			if (status.includes("ERROR") == true){	document.getElementById("infoBox").innerHTML = status;	console.log("display errors");}
			else{attemptCount++;attemptGet();}	// ...otherwise, keep trying
		}
	},  1000);
}


// Function that makes the request
function makeRequest() {
		
	request.url = serverURL + "/get.php" +
	"?researcherID=" 	+ Qualtrics.SurveyEngine.getEmbeddedData("researcherID") + 
	"&studyID=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("studyID") + 
	"&participantID=" 	+ Qualtrics.SurveyEngine.getEmbeddedData("participantID") + 
	"&numStages=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("numStages") + 
	"&getStage=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("getStage") + 
	"&timeZone=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("timeZone") +		
	"&roles=" 			+ Qualtrics.SurveyEngine.getEmbeddedData("roles") + 
	"&getValue=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("getData") + 
	"&defaultValue=" 	+ Qualtrics.SurveyEngine.getEmbeddedData("defaultData") + 
	"&timeOut=" 		+ timeOut + 
	"&timeOutLog=" 		+ String(Qualtrics.SurveyEngine.getEmbeddedData("timeOutLog"));
	
	// Create callback for success containing the response
	request.success = function(response)
	{
		var resp 			= response;
		var parser 			= new DOMParser()
		var parsed 			= parser.parseFromString(resp,"text/html");
		status 				= parsed.getElementsByTagName("status")[0].innerHTML;
		missingValues 		= parsed.getElementsByTagName("missingValues")[0].innerHTML;
		timeOutResponsesLog = parsed.getElementsByTagName("timeOutResponsesLog")[0].innerHTML;
		timeOutLog 			= parsed.getElementsByTagName("timeOutLog")[0].innerHTML;
		participantValue	= parsed.getElementsByTagName("participantValue")[0].innerHTML;
		if (timeOutResponsesLog.length > 0 ){timeOut = "yes";}
		
		// Save responses as Qualtrics embedded variables
		Qualtrics.SurveyEngine.setEmbeddedData( "timeOutLog", timeOutLog );	
		
		if (status.includes("ERROR") == false){
			if (numValues == numValuesToGet){
				var i;
				for (i = 0; i < numValues; i++)
				{
					retrievedValue[i] = parsed.getElementsByTagName("retrievedValue" + i)[0].innerHTML;
					Qualtrics.SurveyEngine.setEmbeddedData( saveDataArray[i], retrievedValue[i] );
				}
			}
			else{
				errorCount++;
				status = "<p style='font-weight:bold; color:red'>ERROR 207: The number of responses to be retrieved (" + numValuesToGet + 
				") does not match the number of responses to be saved (" + numValues + ").</p>";
			}	
			
			document.getElementById("missingValues").innerHTML 	= missingValues;
		}			
	};

	// Create a fail callback containing the error
	request.fail = function(error)	{console.log(error);};

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


// Function that calls operations if necessary
function runOperations(){
	console.log("Running operations...");
	checkNumberInput(retrievedValue);
	
	var validOperations = ["min","max","sum","average","rank","rankTie","secondMax","accuracyRank","p-BeautyRank"];
	var operationArray = [];
	var operationResult = 0;
	var saveOperationArray = [];
	var decimalPlaces = 2;
	if (Qualtrics.SurveyEngine.getEmbeddedData("decimalPlaces")) {decimalPlaces = Qualtrics.SurveyEngine.getEmbeddedData("decimalPlaces");}
	if (Qualtrics.SurveyEngine.getEmbeddedData("operation")) {	operationArray	= Qualtrics.SurveyEngine.getEmbeddedData("operation").split(",");}
	if (Qualtrics.SurveyEngine.getEmbeddedData("saveOperation")) {	saveOperationArray	= Qualtrics.SurveyEngine.getEmbeddedData("saveOperation").split(",");}

	if (operationArray.length ==  saveOperationArray.length){	
		var numOperations = operationArray.length;
		
		for (i = 0; i < numOperations; i++){
			if (validOperations.includes(operationArray[i]) == true){
				if (operationArray[i] == "max")			{ operationResult = Math.max.apply(Math, retrievedValue);}
				if (operationArray[i] == "secondMax")	{ operationResult = getSecondMax(retrievedValue);}
				if (operationArray[i] == "min")			{ operationResult = Math.min.apply(Math, retrievedValue);}
				if (operationArray[i] == "sum")			{ operationResult = getSum(retrievedValue);}
				if (operationArray[i] == "average")		{ operationResult = (getSum(retrievedValue) / retrievedValue.length);}
				if (operationArray[i] == "rank")		{ operationResult = getRank(participantValue,retrievedValue);}
				if (operationArray[i] == "accuracyRank"){ operationResult = getAccuracyRank(participantValue,retrievedValue,parseFloat(Qualtrics.SurveyEngine.getEmbeddedData("targetValue")));}
				if (operationArray[i] == "p-BeautyRank"){ operationResult = getPBeautyRank(participantValue,retrievedValue);}
				
				operationResult = Math.round(operationResult*Math.pow(10,decimalPlaces))/ Math.pow(10,decimalPlaces);
				Qualtrics.SurveyEngine.setEmbeddedData(saveOperationArray[i], operationResult);
			}
			else{
				errorCount++;
				errorLog = errorLog + "ERROR 110: Invalid operation: " + operationArray[i] +
				"<br>Operation must be one of the following: " + validOperations + ". Operations are case sensitive.<br><br>";
			}	
		}
	}
	
	else {
		errorCount++;
		errorLog = errorLog + "ERROR 208: The number of operations does not match the number of operation results to be saved." +
		"<br><br>" + operationArray.length + " operations: " + operationArray + 
		"<br>" + saveOperationArray.length + " operation results: " + saveOperationArray + 
		"<br><br>";
	}

	
	// Allow next button only if no error
	if (errorCount == 0){
		// Flush operations from qualtrics to prevent carry over to next GET blcok
		Qualtrics.SurveyEngine.setEmbeddedData("operation", "");
		Qualtrics.SurveyEngine.setEmbeddedData("saveOperation", "");
		//Qualtrics.SurveyEngine.setEmbeddedData("targetValue", "");
		//Qualtrics.SurveyEngine.setEmbeddedData("breakTie", "");
	}
	else {
		document.getElementById("infoBox").innerHTML = "<p style='font-weight:bold; color:red'>" + errorLog + "</p>";
	}
}


// This function checks if input values are numbers
function checkNumberInput(values){
	for (j = 0; j < values.length; j++){
		if (isNaN(values[j]) == true){
			errorCount++;
			errorLog = errorLog + "ERROR 109: Invalid input for operation: " + 
			values[j] +	"<br>Input must be a number." +	"<br><br>";
		}
	}
}


// SUM function
function getSum(values){
	var sum = 0;
	for (k = 0; k < values.length; k++){sum = sum + parseFloat(values[k]);}
	return sum;	
}


// RANK function
function getRank(thisValue, values){
	if (thisValue){
		var rank = 1;
		if (Qualtrics.SurveyEngine.getEmbeddedData("breakTie")) {var breakTie = Qualtrics.SurveyEngine.getEmbeddedData("breakTie");}
		var tieBreakerDummy = parseInt(Qualtrics.SurveyEngine.getEmbeddedData("groupID")) % 2;
		var getDataArray = Qualtrics.SurveyEngine.getEmbeddedData("getData").split(",");
		var participantRole = Qualtrics.SurveyEngine.getEmbeddedData("participantRole");
		var participantPosition = getDataArray.indexOf(participantRole);
		
		for (k = 0; k < values.length; k++){
			if (k != participantPosition){
				if (parseFloat(values[k]) > parseFloat(thisValue)){rank++;}
				if (parseFloat(values[k]) == parseFloat(thisValue) && breakTie == "yes"){
					if ((participantPosition > k && tieBreakerDummy == 0) || (participantPosition < k && tieBreakerDummy == 1)){rank++;}
				}
			}
		}
		return rank;
	}
	else {
		errorCount++;
		errorLog = errorLog + "ERROR 011: Participant data is missing.<br>Make sure to include '" + 
		Qualtrics.SurveyEngine.getEmbeddedData("participantRole") + "' in the 'getRole' parameter in Qualtrics.<br><br>";
		return null;
	}
}


// SECONDMAX function
function getSecondMax(values){
	var max = Math.max.apply(Math,values);
	maxIndex = values.indexOf(String(max));
	values[maxIndex] = -Infinity;
	var secondmax = Math.max.apply(Math,values);
	values[maxIndex] = max;
	return secondmax;
}


// ACCURACY RANK function
function getAccuracyRank(thisValue,values,target){
	if (thisValue){
		var accuracyArray = [];
		var rank = 1;
		
		if (target){
			for (n = 0; n < values.length; n++){
				accuracyArray[n] = Math.abs(parseFloat(values[n]) - target);
			}
			
			if (Qualtrics.SurveyEngine.getEmbeddedData("breakTie")) {var breakTie = Qualtrics.SurveyEngine.getEmbeddedData("breakTie");}
			var tieBreakerDummy = parseInt(Qualtrics.SurveyEngine.getEmbeddedData("groupID")) % 2;
			var getDataArray = Qualtrics.SurveyEngine.getEmbeddedData("getData").split(",");
			var participantRole = Qualtrics.SurveyEngine.getEmbeddedData("participantRole");
			var participantPosition = getDataArray.indexOf(participantRole);
			
			for (k = 0; k < values.length; k++){
				if (k != participantPosition){
					if (parseFloat(accuracyArray[participantPosition]) > accuracyArray[k]){rank++;}
					if (parseFloat(accuracyArray[participantPosition]) == accuracyArray[k] && breakTie == "yes"){
						if ((participantPosition > k && tieBreakerDummy == 0) || (participantPosition < k && tieBreakerDummy == 1)){rank++;}
					}
				}
			}
			return rank;
		}
		else{
			errorCount++;
			errorLog = errorLog + "ERROR 012: Cannot calculate accuracies -- target value is missing.<br><br>";
			return null;
		}		
	}
	else {
		errorCount++;
		errorLog = errorLog + "ERROR 011: Participant data is missing.<br>Make sure to include '" + 
		Qualtrics.SurveyEngine.getEmbeddedData("participantRole") + "' in the 'getData' embedded data in Qualtrics.<br><br>";
		return null;
	}
}


// p-BEAUTY RANK function
function getPBeautyRank(thisValue,values){
	if (Qualtrics.SurveyEngine.getEmbeddedData("p-BeautyFraction")){
		var fraction = Qualtrics.SurveyEngine.getEmbeddedData("p-BeautyFraction");
		var averageGuess = getSum(values) / values.length;
		var beautyTarget = averageGuess * fraction;
		return getAccuracyRank(thisValue,values,beautyTarget);
	}
	else{
		errorCount++;
		errorLog = errorLog + "ERROR 013: Cannot calculate P-beauty accuracies: the p-beauty fraction is missing. This should be a number between 0 and 1.<br><br>";
		return null;
	}
}
});
