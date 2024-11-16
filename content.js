/**
 * content.js
 * Bu dosya, web sayfası içinde çalışan ve kullanıcı arayüzünü yöneten ana bileşendir.
 * Mola ekranı, müzik kontrolü ve kullanıcı etkileşimlerini yönetir.
 */

// Sağlık mesajları listesi - Mola sırasında rastgele gösterilir
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

// Global değişkenler
let globalOverlay = null;  // Mola ekranı elementi
let currentAudio = null;   // Aktif müzik elementi

/**
 * Ses dosyası oluşturma
 * @param {string} url - Müzik dosyası URL'i
 * @returns {HTMLAudioElement} Audio elementi
 */
function createAudio(url) {
    const audio = new Audio(url);
    audio.loop = true;  // Müziği sürekli tekrarla
    return audio;
}

/**
 * Müzik çalma fonksiyonu
 * @param {HTMLAudioElement} audio - Çalınacak audio elementi
 */
function playAudio(audio) {
    if (!audio) return;
    
    try {
        // Başlangıçta ses seviyesi 0
        audio.volume = 0;
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Ses seviyesini kademeli olarak artır
                let volume = 0;
                const fadeInterval = setInterval(() => {
                    if (volume < 0.5) {
                        volume += 0.1;
                        audio.volume = volume;
                    } else {
                        clearInterval(fadeInterval);
                    }
                }, 200);
                console.log('Ses çalmaya başladı');
            }).catch(error => {
                console.log('Otomatik oynatma engellendi, kullanıcı etkileşimi bekleniyor');
                
                // Overlay'e tıklandığında müziği başlat
                if (globalOverlay) {
                    globalOverlay.addEventListener('click', function playOnClick() {
                        audio.play().then(() => {
                            audio.volume = 0.5;
                            globalOverlay.removeEventListener('click', playOnClick);
                        }).catch(() => {});
                    }, { once: true });
                }
            });
        }
    } catch (error) {
        console.error('Ses çalma hatası:', error);
    }
}

/**
 * Müziği durdurma fonksiyonu
 * @param {HTMLAudioElement} audio - Durdurulacak audio elementi
 */
function stopAudio(audio) {
    if (!audio) return;
    
    try {
        // Ses seviyesini kademeli olarak azalt
        const fadeInterval = setInterval(() => {
            if (audio.volume > 0.1) {
                audio.volume -= 0.1;
            } else {
                clearInterval(fadeInterval);
                audio.pause();
                audio.currentTime = 0;
            }
        }, 100);
    } catch (error) {
        console.error('Ses durdurma hatası:', error);
    }
}

/**
 * Temizleme işlemleri
 * Müziği durdur ve overlay'i kaldır
 */
function cleanup() {
    if (currentAudio) {
        stopAudio(currentAudio);
        currentAudio = null;
    }
    if (globalOverlay) {
        globalOverlay.remove();
        globalOverlay = null;
    }
}

/**
 * Mola ekranı oluşturma
 * Sağlık mesajı, zamanlayıcı ve müzik kontrollerini içeren overlay'i oluşturur
 */
function createOverlay() {
    if (globalOverlay) return;

    // Ana overlay container
    globalOverlay = document.createElement('div');
    globalOverlay.className = 'health-overlay';

    // İçerik container
    const content = document.createElement('div');
    content.className = 'overlay-content';

    // Rastgele sağlık mesajı
    const message = document.createElement('div');
    message.className = 'message';
    message.textContent = healthMessages[Math.floor(Math.random() * healthMessages.length)];

    // Zamanlayıcı
    const timer = document.createElement('div');
    timer.className = 'timer';

    // Acil durum butonu
    const urgentButton = document.createElement('button');
    urgentButton.className = 'urgent-button';
    urgentButton.textContent = 'İşim Acil';
    urgentButton.onclick = () => {
        chrome.runtime.sendMessage({ action: "closeOverlay" });
    };

    content.appendChild(message);
    content.appendChild(timer);

    // Ayarları yükle ve uygula
    chrome.storage.sync.get(['settings'], async function(result) {
        console.log('Yüklenen ayarlar:', result.settings);
        
        const settings = result.settings || {
            breakDuration: 20,
            enforceWait: false,
            urgentDelay: 5,
            playMusic: true
        };

        // Müzik ayarı açıksa müzik kontrollerini ekle
        if (settings.playMusic) {
            console.log('Müzik çalma aktif');
            const musicFiles = ['music1.ogg', 'music2.ogg'];
            const randomMusic = musicFiles[Math.floor(Math.random() * musicFiles.length)];
            const audioUrl = chrome.runtime.getURL(`audio/${randomMusic}`);

            // Müzik kontrol container
            const musicContainer = document.createElement('div');
            musicContainer.className = 'music-container';

            // Müzik etiketi
            const musicLabel = document.createElement('div');
            musicLabel.className = 'music-label';
            musicLabel.innerHTML = '🎵 Mola Müziği';

            // Ses seviyesi kontrolü
            const volumeControl = document.createElement('input');
            volumeControl.type = 'range';
            volumeControl.min = '0';
            volumeControl.max = '100';
            volumeControl.value = '50';
            volumeControl.className = 'volume-slider';

            // Müzik elementini oluştur
            currentAudio = createAudio(audioUrl);
            
            // Ses seviyesi değiştiğinde
            volumeControl.onchange = (e) => {
                if (currentAudio) {
                    currentAudio.volume = e.target.value / 100;
                }
            };

            musicContainer.appendChild(musicLabel);
            musicContainer.appendChild(volumeControl);
            content.appendChild(musicContainer);

            // Müziği başlat
            playAudio(currentAudio);
        }

        content.appendChild(urgentButton);

        // Zorunlu bekleme aktifse
        if (settings.enforceWait) {
            setTimeout(() => {
                urgentButton.classList.add('show');
            }, settings.urgentDelay * 1000);
        } else {
            urgentButton.classList.add('show');
        }

        // Zamanlayıcıyı başlat
        chrome.runtime.sendMessage({
            action: "startBreakTimer",
            duration: settings.breakDuration
        });

        // İstatistikleri güncelle
        chrome.runtime.sendMessage({
            action: "updateStats",
            type: "reminder"
        });
    });

    globalOverlay.appendChild(content);
    document.body.appendChild(globalOverlay);

    // Animasyon için bir frame bekle
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
                cleanup();
                globalOverlay.classList.add('fade-out');
                const content = globalOverlay.querySelector('.overlay-content');
                if (content) content.classList.add('slide-down');
                
                setTimeout(() => {
                    if (globalOverlay) {
                        globalOverlay.remove();
                        globalOverlay = null;
                    }
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