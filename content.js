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

let currentAudio = null;
let pausedVideos = [];
let globalOverlay = null;

function cleanup() {
    stopMusic();
    resumePausedVideos();
    if (globalOverlay) {
        globalOverlay.remove();
        globalOverlay = null;
    }
}

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
            try {
                iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                pausedVideos.push(iframe);
            } catch (e) {
                console.warn('Video pause failed:', e);
            }
        }
    });
}

function resumePausedVideos() {
    pausedVideos.forEach(element => {
        try {
            if (element instanceof HTMLVideoElement) {
                element.play();
            } else if (element instanceof HTMLIFrameElement) {
                element.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            }
        } catch (e) {
            console.warn('Video resume failed:', e);
        }
    });
    pausedVideos = [];
}

async function playRandomMusic() {
    try {
        const response = await chrome.runtime.sendMessage({action: "requestMusicPermission"});
        if (!response.canPlay) return;

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        const musicFiles = ['music1.mp3', 'music2.mp3'];
        const randomMusic = musicFiles[Math.floor(Math.random() * musicFiles.length)];
        
        currentAudio = new Audio(chrome.runtime.getURL(`audio/${randomMusic}`));
        currentAudio.loop = true;
        currentAudio.volume = 0;
        
        await currentAudio.play();
        
        const fadeInterval = setInterval(() => {
            if (currentAudio) {
                if (currentAudio.volume < 0.9) {
                    currentAudio.volume += 0.1;
                } else {
                    clearInterval(fadeInterval);
                    currentAudio.volume = 1;
                }
            } else {
                clearInterval(fadeInterval);
            }
        }, 100);

    } catch (error) {
        console.warn('Music playback failed:', error);
    }
}

function stopMusic() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
}

function closeOverlay(isUrgent = false) {
    if (globalOverlay) {
        stopMusic();
        resumePausedVideos();
        
        globalOverlay.classList.add('fade-out');
        const content = globalOverlay.querySelector('.overlay-content');
        if (content) content.classList.add('slide-down');

        setTimeout(() => {
            cleanup();
            chrome.runtime.sendMessage({
                action: "updateStats",
                type: isUrgent ? "urgent" : "completed"
            });
            
            // Çalışma süresini resetle
            chrome.runtime.sendMessage({
                action: "resetWorkTimer"
            });
        }, 500);
    }
}

function createOverlay() {
    if (globalOverlay) return;

    globalOverlay = document.createElement('div');
    globalOverlay.className = 'health-overlay';

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
        chrome.runtime.sendMessage({ action: "closeAllOverlays" });
    };

    content.appendChild(message);
    content.appendChild(timer);
    content.appendChild(urgentButton);
    globalOverlay.appendChild(content);
    document.body.appendChild(globalOverlay);

    chrome.storage.sync.get({
        breakDuration: 20,
        enforceWait: false,
        urgentDelay: 5,
        playMusic: false,
        pauseVideos: true
    }, async function(items) {
        if (items.pauseVideos) {
            pauseAllVideos();
        }

        if (items.playMusic) {
            await playRandomMusic();
        }

        if (items.enforceWait) {
            setTimeout(() => {
                urgentButton.classList.add('show');
            }, items.urgentDelay * 1000);
        } else {
            urgentButton.classList.add('show');
        }

        chrome.runtime.sendMessage({
            action: "startBreakTimer",
            duration: items.breakDuration
        });

        chrome.runtime.sendMessage({
            action: "updateStats",
            type: "reminder"
        });
    });

    requestAnimationFrame(() => {
        globalOverlay.classList.add('show');
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch(request.action) {
        case "showOverlay":
            createOverlay();
            break;
        case "closeOverlay":
            closeOverlay(request.isUrgent);
            break;
        case "updateTimer":
            if (globalOverlay) {
                const timer = globalOverlay.querySelector('.timer');
                if (timer) timer.textContent = request.seconds;
            }
            break;
    }
});

window.addEventListener('beforeunload', cleanup);