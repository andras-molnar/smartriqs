<!-- 

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

-->

<?php
header("Access-Control-Allow-Origin: *"); 		
$status = "";				// Status variable. Used for communcation between Qualtrics and the server.
$found = 0;					// Dummy variable: 0 if participantID is not in study database, 1 if participantID is already in database.
$participantValue = NULL;
$errorCount = 0;    		// Error count. If everything works fine, this remains 0.

// Add functions
include "functions.php";

// Get values from query string
if (empty($_GET["researcherID"])) 	{errorMessage("001");} 	else {$researcherID = $_GET['researcherID'];}
if (empty($_GET["timeZone"]))		{$timeZone = 0;} 				else {$timeZone = 				$_GET["timeZone"];}
$currentTime = getTime($timeZone);
if (empty($_GET["studyID"])) 		{errorMessage("002");} 	else {$studyID = $_GET['studyID'];}
if (empty($_GET["participantID"])) 	{errorMessage("003");} 	else {$participantID = $_GET['participantID'];}
if (empty($_GET["numStages"]))      {errorMessage("005");}	else {$numStages = $_GET['numStages'];}
if (empty($_GET["roles"]))        	{errorMessage("006");} 	else {$roles = $_GET['roles']; $rolesArray = explode(",", $roles); $groupSize = count($rolesArray);}	# Note: since we imported a string, we must use the 'explode' function to convert it to an array. 
if (empty($_GET["getStage"]))  	    {errorMessage("008");}	else {$getStage = $_GET['getStage'];}
if (empty($_GET["getValue"]))      	{errorMessage("009");}	else {$getValue = $_GET['getValue']; $getValuesArray = explode(",",$getValue);}  
if (empty($_GET["defaultValue"]))	{$defaultValue = 0; $defaultValuesArray = ["0"];}	else {$defaultValue = $_GET['defaultValue']; $defaultValuesArray = explode(",",$defaultValue);} 
if (empty($_GET["timeOut"]))      	{$timeOut = "no";}		else {$timeOut = $_GET['timeOut'];}
if (empty($_GET["timeOutLog"]))    	{$timeOutLog = "";}		else {$timeOutLog = $_GET['timeOutLog'];}

// Check whether the imported values are valid.	
if (file_exists($researcherID) == FALSE)	{errorMessage("101");};
if ($groupSize < 2 or $groupSize > 8)	{errorMessage("104");}
if (filter_var($numStages, FILTER_VALIDATE_INT) == FALSE or $numStages < 1)	{errorMessage("105");}
if (count($conditionsArray) > 1 and in_array($participantCondition, $conditionsArray) == FALSE and $participantCondition != "random")	{errorMessage("108");}
if ($getStage > $numStages or filter_var($getStage, FILTER_VALIDATE_INT) == FALSE or $getStage < 1)	{errorMessage("107");}
for ($i = 0; $i < count($getValuesArray); $i++){
	if (in_array($getValuesArray[$i], $rolesArray) == FALSE) {errorMessage("205"); break;}
}
if (count($getValuesArray) != count($defaultValuesArray)) {errorMessage("206");}


// Retrieve database 
if ($errorCount == 0) {
	
	$playerIndexArray = getPlayerIndexes($groupSize, $numStages);	// Get player indexes
	$datafile = $researcherID . "/" . $studyID . "_rawdata.csv"; 	// Get datafile
	
	if (file_exists($datafile) == FALSE) {errorMessage("102");} 
	
	else {				
		$dataTable = importData($datafile); 
		checkHeader($dataTable, $groupSize, $numStages, $rolesArray);
		selectGroup($dataTable, $groupSize, $participantID, $playerIndexArray);		
    }
}	

if ($errorCount == 0){
	if ($found == 1) { 	getValues($datafile, $groupData, $getStage, $getValuesArray, $rolesArray, $playerIndexArray, $timeOut, $defaultValuesArray);
	}
	else {errorMessage("103");}	
}

createOutputFields($status, $timeOutLog, $retrievedValues, $missingValues, $timeOutResponsesLog, $participantValue);	


// Function that retrueves values
function getValues($datafile, $group,$stage,$values,$roles,$indexes, $timeOut, $defaults){
	global $status, $retrievedValues, $missingValues, $timeOutResponsesLog, $timeOutLog, $participantIndex, $participantValue;
	$retrievedValues = [];
	$missingValues = 0;
	$timeOutResponsesLog = NULL;
	$updateGroupData = 0;

	for ($i = 0; $i < count($values); $i++) {
		$thisIndex = $indexes[array_search($values[$i], $roles)]; 
		$retrievedValues[$i] = $group[$thisIndex + 1 + $stage];
		
		// if missing then...
		if ($retrievedValues[$i] == "[.....]"){
			$missingValues++;

			// check if BOT or timed out, then add default response
			if (substr($group[$thisIndex],0,4) == "BOT " or $timeOut == "yes"){
				$retrievedValues[$i] = $defaults[$i];
				$group[$thisIndex + 1 + $stage] = "[DefaultResponse]" . $defaults[$i];
				$updateGroupData = 1;
			}
		}
		// if not missing then determine whether it is normal response, BOT, or timed out or non-time out response and truncate response accordingly
		else{
			if (strpos($retrievedValues[$i], "[DefaultResponse]") === false) {}
			else {
				$retrievedValues[$i] = substr($retrievedValues[$i],17);
				
				// Check if BOT. if yes, add message to time out log.
				if (substr($group[$thisIndex],0,4) === "BOT "){
					$newMessageTimeOutLog = " *** BOT in role " . $values[$i] . " responded: " . $retrievedValues[$i] . " (stage " . $stage .  ").";
					if (strpos($timeOutLog, $newMessageTimeOutLog) == false) {$timeOutLog = $timeOutLog . $newMessageTimeOutLog;} // only add errors once
				}	
				// Otherwise, it must be a timeout response
				else{
					$newMessageTimeOutResponsesLog = "Participant " . $values[$i] . " seems to be inactive and has not submitted any response.<br>The computer has generated a response for Participant " . $values[$i] . "<br>You can continue the study.<br><br>";
					if ($thisIndex != $participantIndex and strpos($timeOutResponsesLog, $newMessageTimeOutResponsesLog) == false) {$timeOutResponsesLog = $timeOutResponsesLog . $newMessageTimeOutResponsesLog;} // only add errors once
					$newMessageTimeOutLog = " *** Warning: Participant " . $values[$i] . " timed out in stage " . $stage . ". Default response is " . $retrievedValues[$i] . ".";
					if ($thisIndex != $participantIndex and strpos($timeOutLog, $newMessageTimeOutLog) == false) {$timeOutLog = $timeOutLog . $newMessageTimeOutLog;} // only add errors once
				}
			}
		}
		if ($thisIndex == $participantIndex) {$participantValue = $retrievedValues[$i];}
	}
	if ($updateGroupData == 1) {addData($addAutoResponse, $group, $datafile);}
	if ($missingValues == 0) {$status = "ready";} else {$status = "waiting";} 
}


// Function that creates output fields for Qualtrics
function createOutputFields($status, $log, $values, $missingValues, $timeOutResponsesLog, $participantValue){
	echo "<status>" 				. $status 				. "</status>";
	echo "<missingValues>" 			. $missingValues 		. "</missingValues>";
	echo "<timeOutResponsesLog>" 	. $timeOutResponsesLog 	. "</timeOutResponsesLog>";
	echo "<timeOutLog>" 			. $log 					. "</timeOutLog>";
	echo "<participantValue>"		. $participantValue		. "</participantValue>";
	
	for ($i = 0; $i < count($values); $i++){
		echo "<retrievedValue" . $i . ">" . $values[$i] . "</retrievedValue" . $i . ">";
	}
}
?>