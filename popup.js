/**
 * popup.js
 * Bu dosya, ayarlar penceresinin işlevselliğini yönetir.
 * Ayarların kaydedilmesi, istatistiklerin gösterilmesi ve önerilerin yönetimini sağlar.
 */

// Önerilen çalışma programları
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

/**
 * İstatistikleri güncelle ve göster
 * @param {string} period - İstatistik periyodu (daily/weekly)
 */
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
        
        // İstatistik değerlerini güncelle
        document.getElementById('totalReminders').textContent = displayStats.totalReminders;
        document.getElementById('urgentSkips').textContent = displayStats.urgentSkips;
        document.getElementById('completedExercises').textContent = displayStats.completedExercises;
        
        // Tamamlanma oranını hesapla
        const completionRate = displayStats.totalReminders === 0 ? 0 :
            Math.round((displayStats.completedExercises / displayStats.totalReminders) * 100);
        document.getElementById('completionRate').textContent = `${completionRate}%`;
    });
}

/**
 * Ayarları kaydet
 * @param {Object} settings - Kaydedilecek ayarlar
 */
async function saveSettings(settings) {
    console.log('Ayarlar kaydediliyor:', settings);
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ settings }, () => {
            if (chrome.runtime.lastError) {
                console.error('Ayar kaydetme hatası:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                console.log('Ayarlar başarıyla kaydedildi');
                // Alarm süresini güncelle
                chrome.runtime.sendMessage({
                    action: "updateAlarm",
                    workDuration: settings.workDuration
                });
                resolve();
            }
        });
    });
}

/**
 * Kayıtlı ayarları yükle
 * @returns {Promise<Object>} Yüklenen ayarlar
 */
async function loadSettings() {
    return new Promise((resolve) => {
        const defaultSettings = {
            workDuration: 0.5,
            breakDuration: 20,
            enforceWait: false,
            urgentDelay: 5,
            playMusic: true,
            pauseVideos: true
        };

        chrome.storage.sync.get(['settings'], function(result) {
            console.log('Yüklenen ayarlar:', result.settings || defaultSettings);
            resolve(result.settings || defaultSettings);
        });
    });
}

/**
 * UI elementlerini ayarlarla güncelle
 * @param {Object} settings - Uygulanacak ayarlar
 */
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

/**
 * Kaydetme animasyonu göster
 * @param {HTMLElement} button - Animasyon uygulanacak buton
 */
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

// Sayfa yüklendiğinde çalışacak ana fonksiyon
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Popup başlatılıyor...');
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

            // Öneri tıklama olayı
            div.addEventListener('click', function() {
                const recType = this.dataset.type;
                const rec = recommendations[recType];
                
                if (rec) {
                    document.getElementById('workDuration').value = rec.workMinutes;
                    document.getElementById('breakDuration').value = rec.breakSeconds;
                    document.getElementById('saveSettings').click();
                }
            });
        });

        // Zorunlu Bekleme checkbox olayı
        document.getElementById('enforceWait').addEventListener('change', function() {
            document.getElementById('waitTimeContainer').style.display = 
                this.checked ? 'block' : 'none';
        });

        // Slider değişim olayı
        document.getElementById('urgentDelay').addEventListener('input', function() {
            document.getElementById('urgentDelayValue').textContent = `${this.value} saniye`;
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
            // Form değerlerini al
            const workDuration = parseFloat(document.getElementById('workDuration').value);
            const breakDuration = parseInt(document.getElementById('breakDuration').value);
            const enforceWait = document.getElementById('enforceWait').checked;
            const urgentDelay = parseInt(document.getElementById('urgentDelay').value);
            const playMusic = document.getElementById('playMusic').checked;
            const pauseVideos = document.getElementById('pauseVideos').checked;

            // Değerleri kontrol et
            if (isNaN(workDuration) || isNaN(breakDuration) || 
                workDuration < 0.5 || breakDuration < 10 || 
                (enforceWait && (isNaN(urgentDelay) || urgentDelay < 1 || urgentDelay > 60))) {
                alert('Lütfen geçerli değerler girin!\nÇalışma süresi en az 0.5 dakika olmalıdır.');
                return;
            }

            // Yeni ayarları oluştur
            const newSettings = {
                workDuration,
                breakDuration,
                enforceWait,
                urgentDelay,
                playMusic,
                pauseVideos
            };

            console.log('Yeni ayarlar kaydediliyor:', newSettings);

            try {
                await saveSettings(newSettings);
                showSaveAnimation(this);
            } catch (error) {
                console.error('Ayarlar kaydedilemedi:', error);
                alert('Ayarlar kaydedilirken bir hata oluştu.');
            }
        });

    } catch (error) {
        console.error('Popup başlatma hatası:', error);
        alert('Ayarlar yüklenirken bir hata oluştu.');
    }
});