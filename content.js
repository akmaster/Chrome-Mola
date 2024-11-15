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
        chrome.runtime.sendMessage({ action: "closeOverlay" });
        clearInterval(globalCountdown);
        globalCountdown = null;
        overlay.remove();
    };

    content.appendChild(message);
    content.appendChild(timer);
    content.appendChild(urgentButton);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    chrome.storage.sync.get({
        breakDuration: 300
    }, function(items) {
        let seconds = items.breakDuration;
        timer.textContent = seconds;
        
        globalCountdown = setInterval(() => {
            seconds--;
            timer.textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(globalCountdown);
                globalCountdown = null;
                chrome.runtime.sendMessage({ action: "closeOverlay" });
                overlay.remove();
            }
        }, 1000);
    });

    setTimeout(() => {
        overlay.classList.add('show');
    }, 100);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch(request.action) {
        case "showOverlay":
            createOverlay();
            break;
        case "closeOverlay":
            if (globalOverlay) {
                globalOverlay.remove();
                if (globalCountdown) {
                    clearInterval(globalCountdown);
                    globalCountdown = null;
                }
            }
            break;
    }
});