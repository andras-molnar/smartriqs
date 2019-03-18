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
console.log("Begin CHAT");

// Get DOM elements
var warninglog = document.getElementById("warninglog");
var chatInstructions = document.getElementById("chatInstructions");
var chatHeader = document.getElementById("chatHeader");
var exitButton = document.getElementById("exitButton");
var timer = document.getElementById("timer");
var chatDisplay = document.getElementById("chatDisplay");
var chatInput = document.getElementById("chatInput");
var inputField = document.getElementById("inputField");
var submitButton = document.getElementById("submitButton");

// Get parameters from Qualtrics
if ("${e://Field/serverURL}" == false) {
	var serverURL = "https://server.smartriqs.com/php";
	console.log("Default server");
} 
else{	// use custom server URL if serverURL is defined in Qualtrics
	var serverURL = "${e://Field/serverURL}";
	console.log("Custom server: " + serverURL);
}				
var allowExit = ("${e://Field/allowExitChat}")
var chatWindowWidth = parseInt("${e://Field/chatWindowWidth}");
var chatWindowHeight = parseInt("${e://Field/chatWindowHeight}");
var chatTimeFormat = "${e://Field/chatTimeFormat}";
var allowExit = ("${e://Field/allowExitChat}");
var timeLimit = parseInt("${e://Field/chatDuration}"); // if < 10 or NaN, there is no limit
if ("${e://Field/chatName}" == false){	// check if chatName is defined. If not, display error message.
	warninglog.innerHTML = "ERROR 014: 'chatName' is not defined. This chat will not be saved in Qualtrics. Please define 'chatName' in the Survey Flow.<br><br>";
}
else{
	if (Qualtrics.SurveyEngine.getEmbeddedData("${e://Field/chatName}") == null){
		warninglog.innerHTML = "ERROR 015: the embedded data '" + "${e://Field/chatName}" + "' does not exist. This chat will not be saved in Qualtrics.<br><br>";
	}	
}

// Revert to default if parameters are invalid or missing
if (isNaN(chatWindowWidth ) || chatWindowWidth < 400 || chatWindowWidth > 1200){chatWindowWidth = 600;}
if (isNaN(chatWindowHeight) || chatWindowHeight < 240 || chatWindowHeight > 720){chatWindowHeight = 360;}
if (["hms24","hm24","hms12","hm12","none"].includes(chatTimeFormat) == false){
	console.log("invalid time format");
	chatTimeFormat = "none";
	}

// Flush parameters from Qualtrics
Qualtrics.SurveyEngine.setEmbeddedData("chatWindowWidth","");
Qualtrics.SurveyEngine.setEmbeddedData("chatWindowHeight","");
Qualtrics.SurveyEngine.setEmbeddedData("allowExit","");
Qualtrics.SurveyEngine.setEmbeddedData("chatDuration","");

// Initialize variables
var startTime = 0;
var remainingTime = timeLimit;
var exitDummy = 0;
var chatLog = "";
var old_chatLog = "";
var request = new httpRequest();
request.method = "GET";

// Add content & formatting to DOM elements
if ("${e://Field/chatInstructions}") {
	chatInstructions.innerHTML = "${e://Field/chatInstructions}<br><br><br>";
	Qualtrics.SurveyEngine.setEmbeddedData("chatInstructions","");
}
else{chatInstructions.innerHTML = "Hit 'Enter' or the 'Send message' button to send a message.<br><br><br>";}

chatHeader.setAttribute("style", 
	"margin: 0 auto 0 auto;" +
	"width: " + chatWindowWidth + "px;" +
	"display: flex;" +
	"resize: none;" +
	"justify-content: space-between;"
);

if (isNaN(timeLimit) || timeLimit < 10 || timeLimit > 600) {allowExit = "yes";} else {
	timer.style.visibility = "visible";
	timer.setAttribute("style",
		"width: " + (chatWindowWidth / 2) + "px;" +
		"text-transform: uppercase;" +
		"line-height: 1;" +
		"padding: 8px 20px;" +
		"margin: 0 1em 0 auto;" 
	);
	
	updateTimer();	// Start timer
}

if (allowExit == "yes") {
	exitButton.style.visibility = "visible";
	exitButton.onclick = exitChat;
	exitButton.setAttribute("style",
		"color: black;" +
		"border: none;" +
		"width: 100px;" +
		"font-size: 12px;" +
		"text-transform: uppercase;" +
		"line-height: 1;" +
		"padding: 8px 20px;" +
		"border-radius: 10px;" 
	);
}

chatDisplay.setAttribute("style", 
   "width: " + chatWindowWidth + "px;" +
   "height: " + chatWindowHeight + "px;" + 
   "background: white;" +
   "padding: 1em;" +
   "overflow: auto;" +
   "overflow-y: auto;" +
   "resize: none;" +
   "position: relative;" +
   "margin: 0 auto 5px auto;" +
   "box-shadow: 2px 2px 5px 2px rgba(0,0,0,0.3);"
);

chatInput.setAttribute("style", 
	"margin: 0 auto 0 auto;" +
	"width: " + chatWindowWidth + "px;" +
	"display: flex;" +
	"resize: none;" +
	"justify-content: space-between;"
);

inputField.setAttribute("size",(chatWindowWidth / 10));
inputField.addEventListener('keyup', function (e) {
    var key = e.which || e.keyCode;
    if (key === 13) {  sendMessage();
    }
});

submitButton.onclick = sendMessage;
submitButton.setAttribute("style",
	"color: #ffffff;" +
    "border: none;" +
	"width: 200px;" +
    "background: #007AC0;" +
    "font-size: 14px;" +
	"text-transform: uppercase;" +
    "line-height: 1;" +
    "padding: 8px 20px;" +
    "margin: 0 auto 0em 1em;" +
    "border-radius: 10px;" 
);

updateChat(1);	// Trigger " .. has joined the chat" messsage
autoUpdate();	// Start autoupdating chat


// Function that calculates and displays remaining time
function updateTimer() {
setTimeout(function () {
		d = new Date();
		currentTime = d.getTime();
		if (startTime == 0) {startTime = currentTime;}
		remainingTime = Math.round(timeLimit - (currentTime - startTime)/1000,0);
		remainingMinutes = Math.floor(remainingTime / 60);
		remainingSeconds = remainingTime % 60;
		if (remainingSeconds < 10) {remainingSeconds = "0" + remainingSeconds};
 		if (remainingTime > 10) {timer.innerHTML = "Remaining time: " + remainingMinutes + ":" + remainingSeconds; }
		else {timer.innerHTML = "<span style='color:#FF0000;'><strong>Remaining time: " + remainingMinutes + ":" + remainingSeconds + "</strong></span>";}
		
		if (remainingTime > 0) {updateTimer();} 
		else { exitChat();}
    },  100);	// Note that to guarantee smoother transitions, the counter is refreshed every 100 ms, istead of every 1000 ms
}


// Function that is called when the chat ends (either time is up or participants exits)
function exitChat(){
	exitDummy = 1;
	updateChat(3); 	// Trigger " .. has left chat" message
	console.log("End CHAT");
	page.clickNextButton();
}


// Function that automaitcally updates the chat window every second, until the chat ends
function autoUpdate() {
	setTimeout(function () {
		updateChat(0);
		if (exitDummy == 0) {autoUpdate();}
    },  1000);
}


// Function that scrolls to the bottom of the chat window (whenever there is a new message)  
function scrollToBottom () {
	chatDisplay.scrollTop = chatDisplay.scrollHeight - chatDisplay.clientHeight;
}
	

// Whenever sendMessage() is called, add new message to chat	
function sendMessage(){
	updateChat(2);
}


// This function retrieves the chat log from the server and submits new messages if necessary.
function updateChat(mode) {
	// This function has four 'modes':
		// Mode 0 -- UPDATE ONLY. Retrieve the most up-to-date chat log from the server and display it.
		// Mode 1 -- JOIN CHAT. Send a " .. has joined the chat" message to the server.	
		// Mode 2 -- NEW MESSAGE. Send the input value to the server as a new message.
		// Mode 3 -- LEAVE CHAT. Send a " .. has left the chat" message to the server.	
	if (mode == 0){	addText = "";}
	if (mode == 1){	addText = "{{{*** Player joined ***}}}";}
	if (mode == 2){	addText = encodeURIComponent(inputField.value);	inputField.value = "" ;}
	if (mode == 3){addText = "{{{*** Player left ***}}}";}
	
	// Make HTTP request
	request.url = serverURL + "/chat.php" +
	"?researcherID=" 	+ Qualtrics.SurveyEngine.getEmbeddedData("researcherID") + 
	"&studyID=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("studyID") + 
	"&groupID=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("groupID") +
	"&timeZone=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("timeZone") +
	"&participantRole="	+ Qualtrics.SurveyEngine.getEmbeddedData("participantRole") +
	"&chatName=" 		+ Qualtrics.SurveyEngine.getEmbeddedData("chatName") +
	"&chatTimeFormat="	+ chatTimeFormat +
	"&addText="			+ addText;
	
	// Create callback for success containing the response
	request.success = function(response)
	{
		var resp = response;
		var parser = new DOMParser()
		var parsed = parser.parseFromString(resp,"text/html");
		old_chatLog = chatLog;
		chatLog = parsed.getElementsByTagName("chatLog")[0].innerHTML;
		if (mode != 3) {
			chatDisplay.innerHTML = chatLog;
			if (chatLog != old_chatLog) {scrollToBottom();}
		}
		// Save / update the chat log in Qualtrics
		Qualtrics.SurveyEngine.setEmbeddedData( Qualtrics.SurveyEngine.getEmbeddedData("chatName"), chatLog );
	};

	// Create a fail callback containing the error
	request.fail = function(error){console.log(error);};

	// Send requrest
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
