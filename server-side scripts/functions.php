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

// This function adds data to the datafile.
function addData($handle_name,$data, $datafile){
	$handle_name = fopen($datafile, "a"); 
		fputcsv($handle_name, $data);
    fclose($handle_name);
}


// This function checks if the data received via the query string matches the header of the existing datafile
function checkHeader($dataTable, $groupSize, $numStages, $rolesArray){
	global $headerGroupSize, $headerNumStages, $headerRolesArray;
	
	$importedHeader = implode(",",$dataTable[0]);
	$headerGroupSize = substr_count($importedHeader, "Last active");
	$headerNumStages = substr_count($importedHeader, "#") / (max(1,$headerGroupSize));
	
	for ($i = 0; $i < $headerGroupSize; $i++){
		$headerRolesArray[$i] = $dataTable[0][3 + ($headerNumStages + 2) * $i];
	}
	
	if ($headerGroupSize != $groupSize) 	{errorMessage("202");}
	if ($headerNumStages != $numStages) 	{errorMessage("203");}
	if ($rolesArray != NULL){
		if ($headerRolesArray !== $rolesArray) 	{errorMessage("204");}
	}	
}


// This function retrieves player indexes based on group size and the number of stages
function getPlayerIndexes($groupSize, $numStages) {
    $playerIndexArray = [];
	for ($i = 0; $i < $groupSize; $i++){
		array_push($playerIndexArray,$i * ($numStages +2) +3);
	}
	return $playerIndexArray;
}


// Retrieve the current time in the selected time zone (UTC+0 is the default)
function getTime($timeZone){
	date_default_timezone_set('Europe/London');	// Set default time zone to UTC+0.
	if (filter_var($timeZone, FILTER_VALIDATE_INT) == FALSE || $timeZone < -12 || $timeZone > 12) {$timeZone = 0;} // Use the default time zone if the time zone is invalid
	$currentTime = time() + $timeZone*3600; // Adjust time if necessary.
	return $currentTime;
}


// This function imports the datafile
function importData($data){
	$dataTable = [];
	$handle_data = fopen($data, "r");
	$row = 0;
	$allGroups = [];
	while (($thisRow = fgetcsv($handle_data)) !== false) {
		if (in_array($thisRow[0], $allGroups) == FALSE) {		// If this group is not in the data table yet, add.
			array_push($allGroups, $thisRow[0]);
			array_push($dataTable,$thisRow);
		}
		else {								// If this group is already in the data table, update.
			$dataTable[array_search($thisRow[0], $allGroups)] = $thisRow;
		}
		$row++;
	}
	fclose($handle_data);
	return $dataTable;
}


// This function selects the participant's group
function selectGroup($dataTable, $groupSize, $participantID, $playerIndexArray){
	global $found, $participantIndex, $groupData;
	
	for ($i = 0; $i < count($dataTable); $i++) {
		$thisGroup = $dataTable[$i];

		for ($j = 0; $j < $groupSize; $j++){
			if ($thisGroup[$playerIndexArray[$j]] == $participantID) {
				$found = 1;	
				$participantIndex = $playerIndexArray[$j]; 
				$groupData = $thisGroup;
			}	
		}
    }
}


// This is the function that adds error messages to the status variable
function errorMessage($errorID) {
	global $status, $errorCount, $researcherID, $studyID, $participantID, $groupSize, $numStages, $participantRole, $participantCondition,
	$roles, $conditions, $botMatch, $headerGroupSize, $headerNumStages, $headerRolesArray, $rolesArray, $dropInactivePlayers, $displayStyle,
	$sendStage, $getStage, $getValuesArray, $defaultValuesArray;
	
	$errorCount++; // Increment error counter whenever this function is called

	###	001-099 Missing input errors
	if ($errorID == "001"){$messageText = "Researcher ID is missing.";}
	if ($errorID == "002"){$messageText = "Study ID is missing.";}
	if ($errorID == "003"){$messageText = "Participant ID is missing.";}
	if ($errorID == "004"){$messageText = "Group size is missing.";}
	if ($errorID == "005"){$messageText = "Number of stages is missing.";}
	if ($errorID == "006"){$messageText = "Roles are missing.";}
	if ($errorID == "007"){$messageText = "Participant role is missing.";}
	if ($errorID == "008"){$messageText = "Stage number is missing.";}
	if ($errorID == "009"){$messageText = "Value is missing.";}
	if ($errorID == "010"){$messageText = "Group ID is missing.";}
	
	###	101-199 Invalid data errors
	if ($errorID == "101"){$messageText = "Invalid researcher ID (" . $researcherID . "). This ID does not exist. Make sure that you used the correct ID. The ID is case sensitive.<br>If you think the ID you provided is correct, please contact the site admin at: support@smartriqs.com.";}
	if ($errorID == "102"){$messageText = "Invalid study ID (" . $studyID . "). This study does not exist. Make sure that you used the correct ID. The ID is case sensitive.";}
	if ($errorID == "103"){$messageText = "Invalid participant ID (" . $participantID . "). This participants is not in the database of study " . $studyID . ". The ID is case sensitive.";}
	if ($errorID == "104"){$messageText = "Invalid group size (" . $groupSize . "). Group size must be between 2 and 8.";}
	if ($errorID == "105"){$messageText = "Invalid number of stages (" . $numStages . "). Number of stages must be a positive integer.";}
	if ($errorID == "106"){$messageText = "Invalid participant role (" . $participantRole . "). Participant role must be 'random' or one of the following: " . $roles . ". Role is case sensitive.";}
	if ($errorID == "107"){$messageText = "Invalid value for 'stage' (" . $sendStage  . $getStage . "). Stage should be an integer between 1 and " . $numStages . ".";};
	if ($errorID == "108"){$messageText = "Invalid participant condition (" . $participantCondition . "). Participant condition must be 'random' or one of the following:<br>" . $conditions . ". <br>Condition name is case sensitive.";}
	
	
	###	201-299 Data mismatch errors
	if ($errorID == "201"){$messageText = "Group size (" . $groupSize . ") does not match the number of roles (" . count($rolesArray) . ").";}
	if ($errorID == "202"){$messageText = "The group size in the existing data (" . $headerGroupSize . ") does not match the group size defined for this participant (" . $groupSize . ").";}
	if ($errorID == "203"){$messageText = "The number of stages in the existing data (" . $headerNumStages . ") does not match the number of stages defined for this participant (" . $numStages . ").";}
	if ($errorID == "204"){$messageText = "The roles in the existing data (" . implode(',', $headerRolesArray) . ") do not match the roles defined for this participant (" . implode(',',$rolesArray) . "). The roles are case sensitive and the order of roles must be the same.";}
	if ($errorID == "205"){$messageText = "The value(s) to be retrieved (" . implode(',',$getValuesArray) . ") do not match the roles defined for this study (" . implode(',',$rolesArray) . ").";}
	if ($errorID == "206"){$messageText = "The number of default responses (" . count($defaultValuesArray) . ") is different from the number of values to be retrieved (" . count($getValuesArray) . "). These two numbers must be the same.";}
	
	
	###	301-399 Miscallenous errors
	
	
	###	401-599 Reserved (default browser error codes) ###### 
	#														#
	#	It is not recommended to assign any error codes 	#
	#	between 401-599 to avoid any confusions. 			#
	#														#
	#	401 -- Unathorized Access							#
	#	403 -- Forbidden Access 							#
	#	404 -- Page Not Found								#
	#	500 -- Internal Server Error						#
	#	503 -- Service Unavailable							#
	#														#
	#########################################################
	
	// Add error to status
	$status = $status . "<p style='font-weight:bold; color:red'>ERROR " . $errorID . " : " . $messageText . "</p></br>";
}
?>
