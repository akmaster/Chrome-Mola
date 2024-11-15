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

document.addEventListener('DOMContentLoaded', function() {
    // Mevcut ayarları yükle
    chrome.storage.sync.get({
        workDuration: 0.5,
        breakDuration: 20,
        enforceWait: false,
        urgentDelay: 5,
        playMusic: false,
        pauseVideos: true
    }, function(items) {
        document.getElementById('workDuration').value = items.workDuration;
        document.getElementById('breakDuration').value = items.breakDuration;
        document.getElementById('enforceWait').checked = items.enforceWait;
        document.getElementById('urgentDelay').value = items.urgentDelay;
        document.getElementById('urgentDelayValue').textContent = `${items.urgentDelay} saniye`;
        document.getElementById('waitTimeContainer').style.display = 
            items.enforceWait ? 'block' : 'none';
        document.getElementById('playMusic').checked = items.playMusic;
        document.getElementById('pauseVideos').checked = items.pauseVideos;
    });

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

    // Zorunlu Bekleme checkbox olayı
    document.getElementById('enforceWait').addEventListener('change', function() {
        document.getElementById('waitTimeContainer').style.display = 
            this.checked ? 'block' : 'none';
    });

    // Slider değişim olayı
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

    // Period butonlarına tıklama olayı
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateStatisticsDisplay(this.dataset.period);
        });
    });

    // İstatistikleri göster
    updateStatisticsDisplay('daily');

    // Kaydet butonu işlevselliği
    document.getElementById('saveSettings').addEventListener('click', function() {
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

        const alarmDuration = Math.max(0.5, workDuration);

        chrome.storage.sync.set({
            workDuration: workDuration,
            breakDuration: breakDuration,
            enforceWait: enforceWait,
            urgentDelay: urgentDelay,
            playMusic: playMusic,
            pauseVideos: pauseVideos
        }, function() {
            chrome.runtime.sendMessage({
                action: "updateAlarm",
                workDuration: alarmDuration
            });

            const button = document.getElementById('saveSettings');
            button.textContent = 'Kaydedildi!';
            button.style.backgroundColor = '#2d6a4f';
            setTimeout(() => {
                button.textContent = 'Kaydet';
                button.style.backgroundColor = '#4ecca3';
            }, 1500);
        });
    });
});