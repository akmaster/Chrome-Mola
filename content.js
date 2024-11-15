const healthMessages = [
    "🌟 Gözlerinizi dinlendirme vakti! 20 feet (6 metre) uzaklıktaki bir noktaya 20 saniye bakın.\n💭 \"Gözlerinize gösterdiğiniz özen, geleceğinize yaptığınız yatırımdır!\"",
    
    "💪 Omuzlarınızı 5 kez öne, 5 kez arkaya çevirin. Gerginliğin akıp gittiğini hissedin!\n💭 \"Her küçük hareket, daha sağlıklı bir yaşama doğru atılan bir adımdır!\"",
    
    "🧘‍♀️ Ellerinizi başınızın üzerinde kenetleyin ve nazikçe esneyerek uzanın.\n💭 \"Kendinize ayırdığınız bu kısa an, tüm gününüzü değiştirebilir!\"",
    
    "🦶 Ayağa kalkın ve parmak uçlarınızda 10 kez yükselip alçalın.\n💭 \"Hareket etmek özgürlüktür, dans eder gibi esneyin!\"",
    
    "🌈 Derin bir nefes alın, 4'e kadar sayın ve yavaşça verin. 3 kez tekrarlayın.\n💭 \"Her nefes yeni bir başlangıçtır, kendinizi yenileyin!\"",
    
    "⚡ Masanızdan kalkın ve 2 dakika boyunca yerinizde yürüyün.\n💭 \"Küçük molalar, büyük enerjiler getirir!\"",
    
    "🎯 Başınızı yavaşça sağa ve sola çevirin, her yönde 10 saniye tutun.\n💭 \"Bedeninizi dinleyin, size ne söylediğini duyun!\"",
    
    "🌺 Bileklerinizi her iki yöne 10'ar kez çevirin.\n💭 \"Her hareket sizi daha güçlü, daha dinç yapıyor!\"",
    
    "🎈 Parmaklarınızı açıp kapatın ve 10 saniye boyunca ellerinizi sallayın.\n💭 \"Kendinize gösterdiğiniz özen, başarınızın anahtarıdır!\"",
    
    "🌟 Kollarınızı iki yana açın ve küçük daireler çizin.\n💭 \"Bu molalar, verimliliğinizin süper gücü!\""
];

let globalCountdown = null;
let globalOverlay = null;
let currentAudio = null;
let pausedVideos = [];

function pauseAllVideos() {
    const videos = document.querySelectorAll('video');
    const iframes = document.querySelectorAll('iframe');
    
    videos.forEach(video => {
        if (!video.paused) {
            video.pause();
            pausedVideos.push(video);
        }
    });

    iframes.forEach(iframe => {
        if (iframe.src.includes('youtube.com') || iframe.src.includes('youtu.be')) {
            iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            pausedVideos.push(iframe);
        }
    });
}

function resumePausedVideos() {
    pausedVideos.forEach(element => {
        if (element instanceof HTMLVideoElement) {
            element.play();
        } else if (element instanceof HTMLIFrameElement) {
            element.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        }
    });
    pausedVideos = [];
}

function playRandomMusic() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }

    const musicFiles = ['music1.mp3', 'music2.mp3'];
    const randomMusic = musicFiles[Math.floor(Math.random() * musicFiles.length)];
    
    currentAudio = new Audio(chrome.runtime.getURL(`audio/${randomMusic}`));
    currentAudio.loop = true;
    
    // Ses kademeli olarak artacak
    currentAudio.volume = 0;
    currentAudio.play().then(() => {
        let volume = 0;
        const fadeInterval = setInterval(() => {
            volume = Math.min(volume + 0.1, 1.0);
            currentAudio.volume = volume;
            if (volume >= 1.0) clearInterval(fadeInterval);
        }, 200);
    }).catch(error => console.log('Müzik çalma hatası:', error));
}

function stopMusic() {
    if (currentAudio) {
        // İşim Acil butonuna basıldığında hemen dursun
        currentAudio.pause();
        currentAudio = null;
    }
}

function resetWorkTimer() {
    chrome.storage.sync.get(['workDuration'], function(items) {
        chrome.runtime.sendMessage({
            action: "updateAlarm",
            workDuration: items.workDuration
        });
    });
}

function closeOverlay(overlay, isUrgent = false) {
    if (overlay) {
        // Önce müziği durdur (özellikle işim acil butonu için önemli)
        stopMusic();
        
        // Animasyonları başlat
        overlay.classList.add('fade-out');
        const content = overlay.querySelector('.overlay-content');
        if (content) content.classList.add('slide-down');

        // Videoları devam ettir
        resumePausedVideos();
        
        // Sayacı temizle
        if (globalCountdown) {
            clearInterval(globalCountdown);
            globalCountdown = null;
        }

        // Overlay'i kaldır ve istatistikleri güncelle
        setTimeout(() => {
            overlay.remove();
            resetWorkTimer();
            if (isUrgent) {
                chrome.runtime.sendMessage({ action: "updateStats", type: "urgent" });
            } else {
                chrome.runtime.sendMessage({ action: "updateStats", type: "completed" });
            }
        }, 500);
    }
}

function createOverlay() {
    if (document.querySelector('.health-overlay')) {
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'health-overlay';
    globalOverlay = overlay;

    const content = document.createElement('div');
    content.className = 'overlay-content';

    const message = document.createElement('div');
    message.className = 'message';
    message.textContent = healthMessages[Math.floor(Math.random() * healthMessages.length)];

    const timer = document.createElement('div');
    timer.className = 'timer';

    
    const urgentButton = document.createElement('button');
    urgentButton.className = 'urgent-button';
    urgentButton.textContent = 'İşim Acil';
    urgentButton.onclick = () => {
        // Müziği hemen durdur
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        closeOverlay(overlay, true);
    };
    content.appendChild(message);
    content.appendChild(timer);
    content.appendChild(urgentButton);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Uyarı istatistiğini güncelle
    chrome.runtime.sendMessage({ action: "updateStats", type: "reminder" });

    chrome.storage.sync.get({
        breakDuration: 20,
        enforceWait: false,
        urgentDelay: 5,
        playMusic: false,
        pauseVideos: true
    }, function(items) {
        let seconds = items.breakDuration;
        timer.textContent = seconds;

        if (items.pauseVideos) {
            pauseAllVideos();
        }

        if (items.playMusic) {
            playRandomMusic();
        }

        if (items.enforceWait) {
            setTimeout(() => {
                urgentButton.classList.add('show');
            }, items.urgentDelay * 1000);
        } else {
            urgentButton.classList.add('show');
        }
        
        globalCountdown = setInterval(() => {
            seconds--;
            timer.textContent = seconds;
            
            if (seconds <= 0) {
                closeOverlay(overlay, false);
            }
        }, 1000);
    });

    // Animasyonlu açılış
    requestAnimationFrame(() => {
        overlay.classList.add('show');
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch(request.action) {
        case "showOverlay":
            createOverlay();
            break;
        case "closeOverlay":
            if (globalOverlay) {
                closeOverlay(globalOverlay, false);
            }
            break;
    }
});