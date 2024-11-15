let activeOverlay = false;

function initializeStats() {
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

    chrome.storage.sync.get(['stats'], function(result) {
        if (!result.stats) {
            chrome.storage.sync.set({ stats: defaultStats });
        }
    });
}

function updateStats(type) {
    const today = new Date().toISOString().split('T')[0];
    
    chrome.storage.sync.get(['stats'], function(result) {
        let stats = result.stats || {};
        
        // Günlük istatistikleri başlat
        if (!stats.daily) stats.daily = {};
        if (!stats.daily[today]) {
            stats.daily[today] = {
                totalReminders: 0,
                urgentSkips: 0,
                completedExercises: 0
            };
        }
        
        // Haftalık istatistikleri başlat
        if (!stats.weekly) {
            stats.weekly = {
                totalReminders: 0,
                urgentSkips: 0,
                completedExercises: 0,
                startDate: today
            };
        }
        
        // İstatistikleri güncelle
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
        
        // Haftalık istatistikleri temizle (7 günden eski ise)
        const startDate = new Date(stats.weekly.startDate);
        const now = new Date();
        const daysDiff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff >= 7) {
            stats.weekly = {
                totalReminders: 0,
                urgentSkips: 0,
                completedExercises: 0,
                startDate: today
            };
        }
        
        // Eski günlük kayıtları temizle (7 günden eski)
        Object.keys(stats.daily).forEach(date => {
            const entryDate = new Date(date);
            if ((now - entryDate) / (1000 * 60 * 60 * 24) >= 7) {
                delete stats.daily[date];
            }
        });
        
        chrome.storage.sync.set({ stats: stats });
    });
}

function updateAlarm(duration) {
    chrome.alarms.clear('healthReminder');
    chrome.alarms.create('healthReminder', {
        periodInMinutes: duration
    });
}

chrome.runtime.onInstalled.addListener(() => {
    initializeStats();
    chrome.storage.sync.get({
        workDuration: 0.5,
        breakDuration: 20,
        enforceWait: false,
        urgentDelay: 5,
        playMusic: false,
        pauseVideos: true
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
    } else if (request.action === "updateStats") {
        updateStats(request.type);
    }
});