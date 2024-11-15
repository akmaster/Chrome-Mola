const recommendations = {
    'quick-break': {
        name: 'Hızlı Mola',
        workMinutes: 0.5,
        breakSeconds: 20,
        description: '30 sn çalış, 20 sn dinlen',
        breakType: 'sn'
    },
    'pomodoro': {
        name: 'Pomodoro Tekniği',
        workMinutes: 25,
        breakSeconds: 300,
        description: '25 dk çalış, 5 dk dinlen',
        breakType: 'dk'
    },
    '52-17': {
        name: '52/17 Kuralı',
        workMinutes: 52,
        breakSeconds: 1020,
        description: '52 dk çalış, 17 dk dinlen',
        breakType: 'dk'
    },
    '90-20': {
        name: '90/20 Tekniği',
        workMinutes: 90,
        breakSeconds: 1200,
        description: '90 dk çalış, 20 dk dinlen',
        breakType: 'dk'
    },
    '20-20-20': {
        name: 'Göz Sağlığı (20/20/20)',
        workMinutes: 20,
        breakSeconds: 20,
        description: '20 dk çalış, 20 sn dinlen',
        breakType: 'sn'
    },
    'long-session': {
        name: 'Uzun Oturum',
        workMinutes: 100,
        breakSeconds: 900,
        description: '100 dk çalış, 15 dk dinlen',
        breakType: 'dk'
    }
};

function updateStatisticsDisplay(period = 'daily') {
    chrome.storage.sync.get(['stats'], function(result) {
        const stats = result.stats || {};
        const today = new Date().toISOString().split('T')[0];
        
        let displayStats;
        if (period === 'daily') {
            displayStats = stats.daily?.[today] || {
                totalReminders: 0,
                urgentSkips: 0,
                completedExercises: 0
            };
        } else {
            displayStats = stats.weekly || {
                totalReminders: 0,
                urgentSkips: 0,
                completedExercises: 0
            };
        }
        
        document.getElementById('totalReminders').textContent = displayStats.totalReminders;
        document.getElementById('urgentSkips').textContent = displayStats.urgentSkips;
        document.getElementById('completedExercises').textContent = displayStats.completedExercises;
        
        const completionRate = displayStats.totalReminders === 0 ? 0 :
            Math.round((displayStats.completedExercises / displayStats.totalReminders) * 100);
        document.getElementById('completionRate').textContent = `${completionRate}%`;
    });
}

function saveSettings(settings) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ settings }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get({
            settings: {
                workDuration: 0.5,
                breakDuration: 20,
                enforceWait: false,
                urgentDelay: 5,
                playMusic: false,
                pauseVideos: true
            }
        }, function(result) {
            resolve(result.settings);
        });
    });
}

function updateUIWithSettings(settings) {
    document.getElementById('workDuration').value = settings.workDuration;
    document.getElementById('breakDuration').value = settings.breakDuration;
    document.getElementById('enforceWait').checked = settings.enforceWait;
    document.getElementById('urgentDelay').value = settings.urgentDelay;
    document.getElementById('urgentDelayValue').textContent = `${settings.urgentDelay} saniye`;
    document.getElementById('waitTimeContainer').style.display = 
        settings.enforceWait ? 'block' : 'none';
    document.getElementById('playMusic').checked = settings.playMusic;
    document.getElementById('pauseVideos').checked = settings.pauseVideos;
}

function showSaveAnimation(button) {
    const originalText = button.textContent;
    const originalColor = button.style.backgroundColor;
    
    button.textContent = 'Kaydedildi!';
    button.style.backgroundColor = '#2d6a4f';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = originalColor;
    }, 1500);
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const settings = await loadSettings();
        updateUIWithSettings(settings);
        
        // Önerileri oluştur
        const recommendationList = document.querySelector('.recommendation-list');
        recommendationList.innerHTML = '';

        Object.entries(recommendations).forEach(([key, rec]) => {
            const div = document.createElement('div');
            div.className = 'recommendation-item';
            div.dataset.type = key;
            div.innerHTML = `
                <span class="method">${rec.name}:</span>
                <span class="timing">${rec.description}</span>
            `;

            div.dataset.tooltip = `Çalışma: ${rec.workMinutes} dk, Mola: ${rec.breakSeconds} ${rec.breakType}`;
            recommendationList.appendChild(div);
        });

        // Event listeners
        document.getElementById('enforceWait').addEventListener('change', function() {
            document.getElementById('waitTimeContainer').style.display = 
                this.checked ? 'block' : 'none';
        });

        document.getElementById('urgentDelay').addEventListener('input', function() {
            document.getElementById('urgentDelayValue').textContent = `${this.value} saniye`;
        });

        // Tavsiye tıklama işlevselliği
        document.querySelectorAll('.recommendation-item').forEach(item => {
            item.addEventListener('click', function() {
                const recType = this.dataset.type;
                const rec = recommendations[recType];
                
                if (rec) {
                    document.getElementById('workDuration').value = rec.workMinutes;
                    document.getElementById('breakDuration').value = rec.breakSeconds;
                    document.getElementById('saveSettings').click();
                }
            });
        });

        // Period butonları
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                updateStatisticsDisplay(this.dataset.period);
            });
        });

        // İstatistikleri göster
        updateStatisticsDisplay('daily');

        // Kaydet butonu
        document.getElementById('saveSettings').addEventListener('click', async function() {
            const workDuration = parseFloat(document.getElementById('workDuration').value);
            const breakDuration = parseInt(document.getElementById('breakDuration').value);
            const enforceWait = document.getElementById('enforceWait').checked;
            const urgentDelay = parseInt(document.getElementById('urgentDelay').value);
            const playMusic = document.getElementById('playMusic').checked;
            const pauseVideos = document.getElementById('pauseVideos').checked;

            if (isNaN(workDuration) || isNaN(breakDuration) || 
                workDuration < 0.5 || breakDuration < 10 || 
                (enforceWait && (isNaN(urgentDelay) || urgentDelay < 1 || urgentDelay > 60))) {
                alert('Lütfen geçerli değerler girin!\nÇalışma süresi en az 0.5 dakika olmalıdır.');
                return;
            }

            try {
                await saveSettings({
                    workDuration,
                    breakDuration,
                    enforceWait,
                    urgentDelay,
                    playMusic,
                    pauseVideos
                });

                chrome.runtime.sendMessage({
                    action: "updateAlarm",
                    workDuration: workDuration
                });

                showSaveAnimation(this);
            } catch (error) {
                alert('Ayarlar kaydedilirken bir hata oluştu.');
                console.error('Settings save error:', error);
            }
        });

    } catch (error) {
        console.error('Popup initialization error:', error);
        alert('Ayarlar yüklenirken bir hata oluştu.');
    }
});