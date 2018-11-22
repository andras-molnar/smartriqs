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
	var loadAnimationURL = Qualtrics.SurveyEngine.getEmbeddedData("loadAnimationURL");
	if (loadAnimationURL == "" || loadAnimationURL == null){
		Qualtrics.SurveyEngine.setEmbeddedData("loadAnimationURL","https://upload.wikimedia.org/wikipedia/commons/b/b1/Loading_icon.gif" );
	}
	
	var numOthers 	= parseInt(Qualtrics.SurveyEngine.getEmbeddedData("groupSize")) - 1;	
	if (numOthers == 1){
		document.getElementById("prematchText").innerHTML = "<strong><span style='background-color:#AFEEEE;'>On the next screen, you will be matched with another participant.</span></strong>";
	}
	else{
			document.getElementById("prematchText").innerHTML = "<strong><span style='background-color:#AFEEEE;'>On the next screen, you will be matched with " + numOthers + " other participants.</span></strong>";
	}
});