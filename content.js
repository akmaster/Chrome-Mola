// content.js
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
let audioContext = null;
let audioBuffer = null;
let audioSource = null;

// Müzik yönetimi
async function initializeAudio(musicFile) {
    try {
        const audioUrl = chrome.runtime.getURL(`audio/${musicFile}`);
        console.log('Müzik yükleniyor:', audioUrl);

        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        console.log('Müzik başarıyla yüklendi');
        return true;
    } catch (error) {
        console.error('Müzik yükleme hatası:', error);
        return false;
    }
}

async function playRandomMusic() {
    try {
        console.log('Müzik başlatma deneniyor...');
        
        const response = await chrome.runtime.sendMessage({action: "requestMusicPermission"});
        console.log('Müzik izni yanıtı:', response);

        if (!response || !response.canPlay) {
            console.log('Müzik izni alınamadı');
            return;
        }

        if (audioSource) {
            audioSource.stop();
            audioSource = null;
        }

        const musicFiles = ['music1.ogg', 'music2.ogg'];
        const randomMusic = musicFiles[Math.floor(Math.random() * musicFiles.length)];
        console.log('Seçilen müzik:', randomMusic);

        if (await initializeAudio(randomMusic)) {
            audioSource = audioContext.createBufferSource();
            audioSource.buffer = audioBuffer;
            
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0;
            
            audioSource.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            audioSource.loop = true;
            audioSource.start();

            // Fade in
            gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 2);
            
            console.log('Müzik başarıyla çalmaya başladı');
        }
    } catch (error) {
        console.error('Müzik işlemi hatası:', error);
    }
}

function stopMusic() {
    if (audioSource) {
        try {
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 1;
            
            audioSource.disconnect();
            audioSource.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Fade out
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
            
            setTimeout(() => {
                audioSource.stop();
                audioSource = null;
            }, 1000);
        } catch (error) {
            console.error('Müzik durdurma hatası:', error);
        }
    }
}
// Video yönetimi
function pauseAllVideos() {
    try {
        const videos = document.querySelectorAll('video');
        const iframes = document.querySelectorAll('iframe');
        
        videos.forEach(video => {
            if (!video.paused) {
                video.pause();
                pausedVideos.push(video);
            }
        });

        iframes.forEach(iframe => {
            if (iframe.src && (iframe.src.includes('youtube.com') || iframe.src.includes('youtu.be'))) {
                try {
                    iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                    pausedVideos.push(iframe);
                } catch (e) {
                    console.warn('Video duraklatma hatası:', e);
                }
            }
        });
    } catch (error) {
        console.warn('Video işlemi hatası:', error);
    }
}

function resumePausedVideos() {
    pausedVideos.forEach(element => {
        try {
            if (element instanceof HTMLVideoElement) {
                element.play().catch(() => {});
            } else if (element instanceof HTMLIFrameElement) {
                element.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            }
        } catch (e) {
            console.warn('Video devam ettirme hatası:', e);
        }
    });
    pausedVideos = [];
}

// Temizleme işlemleri
function cleanup() {
    stopMusic();
    resumePausedVideos();
    if (globalOverlay) {
        globalOverlay.remove();
        globalOverlay = null;
    }
    if (audioContext) {
        audioContext.close().catch(() => {});
        audioContext = null;
    }
}

// Overlay yönetimi
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
        chrome.runtime.sendMessage({ action: "closeOverlay" });
    };

    // Müzik başlatma butonu
    const startMusicButton = document.createElement('button');
    startMusicButton.className = 'start-music-button';
    startMusicButton.textContent = '🎵 Müziği Başlat';
    startMusicButton.style.marginBottom = '10px';
    startMusicButton.style.backgroundColor = '#4ecca3';
    startMusicButton.onclick = async () => {
        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        playRandomMusic();
        startMusicButton.style.display = 'none';
    };

    content.appendChild(message);
    content.appendChild(timer);
    content.appendChild(startMusicButton);
    content.appendChild(urgentButton);
    globalOverlay.appendChild(content);
    document.body.appendChild(globalOverlay);

    // Ayarları yükle ve uygula
    chrome.storage.sync.get(['settings'], async function(result) {
        console.log('Yüklenen ayarlar:', result.settings);
        
        const settings = result.settings || {
            breakDuration: 20,
            enforceWait: false,
            urgentDelay: 5,
            playMusic: true,
            pauseVideos: true
        };

        if (settings.pauseVideos) {
            pauseAllVideos();
        }

        if (settings.playMusic) {
            console.log('Müzik çalma aktif');
            startMusicButton.style.display = 'block';
        } else {
            console.log('Müzik çalma devre dışı');
            startMusicButton.style.display = 'none';
        }

        if (settings.enforceWait) {
            setTimeout(() => {
                urgentButton.classList.add('show');
            }, settings.urgentDelay * 1000);
        } else {
            urgentButton.classList.add('show');
        }

        chrome.runtime.sendMessage({
            action: "startBreakTimer",
            duration: settings.breakDuration
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

// Mesaj dinleyicisi
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Mesaj alındı:', request);

    switch(request.action) {
        case "showOverlay":
            createOverlay();
            break;
        case "closeOverlay":
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
                        type: request.isUrgent ? "urgent" : "completed"
                    });
                }, 500);
            }
            break;
        case "updateTimer":
            if (globalOverlay) {
                const timer = globalOverlay.querySelector('.timer');
                if (timer) timer.textContent = request.seconds;
            }
            break;
    }
});

// Sayfa kapatılırken temizlik yap
window.addEventListener('beforeunload', cleanup);

// Debug için global hata yakalayıcı
window.addEventListener('error', (event) => {
    console.error('Global hata:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
});