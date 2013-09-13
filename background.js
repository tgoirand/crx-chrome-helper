
var rePattern = new RegExp('^(http[s]?[:]//[^/]+[^\.]+)\.([a-zA-Z0-9]+)');

 

function isUrlExisting(url, tabId) 
{
	var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (this.readyState == this.DONE) {

            if (this.status == 200 && this.getResponseHeader('Content-Type').indexOf('application/json') == 0) {
				chrome.pageAction.show(tabId);
			}
        }
    };
    xhr.open("GET", url, false);
    xhr.send(null);
	
}

function checkForValidUrl(tabId, changeInfo, tab) {
    var grps = rePattern.exec(tab.url);

    if (grps.length > 2 && grps[2].toLowerCase() == 'html') {
		isUrlExisting(grps[1] + '.-1.tidy.json', tabId);
    }

};

chrome.tabs.onUpdated.addListener(checkForValidUrl);
