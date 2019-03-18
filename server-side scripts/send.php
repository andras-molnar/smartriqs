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
$status = "null";								// Status variable. Used for communcation between Qualtrics and the server.
$found = 0;										// Dummy variable: 0 if participantID is not in study database, 1 if participantID is already in database.
$errorCount = 0;    							// Error count. If everything works fine, this remains 0.

// Add functions
include "functions.php";

// Get values from the query string
if (empty($_GET["researcherID"])) 			{errorMessage("001");} 	else {$researcherID = 	$_GET["researcherID"];}
if (empty($_GET["studyID"])) 				{errorMessage("002");} 	else {$studyID = 		$_GET["studyID"];}
if (empty($_GET["participantID"])) 			{errorMessage("003");} 	else {$participantID =	$_GET["participantID"];}
if (empty($_GET["groupSize"])) 				{errorMessage("004");} 	else {$groupSize = 		$_GET["groupSize"];}
if (empty($_GET["numStages"]))      		{errorMessage("005");}	else {$numStages = 		$_GET["numStages"];}
if (empty($_GET["sendStage"]))      		{errorMessage("008");}	else {$sendStage = 		$_GET["sendStage"];}
if (empty($_GET["sendValue"]))      		{$sendValue = 0;}		else {$sendValue = 		$_GET["sendValue"];}
if (empty($_GET["timeOutLog"]))    			{$timeOutLog = "";}		else {$timeOutLog = 	$_GET["timeOutLog"];}
if (empty($_GET["timeZone"]))				{$timeZone = 0;} 		else {$timeZone = 		$_GET["timeZone"];}
$currentTime = getTime($timeZone);

// Check whether the imported values are valid	
if (file_exists($researcherID) == FALSE)	{errorMessage("101");};
if (in_array($groupSize, array(2,3,4,5,6,7,8)) == FALSE)	{errorMessage("104");}
if (filter_var($numStages, FILTER_VALIDATE_INT) == FALSE or $numStages < 1)	{errorMessage("105");}
if (count($conditionsArray) > 1 and in_array($participantCondition, $conditionsArray) == FALSE and $participantCondition != "random")	{errorMessage("108");}
if ($sendStage > $numStages or filter_var($sendStage, FILTER_VALIDATE_INT) == FALSE or $sendStage < 1)	{errorMessage("107");}

// Retrieve database 
if ($errorCount == 0) {
	
	$playerIndexArray = getPlayerIndexes($groupSize, $numStages);	// Get player indexes
	$datafile = $researcherID . "/" . $studyID . "_rawdata.csv"; 	// Get path of datafile
    
	// Check if the study database exists	
	if (file_exists($datafile) == FALSE) {errorMessage("102");} 
	else {		// Import data, check header and find participant
		$dataTable = importData($datafile); 
		checkHeader($dataTable, $groupSize, $numStages, NULL);
		selectGroup($dataTable, $groupSize, $participantID, $playerIndexArray);		
    }
}	

if ($errorCount == 0){
	if ($found == 1) { 	saveValue($datafile, $groupData,$participantIndex,$sendStage, $sendValue, $currentTime);}
	else {errorMessage("103");}	
}

createOutputFields($status, $valueInDatabase, $errorCount, $timeOutLog);	// Create output fields that can be retrieved in Qualtrics


// Function that saves the submitted value to the datafile
function saveValue($datafile, $group,$i,$sendStage,$value,$time){
	global $status, $playerIndexArray, $valueInDatabase, $timeOutLog;
	
	// Check if record is still empty & player status is not 'completed'
	if ($group[$i+1+$sendStage] == "[.....]" and $group[$i+1] != "completed") {
		// If value does not exist and group is not completed, add new value and timestamp to datafile...
		$group[$i+1+$sendStage] = $value;
		$valueInDatabase = $value;
		$group[$i+1] = $time; 
		$status = "ok";
		addData($complete, $group, $datafile);
	}
	else {
		// ... otherwise, retrieve the targe value from datafile
		$valueInDatabase = $group[$i+1+$sendStage];
		
		// Check if retrieved value is a default response. If not, it is a duplicate response (no action)
		if (strpos($valueInDatabase, "[DefaultResponse]") === false) {$status = "duplicate";}
		else { // Otherwise, it is a default response: add warning to timeout log
			$valueInDatabase = substr($valueInDatabase,17);
			$status = "timed out";
			if ($valueInDatabase == "terminated"){
				$timeOutLog = $timeOutLog . " *** Warning: This player has timed out in stage " . $sendStage . ". Survey terminated.";
			}
			else{
				$timeOutLog = $timeOutLog . " *** Warning: This player has timed out in stage " . $sendStage . ". Default response: " . $valueInDatabase . ".";
			}
		}
	}
}


// Function that creates output fields for Qualtrics
function createOutputFields($status, $value, $errorCount, $log){
	echo "<status>" 			. $status 		. "</status>";
	echo "<valueInDatabase>" 	. $value		. "</valueInDatabase>";
	echo "<errorCount>"			. $errorCount	. "</errorCount>";
	echo "<timeOutLog>" 		. $log			. "</timeOutLog>";
}
?>
