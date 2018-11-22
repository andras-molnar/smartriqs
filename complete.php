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
header("Access-Control-Allow-Origin: *"); 		// Do NOT change this line. This ensures streamlined communcation between Qualtrics and the server.
$status = "null";								// Status variable. Used for communcation between Qualtrics and the server.
$found = 0;										// Dummy variable: 0 if participantID is not in study database, 1 if participantID is already in database.
$errorCount = 0;    							// Error count. If everything works fine, this remains 0.

// Add functions
include "functions.php";

// Get values from query string
if (empty($_GET["researcherID"])) 			{errorMessage("001");} 	else {$researcherID = 	$_GET["researcherID"];}
if (empty($_GET["studyID"])) 				{errorMessage("002");} 	else {$studyID = 		$_GET["studyID"];}
if (empty($_GET["participantID"])) 			{errorMessage("003");} 	else {$participantID = 	$_GET["participantID"];}
if (empty($_GET["groupSize"])) 				{errorMessage("004");} 	else {$groupSize = 		$_GET["groupSize"];}
if (empty($_GET["numStages"]))      		{errorMessage("005");}	else {$numStages = 		$_GET["numStages"];}

// Check if values are valid
if (file_exists($researcherID) == FALSE)	{errorMessage("101");};
if (in_array($groupSize, array(2,3,4,5,6,7,8)) == FALSE)	{errorMessage("104");}
if (filter_var($numStages, FILTER_VALIDATE_INT) == FALSE or $numStages < 1)	{errorMessage("105");}
if (count($conditionsArray) > 1 and in_array($participantCondition, $conditionsArray) == FALSE and $participantCondition != "random")	{errorMessage("108");}

// Retrieve database 
if ($errorCount == 0) {
	
	$playerIndexArray = getPlayerIndexes($groupSize, $numStages);	// Get player indexes based on group size and number of stages
	$datafile = $researcherID . "/" . $studyID . "_rawdata.csv"; 	// Get path of database
	
	if (file_exists($datafile) == FALSE) {errorMessage("102");}		// Display error if database does not exist
	
	else {	// If database exists, import it and check the header, and whether the participant is in the database
		$dataTable = importData($datafile); 
		checkHeader($dataTable, $groupSize, $numStages, NULL); // Check if header matches the values obtained from the query string
		selectGroup($dataTable, $groupSize, $participantID, $playerIndexArray);		
    }
}	

if ($found == 1) { 	complete($datafile, $groupData, $participantIndex);}
else {errorMessage("103");}	


// Function that sets the participant's status to 'completed'. If everyone else in the group has finished as well, set the group status to 'completed'.
function complete($datafile, $group,$i){
	global $status, $playerIndexArray;
	$group[$i+1] = "completed"; $status = $status . "Successfully changed player status to 'completed'.";
	
	$groupCompleted = 1;
	for ($n = 0; $n < count($playerIndexArray); $n++){
		if ($group[$playerIndexArray[$n]+1] != "completed") {
			$groupCompleted = 0; break;
		}
	}
	
	if ($groupCompleted == 1){
		$group[2] = "completed"; $status = $status . "<p>Successfully changed group status to 'completed'.</p>";
	}
	else {
		$status = $status . "<p>The group has not completed the study yet.</p>";
	}
	
	addData($complete, $group, $datafile);	// Add new/updated group data to the datafile 
}
?>