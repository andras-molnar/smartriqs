<!-- 

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


-->

<?php
header("Access-Control-Allow-Origin: *");
$status = null;
$errorCount = 0;

// Add functions
include "functions.php";

// Get variables from query string
if (empty($_GET["timeZone"]))				{$timeZone = 0;} 				else {$timeZone = $_GET["timeZone"];}
$currentTime = getTime($timeZone);
if (empty($_GET["researcherID"])) 			{errorMessage("001");} 			else {$researcherID = $_GET["researcherID"];}
if (file_exists($researcherID) == FALSE)	{errorMessage("101");};
if (empty($_GET["studyID"])) 				{errorMessage("002");} 			else {$studyID = $_GET["studyID"];}
if (empty($_GET["groupID"])) 				{errorMessage("010");} 			else {$groupID = $_GET["groupID"];}
if (empty($_GET["participantRole"]))		{errorMessage("007");}			else {$participantRole = $_GET["participantRole"];}
if (empty($_GET["chatName"]))        	 	{$chatName = "default_log";} 	else {$chatName = $_GET["chatName"];}
if (empty($_GET["chatTimeFormat"]))    	 	{$chatTimeFormat = "none";} 	else {$chatTimeFormat = $_GET["chatTimeFormat"];}
if (empty($_GET["addText"])) 				{$addMessage = 0;} 				else {$addMessage = 1; $addText = $_GET["addText"];}

// Break any potential DOM elements in input to prevent code injection
$addText = str_replace("<"," < ",$addText); 
$addText = str_replace(">"," > ",$addText);

// If there is any error, display that, otherwise, display chat log
if ($errorCount > 0){ echo "<chatLog>" . $status . "</chatLog>";}
else{
	$chatLogFolder = $researcherID . "/" . $studyID . "_chat_logs";
	
	// If study chat folder does not exist, create it:
	if (file_exists($chatLogFolder) == FALSE){
		mkdir($chatLogFolder, 0774);
		chmod($chatLogFolder, 0774);
	}
	
	// If group chat folder does not exist, create it:
	if (file_exists($chatLogFolder . "/Group_" . $groupID) == FALSE){
		mkdir($chatLogFolder . "/Group_" . $groupID, 0774);
		chmod($chatLogFolder . "/Group_" . $groupID, 0774);
	}
	
	// Retrieve chat log file
	$chatLogFile = $chatLogFolder . "/Group_" . $groupID . "/" . $chatName . ".htm";
	$chatLog = file_get_contents($chatLogFile, FALSE);
	
	// If there is a new message (or if a player joined/left), add that to the chat log
	if ($addMessage == 1) {
		if ($addText == "{{{*** Player joined ***}}}"){
			$chatLog .= "&emsp;*** " . $participantRole . " has joined the chat ***\n<br>";
		}
		else {
			if ($addText == "{{{*** Player left ***}}}"){
				$chatLog .= "&emsp;*** " . $participantRole . " has left the chat ***\n<br>";
			}
			else {
				// By default, there is no timeStamp
				$timeStamp = "";
				
				// Check if timeStamp is defined, and if so, use that time format
				if ($chatTimeFormat == "hms24") {$timeStamp = " (" . date("G:i:s",$currentTime) . ")";}
				if ($chatTimeFormat == "hm24") {$timeStamp = " (" . date("G:i",$currentTime) . ")";}
				if ($chatTimeFormat == "hms12") {$timeStamp = " (" . date("h:i:s A",$currentTime) . ")";}
				if ($chatTimeFormat == "hm12") {$timeStamp = " (" . date("h:i A",$currentTime) . ")";}
				
				// Add new message to chat log
				$chatLog .= $participantRole . $timeStamp . ": " . $addText . "\n<br>";
			}
		}
		// Save updated chat log to chat log file
		file_put_contents($chatLogFile, $chatLog);
	}
	// Return current chat log
	echo "<br><chatLog>" . $chatLog . "</chatLog>";
}
?>


