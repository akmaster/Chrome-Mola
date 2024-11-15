let activeOverlay = false;

function updateAlarm(duration) {
    chrome.alarms.clear('healthReminder');
    chrome.alarms.create('healthReminder', {
        periodInMinutes: duration
    });
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get({
        workDuration: 25,
        breakDuration: 300
    }, function(items) {
        updateAlarm(items.workDuration);
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'healthReminder') {
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {action: "showOverlay"});
            });
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateAlarm") {
        updateAlarm(request.workDuration);
    } else if (request.action === "closeOverlay") {
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {action: "closeOverlay"});
            });
        });
    }
});