let activeOverlay = false;

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('healthReminder', {
        periodInMinutes: 15
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'healthReminder') {
        showOverlayOnAllTabs();
    }
});

chrome.action.onClicked.addListener((tab) => {
    showOverlayOnAllTabs();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "closeOverlay") {
        closeOverlayOnAllTabs();
    }
});

function showOverlayOnAllTabs() {
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {action: "showOverlay"});
        });
    });
}

function closeOverlayOnAllTabs() {
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {action: "closeOverlay"});
        });
    });
}

// Sonra Birşey Yazılacak