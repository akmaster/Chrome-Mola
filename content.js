const healthMessages = [
    "Uzun süre ekrana bakmak göz yorgunluğuna neden olabilir. Gözlerinizi dinlendirin!",
    "Hareketsiz oturmak kan dolaşımınızı yavaşlatır. Biraz hareket edin!",
    "Sürekli oturmak duruş bozukluklarına yol açabilir. Ayağa kalkıp esneme hareketleri yapın!",
    "Bilgisayar başında uzun süre kalmak stres seviyenizi artırabilir. Kısa bir mola verin!",
    "Düzenli molalar vermek verimliliğinizi artırır. Şimdi mola zamanı!",
    "Karpal Tünel Sendromunu önlemek için bilek egzersizleri yapın!",
    "Ekran karşısında gözlerinizi kırpma sıklığınız azalır. 20-20-20 kuralını uygulayın!",
    "Zihinsel dinlenme için kısa molalar önemlidir. Düşüncelerinizi toplayın!",
    "Boyun ağrılarını önlemek için boyun egzersizleri yapın!",
    "Fiziksel aktivite beyin fonksiyonlarınızı geliştirir. Kısa bir yürüyüş yapın!"
];

let globalCountdown = null;
let globalOverlay = null;

function updateAllTabs() {
    chrome.runtime.sendMessage({
        action: "updateTimer",
        seconds: globalCountdown
    });
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

    let seconds = 60;
    globalCountdown = setInterval(() => {
        seconds--;
        timer.textContent = `${seconds}`;
        
        if (seconds <= 0) {
            clearInterval(globalCountdown);
            globalCountdown = null;
            chrome.runtime.sendMessage({ action: "closeOverlay" });
            overlay.remove();
        }
    }, 1000);

    setTimeout(() => {
        overlay.classList.add('show');
    }, 100);
}

// Mesaj dinleyicisi
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
        case "updateTimer":
            if (document.querySelector('.timer')) {
                document.querySelector('.timer').textContent = request.seconds;
            }
            break;
    }
});