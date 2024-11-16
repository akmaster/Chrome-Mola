// background.js
let state = {
    activeMusicTabId: null,
    activeOverlayTabId: null,
    breakTimer: null,
    currentBreakDuration: 0,
    isBreakActive: false
};

// İlk kurulum
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

    const defaultSettings = {
        workDuration: 0.5,
        breakDuration: 20,
        enforceWait: false,
        urgentDelay: 5,
        playMusic: true,  // Varsayılan olarak müzik açık
        pauseVideos: true
    };

    chrome.storage.sync.get(['stats', 'settings'], function(result) {
        if (!result.stats) {
            chrome.storage.sync.set({ stats: defaultStats });
        }
        if (!result.settings) {
            chrome.storage.sync.set({ settings: defaultSettings });
        }
    });
}

// Aktif tab kontrolü
async function isTabActive(tabId) {
    try {
        const tab = await chrome.tabs.get(tabId);
        return tab.active;
    } catch {
        return false;
    }
}

// Zamanlayıcı yönetimi
function startBreakTimer(duration) {
    state.currentBreakDuration = duration;
    state.isBreakActive = true;
    clearInterval(state.breakTimer);
    
    state.breakTimer = setInterval(async () => {
        state.currentBreakDuration--;
        
        if (state.activeOverlayTabId) {
            try {
                await chrome.tabs.sendMessage(state.activeOverlayTabId, {
                    action: "updateTimer",
                    seconds: state.currentBreakDuration
                });
            } catch {
                clearInterval(state.breakTimer);
                state.activeOverlayTabId = null;
                state.isBreakActive = false;
            }
        }

        if (state.currentBreakDuration <= 0) {
            clearInterval(state.breakTimer);
            closeOverlay(false);
        }
    }, 1000);
}

// Overlay yönetimi
async function showOverlay() {
    try {
        const [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (activeTab) {
            await chrome.tabs.sendMessage(activeTab.id, {action: "showOverlay"});
            state.activeOverlayTabId = activeTab.id;
            state.isBreakActive = true;
        }
    } catch (error) {
        console.warn('Overlay gösterme hatası:', error);
    }
}

async function closeOverlay(isUrgent = false) {
    clearInterval(state.breakTimer);
    state.currentBreakDuration = 0;
    state.isBreakActive = false;
    
    if (state.activeOverlayTabId) {
        try {
            await chrome.tabs.sendMessage(state.activeOverlayTabId, {
                action: "closeOverlay",
                isUrgent: isUrgent
            });
        } catch {
            // Tab kapanmış olabilir, yoksay
        }
        state.activeOverlayTabId = null;
        state.activeMusicTabId = null;
    }

    resetWorkTimer();
}

// Müzik yönetimi
function handleMusicRequest(tabId) {
    console.log('Müzik izni istendi:', tabId);
    if (state.activeMusicTabId === null) {
        state.activeMusicTabId = tabId;
        return true;
    }
    return state.activeMusicTabId === tabId;
}

// İstatistik yönetimi
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
        
        // Eski verileri temizle
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

// Alarm yönetimi
function updateAlarm(duration) {
    chrome.alarms.clear('healthReminder');
    chrome.alarms.create('healthReminder', {
        periodInMinutes: duration
    });
}

function resetWorkTimer() {
    chrome.storage.sync.get(['settings'], function(result) {
        if (result.settings && result.settings.workDuration) {
            updateAlarm(result.settings.workDuration);
        }
    });
}

// Event Listeners
chrome.runtime.onInstalled.addListener(initializeState);

chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === state.activeMusicTabId) {
        state.activeMusicTabId = null;
    }
    if (tabId === state.activeOverlayTabId) {
        state.activeOverlayTabId = null;
        state.isBreakActive = false;
    }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    if (state.isBreakActive && state.activeOverlayTabId && 
        state.activeOverlayTabId !== activeInfo.tabId) {
        updateStats('urgent');
        await closeOverlay(true);
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'healthReminder') {
        showOverlay();
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Mesaj alındı:', request);
    
    switch (request.action) {
        case "requestMusicPermission":
            sendResponse({ canPlay: handleMusicRequest(sender.tab.id) });
            break;
            
        case "updateAlarm":
            updateAlarm(request.workDuration);
            break;
            
        case "startBreakTimer":
            startBreakTimer(request.duration);
            if (sender.tab) state.activeOverlayTabId = sender.tab.id;
            break;
            
        case "closeOverlay":
            closeOverlay(true);
            break;
            
        case "updateStats":
            updateStats(request.type);
            break;
    }
    return true;
});