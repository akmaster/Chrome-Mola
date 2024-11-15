document.addEventListener('DOMContentLoaded', function() {
    // Mevcut ayarları yükle
    chrome.storage.sync.get({
        workDuration: 25,  // Varsayılan değer olarak Pomodoro tekniğini kullan
        breakDuration: 300 // 5 dakika
    }, function(items) {
        document.getElementById('workDuration').value = items.workDuration;
        document.getElementById('breakDuration').value = items.breakDuration;
    });

    document.getElementById('saveSettings').addEventListener('click', function() {
        const workDuration = parseInt(document.getElementById('workDuration').value);
        const breakDuration = parseInt(document.getElementById('breakDuration').value);

        if (isNaN(workDuration) || isNaN(breakDuration) || 
            workDuration < 1 || breakDuration < 10) {
            alert('Lütfen geçerli değerler girin!');
            return;
        }

        chrome.storage.sync.set({
            workDuration: workDuration,
            breakDuration: breakDuration
        }, function() {
            chrome.runtime.sendMessage({
                action: "updateAlarm",
                workDuration: workDuration
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

    // Tavsiye öğelerine tıklama işlevselliği ekle
    document.querySelectorAll('.recommendation-item').forEach(item => {
        item.addEventListener('click', function() {
            const timingText = this.querySelector('.timing').textContent;
            const matches = timingText.match(/(\d+)\s*dk\s*çalış,\s*(\d+)\s*(?:dk|sn)\s*dinlen/);
            
            if (matches) {
                const workMin = parseInt(matches[1]);
                const breakSec = matches[2] * (timingText.includes('dk') ? 60 : 1);
                
                document.getElementById('workDuration').value = workMin;
                document.getElementById('breakDuration').value = breakSec;
                
                // Otomatik kaydet
                document.getElementById('saveSettings').click();
            }
        });
    });
});