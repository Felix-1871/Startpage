import { openAnkiSettings, setCSSDisplay, loadSettingsForDeck } from './ankiSettings.js';

const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';
let activeBlobUrls = [];

async function invoke(action, version, params = {}) {
    try {
        const response = await fetch(ANKI_CONNECT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, version, params })
        });
        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        return result.result;
    } catch (error) {
        console.error('AnkiConnect Error:', error);
        return null;
    }
}

function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
}

function clearBlobUrls() {
    activeBlobUrls.forEach(url => URL.revokeObjectURL(url));
    activeBlobUrls = [];
}

async function processAnkiHtml(container, html) {
    if (!html) {
        container.innerHTML = '';
        return;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Fix media paths by fetching them via AnkiConnect
    const mediaElements = tempDiv.querySelectorAll('[src], [href], link[rel="stylesheet"]');
    for (const el of mediaElements) {
        const attr = el.hasAttribute('src') ? 'src' : 'href';
        let path = el.getAttribute(attr);
        
        if (!path || path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
            continue;
        }

        const filename = path.split('/').pop();
        const base64 = await invoke('retrieveMediaFile', 6, { filename });
        if (base64) {
            let mime = 'application/octet-stream';
            if (filename.endsWith('.js')) mime = 'application/javascript';
            else if (filename.endsWith('.css')) mime = 'text/css';
            else if (filename.endsWith('.png')) mime = 'image/png';
            else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mime = 'image/jpeg';
            else if (filename.endsWith('.svg')) mime = 'image/svg+xml';
            else if (filename.endsWith('.gif')) mime = 'image/gif';
            else if (filename.endsWith('.woff')) mime = 'font/woff';
            else if (filename.endsWith('.woff2')) mime = 'font/woff2';
            
            const blob = b64toBlob(base64, mime);
            const blobUrl = URL.createObjectURL(blob);
            activeBlobUrls.push(blobUrl);
            el.setAttribute(attr, blobUrl);
        }
    }

    container.innerHTML = tempDiv.innerHTML;

    const scripts = tempDiv.querySelectorAll('script');
    for (const oldScript of scripts) {
        const newScript = document.createElement('script');
        if (oldScript.src) {
            newScript.src = oldScript.src;
            await new Promise((resolve) => {
                newScript.onload = resolve;
                newScript.onerror = resolve;
                document.head.appendChild(newScript);
            });
        } else {
            newScript.textContent = oldScript.textContent;
            document.head.appendChild(newScript);
        }
    }
}

export async function updateAnkiStats() {
    const ankiStats = document.getElementById('anki-stats');
    const ankiMessage = document.getElementById('anki-message');
    const ankiStudyBtn = document.getElementById('anki-study-btn');
    const deckSelect = document.getElementById('anki-deck-select');
    const ankiNew = document.getElementById('anki-new');
    const ankiLearning = document.getElementById('anki-learning');
    const ankiDue = document.getElementById('anki-due');

    if (!ankiStats || !ankiMessage || !ankiStudyBtn || !deckSelect) return;

    const version = await invoke('version', 6);
    if (!version) {
        ankiStats.style.display = 'none';
        ankiMessage.style.display = 'block';
        ankiMessage.textContent = 'Anki disconnected (Is it running?)';
        ankiStudyBtn.style.display = 'none';
        deckSelect.parentElement.style.display = 'none';
        return;
    }

    const deckNames = await invoke('deckNames', 6);
    if (!deckNames) return;

    if (deckSelect.options.length <= 1 || deckSelect.options[0].value === "") {
        const currentVal = deckSelect.value;
        deckSelect.innerHTML = '';
        deckNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            deckSelect.appendChild(option);
        });
        
        const savedDeck = localStorage.getItem('anki.selectedDeck');
        if (savedDeck && deckNames.includes(savedDeck)) {
            deckSelect.value = savedDeck;
        } else if (currentVal && deckNames.includes(currentVal)) {
            deckSelect.value = currentVal;
        }
    }

    const selectedDeck = deckSelect.value;
    if (!selectedDeck) return;

    localStorage.setItem('anki.selectedDeck', selectedDeck);
    loadSettingsForDeck(selectedDeck);

    try {
        const deckStats = await invoke('getDeckStats', 6, { decks: [selectedDeck] });
        if (deckStats && deckStats[selectedDeck]) {
            const stat = deckStats[selectedDeck];
            ankiNew.textContent = stat.new_count ?? 0;
            ankiLearning.textContent = stat.learn_count ?? 0;
            ankiDue.textContent = stat.review_count ?? 0;
            
            const total = (stat.new_count || 0) + (stat.learn_count || 0) + (stat.review_count || 0);
            ankiStudyBtn.style.display = total > 0 ? 'block' : 'none';
            if (total === 0) {
                ankiMessage.style.display = 'block';
                ankiMessage.textContent = 'Deck finished for now!';
            } else {
                ankiMessage.style.display = 'none';
            }
        }

        ankiStats.style.display = 'flex';
        deckSelect.parentElement.style.display = 'block';
        setCSSDisplay();
    } catch (e) {
        console.error('Failed to parse Anki stats', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const ankiStatsView = document.getElementById('anki-stats-view');
    const ankiStudyView = document.getElementById('anki-study-view');
    const ankiStudyBtn = document.getElementById('anki-study-btn');
    const ankiBackBtn = document.getElementById('anki-back-btn');
    const ankiSettingsBtn = document.getElementById('anki-settings-btn');
    const deckSelect = document.getElementById('anki-deck-select');
    const middleLeft = document.querySelector('.middle-left');

    const cardFront = document.getElementById('anki-card-front');
    const cardBack = document.getElementById('anki-card-back');
    const cardDivider = document.getElementById('anki-card-divider');
    const showAnswerBtn = document.getElementById('anki-show-answer');
    const easeButtons = document.getElementById('anki-ease-buttons');
    const ankiPlayAudioBtn = document.querySelector('.anki-play-audio');

    async function loadCurrentCard() {
        let card = await invoke('guiCurrentCard', 6);
        if (!card) {
            await updateAnkiStats();
            const total = parseInt(document.getElementById('anki-new').textContent) + 
                          parseInt(document.getElementById('anki-learning').textContent) + 
                          parseInt(document.getElementById('anki-due').textContent);
            
            if (total === 0) {
                cardFront.innerHTML = '<div style="text-align:center; padding:20px;">All done!</div>';
                cardBack.style.display = 'none';
                cardDivider.style.display = 'none';
                showAnswerBtn.style.display = 'none';
                easeButtons.style.display = 'none';
                return;
            } else {
                const selectedDeck = deckSelect.value;
                await invoke('guiDeckReview', 6, { name: selectedDeck });
                setTimeout(async () => {
                    card = await invoke('guiCurrentCard', 6);
                    if (card) renderCard(card);
                }, 200);
                return;
            }
        }
        renderCard(card);
    }

    async function renderCard(card) {
        clearBlobUrls();
        await processAnkiHtml(cardFront, card.question);
        await processAnkiHtml(cardBack, card.answer);
        cardBack.style.display = 'none';
        cardDivider.style.display = 'none';
        showAnswerBtn.style.display = 'block';
        easeButtons.style.display = 'none';
        setCSSDisplay();
    }

    async function startStudy() {
        const selectedDeck = deckSelect.value;
        if (!selectedDeck) return;
        await invoke('guiDeckReview', 6, { name: selectedDeck });
        ankiStatsView.style.display = 'none';
        ankiStudyView.style.display = 'block';
        ankiStudyBtn.style.display = 'none';
        middleLeft.classList.add('expanded');
        loadCurrentCard();
    }

    function stopStudy() {
        ankiStatsView.style.display = 'block';
        ankiStudyView.style.display = 'none';
        ankiStudyBtn.style.display = 'block';
        middleLeft.classList.remove('expanded');
        updateAnkiStats();
    }

    async function playAudio() {
        const currentCard = await invoke('guiCurrentCard', 6);
        const audioField = currentCard.fields.Audio?.value;
        if (!audioField) return;
        const match = audioField.match(/\[sound:(.+?)\]/);
        if (!match) return;
        const filename = match[1];
        const audio = await invoke('retrieveMediaFile', 6, { filename });
        if (audio) {
            const blob = b64toBlob(audio, 'audio/mpeg');
            const blobUrl = URL.createObjectURL(blob);
            const audioPlayer = new Audio(blobUrl);
            audioPlayer.play();
            audioPlayer.onended = () => URL.revokeObjectURL(blobUrl);
        }
    }

    ankiStudyBtn.addEventListener('click', startStudy);
    ankiBackBtn.addEventListener('click', stopStudy);
    ankiSettingsBtn.addEventListener('click', () => {
        const selectedDeck = deckSelect.value;
        if (selectedDeck) openAnkiSettings(selectedDeck);
    });
    ankiPlayAudioBtn.addEventListener('click', playAudio);
    deckSelect.addEventListener('change', () => updateAnkiStats());
    showAnswerBtn.addEventListener('click', async () => {
        await invoke('guiShowAnswer', 6);
        cardBack.style.display = 'block';
        cardDivider.style.display = 'block';
        showAnswerBtn.style.display = 'none';
        easeButtons.style.display = 'flex';
        setCSSDisplay();
    });

    document.querySelectorAll('#anki-ease-buttons .anki-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const ease = parseInt(btn.dataset.ease);
            await invoke('guiAnswerCard', 6, { ease });
            setTimeout(loadCurrentCard, 150);
        });
    });

    updateAnkiStats();
    setInterval(updateAnkiStats, 60 * 1000);
});
