/**
 * background.js
 * Bu dosya, eklentinin arka planda çalışan ana bileşenidir.
 * Zamanlayıcı yönetimi, istatistik takibi ve tab kontrolü gibi işlemleri yönetir.
 */

// Global durum değişkenleri
let state = {
    activeMusicTabId: null,      // Aktif müzik çalan tab ID'si
    activeOverlayTabId: null,    // Aktif mola ekranı gösteren tab ID'si
    breakTimer: null,            // Mola zamanlayıcısı
    currentBreakDuration: 0,     // Mevcut mola süresi
    isBreakActive: false         // Mola durumu
};

/**
 * İlk kurulum fonksiyonu
 * Eklenti ilk yüklendiğinde varsayılan ayarları ve istatistikleri oluşturur
 */
function initializeState() {
    const today = new Date().toISOString().split('T')[0];
    
    // Varsayılan istatistikler
    const defaultStats = {
        daily: {
            [today]: {
                totalReminders: 0,    // Toplam hatırlatma sayısı
                urgentSkips: 0,       // Acil durumda atlanan mola sayısı
                completedExercises: 0  // Tamamlanan egzersiz sayısı
            }
        },
        weekly: {
            totalReminders: 0,
            urgentSkips: 0,
            completedExercises: 0,
            startDate: today
        }
    };

    // Varsayılan ayarlar
    const defaultSettings = {
        workDuration: 0.5,        // Çalışma süresi (dakika)
        breakDuration: 20,        // Mola süresi (saniye)
        enforceWait: false,       // Zorunlu bekleme
        urgentDelay: 5,          // Acil durum butonu gecikmesi
        playMusic: true,         // Müzik çalma durumu
        pauseVideos: true        // Video duraklatma durumu
    };

    // Ayarları ve istatistikleri kaydet
    chrome.storage.sync.get(['stats', 'settings'], function(result) {
        if (!result.stats) {
            chrome.storage.sync.set({ stats: defaultStats });
        }
        if (!result.settings) {
            chrome.storage.sync.set({ settings: defaultSettings });
        }
    });
}

/**
 * Mola zamanlayıcısını başlat
 * @param {number} duration - Mola süresi (saniye)
 */
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
            closeOverlay(false, true);  // İkinci parametre tamamlanan egzersizi belirtir
        }
    }, 1000);
}

/**
 * Mola ekranını göster
 */
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

/**
 * Mola ekranını kapat
 * @param {boolean} isUrgent - Acil durum butonu ile mi kapatıldı
 * @param {boolean} isCompleted - Mola süresi tamamlandı mı
 */
async function closeOverlay(isUrgent = false, isCompleted = false) {
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

    // İstatistik güncelleme
    if (isUrgent) {
        updateStats('urgent');
    } else if (isCompleted) {
        updateStats('completed');
    }

    resetWorkTimer();
}

/**
 * İstatistikleri güncelle
 * @param {string} type - İstatistik tipi (reminder/urgent/completed)
 */
function updateStats(type) {
    const today = new Date().toISOString().split('T')[0];
    
    chrome.storage.sync.get(['stats'], function(result) {
        let stats = result.stats || {};
        
        // Günlük istatistikleri kontrol et ve sıfırla
        if (!stats.daily) stats.daily = {};
        if (!stats.daily[today]) {
            stats.daily[today] = {
                totalReminders: 0,
                urgentSkips: 0,
                completedExercises: 0
            };
        }
        
        // Haftalık istatistikleri kontrol et
        if (!stats.weekly) {
            stats.weekly = {
                totalReminders: 0,
                urgentSkips: 0,
                completedExercises: 0,
                startDate: today
            };
        }
        
        // İstatistik tipine göre güncelle
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
        
        // Eski verileri temizle (7 günden eski)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        // Günlük istatistikleri temizle
        Object.keys(stats.daily).forEach(date => {
            if (new Date(date) < weekAgo) {
                delete stats.daily[date];
            }
        });
        
        // Haftalık istatistikleri kontrol et ve gerekirse sıfırla
        const weeklyStartDate = new Date(stats.weekly.startDate);
        if (weeklyStartDate < weekAgo) {
            stats.weekly = {
                totalReminders: 0,
                urgentSkips: 0,
                completedExercises: 0,
                startDate: today
            };
        }
        
        // Güncellenmiş istatist ikleri kaydet
        chrome.storage.sync.set({ stats: stats }, () => {
            console.log('İstatistikler güncellendi:', stats);
        });
    });
}

/**
 * Alarm yönetimi
 * @param {number} duration - Çalışma süresi (dakika)
 */
function updateAlarm(duration) {
    chrome.alarms.clear('healthReminder');
    chrome.alarms.create('healthReminder', {
        periodInMinutes: duration
    });
}

/**
 * Çalışma zamanlayıcısını sıfırla
 */
function resetWorkTimer() {
    chrome.storage.sync.get(['settings'], function(result) {
        if (result.settings && result.settings.workDuration) {
            updateAlarm(result.settings.workDuration);
        }
    });
}

// Event Listeners
chrome.runtime.onInstalled.addListener(initializeState);

// Tab kapatıldığında
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === state.activeMusicTabId) {
        state.activeMusicTabId = null;
    }
    if (tabId === state.activeOverlayTabId) {
        state.activeOverlayTabId = null;
        state.isBreakActive = false;
    }
});

// Tab değiştiğinde
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    if (state.isBreakActive && state.activeOverlayTabId && 
        state.activeOverlayTabId !== activeInfo.tabId) {
        updateStats('urgent');
        await closeOverlay(true);
    }
});

// Alarm tetiklendiğinde
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'healthReminder') {
        showOverlay();
    }
});

// Mesaj alındığında
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
            if (sender.tab) {
                state.activeOverlayTabId = sender.tab.id;
                // Hatırlatma istatistiğini ekle
                updateStats('reminder');
            }
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