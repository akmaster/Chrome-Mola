let state = {
    activeMusicTabId: null,
    activeOverlayTabIds: new Set(),
    breakTimer: null,
    currentBreakDuration: 0
};

function initializeState() {
    const today = new Date().toISOString().split('T')[0];
    const defaultStats = {
        daily: {
            [today]: {
                totalReminders: 0,
                urgentSkips: 0,
                completedExercises: 0
            }
        },
        weekly: {
            totalReminders: 0,
            urgentSkips: 0,
            completedExercises: 0,
            startDate: today
        }
    };

    chrome.storage.sync.get(['stats', 'settings'], function(result) {
        if (!result.stats) {
            chrome.storage.sync.set({ stats: defaultStats });
        }
        if (!result.settings) {
            chrome.storage.sync.set({
                settings: {
                    workDuration: 0.5,
                    breakDuration: 20,
                    enforceWait: false,
                    urgentDelay: 5,
                    playMusic: false,
                    pauseVideos: true
                }
            });
        }
    });
}

function startBreakTimer(duration) {
    state.currentBreakDuration = duration;
    clearInterval(state.breakTimer);
    
    state.breakTimer = setInterval(() => {
        state.currentBreakDuration--;
        
        broadcastToOverlayTabs({
            action: "updateTimer",
            seconds: state.currentBreakDuration
        });

        if (state.currentBreakDuration <= 0) {
            clearInterval(state.breakTimer);
            closeAllOverlays(false);
        }
    }, 1000);
}

function broadcastToOverlayTabs(message) {
    state.activeOverlayTabIds.forEach(tabId => {
        chrome.tabs.sendMessage(tabId, message).catch(() => {
            state.activeOverlayTabIds.delete(tabId);
        });
    });
}

function resetWorkTimer() {
    chrome.storage.sync.get(['settings'], function(result) {
        if (result.settings && result.settings.workDuration) {
            updateAlarm(result.settings.workDuration);
        }
    });
}

function closeAllOverlays(isUrgent = false) {
    clearInterval(state.breakTimer);
    state.currentBreakDuration = 0;
    
    broadcastToOverlayTabs({
        action: "closeOverlay",
        isUrgent: isUrgent
    });
    
    state.activeOverlayTabIds.clear();
    state.activeMusicTabId = null;

    resetWorkTimer();
}

function handleMusicRequest(tabId) {
    if (state.activeMusicTabId === null) {
        state.activeMusicTabId = tabId;
        return true;
    }
    return state.activeMusicTabId === tabId;
}

function updateStats(type) {
    const today = new Date().toISOString().split('T')[0];
    
    chrome.storage.sync.get(['stats'], function(result) {
        let stats = result.stats || {};
        
        if (!stats.daily) stats.daily = {};
        if (!stats.daily[today]) {
            stats.daily[today] = {
                totalReminders: 0,
                urgentSkips: 0,
                completedExercises: 0
            };
        }
        
        if (!stats.weekly) {
            stats.weekly = {
                totalReminders: 0,
                urgentSkips: 0,
                completedExercises: 0,
                startDate: today
            };
        }
        
        switch(type) {
            case 'reminder':
                stats.daily[today].totalReminders++;
                stats.weekly.totalReminders++;
                break;
            case 'urgent':
                stats.daily[today].urgentSkips++;
                stats.weekly.urgentSkips++;
                break;
            case 'completed':
                stats.daily[today].completedExercises++;
                stats.weekly.completedExercises++;
                break;
        }
        
        const now = new Date();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        
        Object.keys(stats.daily).forEach(date => {
            if (new Date(date) < weekAgo) {
                delete stats.daily[date];
            }
        });
        
        if (new Date(stats.weekly.startDate) < weekAgo) {
            stats.weekly = {
                totalReminders: 0,
                urgentSkips: 0,
                completedExercises: 0,
                startDate: today
            };
        }
        
        chrome.storage.sync.set({ stats: stats });
    });
}

function updateAlarm(duration) {
    chrome.alarms.clear('healthReminder');
    chrome.alarms.create('healthReminder', {
        periodInMinutes: duration
    });
}

chrome.runtime.onInstalled.addListener(initializeState);

chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === state.activeMusicTabId) {
        state.activeMusicTabId = null;
    }
    state.activeOverlayTabIds.delete(tabId);
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'healthReminder') {
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {action: "showOverlay"});
                state.activeOverlayTabIds.add(tab.id);
            });
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case "requestMusicPermission":
            sendResponse({ canPlay: handleMusicRequest(sender.tab.id) });
            break;
            
        case "updateAlarm":
            updateAlarm(request.workDuration);
            break;
            
        case "startBreakTimer":
            startBreakTimer(request.duration);
            state.activeOverlayTabIds.add(sender.tab.id);
            break;
            
        case "closeAllOverlays":
            closeAllOverlays(true);
            break;
            
        case "updateStats":
            updateStats(request.type);
            break;
            
        case "registerOverlay":
            state.activeOverlayTabIds.add(sender.tab.id);
            sendResponse({ currentTimer: state.currentBreakDuration });
            break;
            
        case "resetWorkTimer":
            resetWorkTimer();
            break;
    }
    return true;
});