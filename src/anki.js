import { getStorage, setStorage, showHide, invoke, b64toBlob} from './helpers.js';

let activeBlobUrls = [];

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

    const mediaElements = tempDiv.querySelectorAll('[src], [href], link[rel="stylesheet"]');
    for (const el of mediaElements) {
        const attr = el.hasAttribute('src') ? 'src' : 'href';
        let path = el.getAttribute(attr);
        if (!path || path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) continue;

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
        } else {
            el.setAttribute(attr, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        }
    }

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
    container.innerHTML = tempDiv.innerHTML;
}

export async function updateAnkiStats() {
    const ankiStats = document.getElementById('anki-stats');
    const ankiMessage = document.getElementById('anki-message');
    const ankiStudyBtn = document.getElementById('anki-study-btn');
    const ankiStudyView = document.getElementById('anki-study-view');
    const deckSelect = document.getElementById('anki-deck-select');
    const ankiNew = document.getElementById('anki-new');
    const ankiLearning = document.getElementById('anki-learning');
    const ankiDue = document.getElementById('anki-due');

    if (!ankiStats || !ankiMessage || !ankiStudyBtn || !deckSelect) return;

    const version = await invoke('version', 6);
    if (!version) {
        showHide(ankiStats, false);
        showHide(ankiMessage, true, 'block');
        ankiMessage.textContent = 'Anki disconnected (Is it running?)';
        showHide(ankiStudyBtn, false);
        showHide(deckSelect.parentElement, false);
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
        
        const savedDeck = getStorage('anki.selectedDeck');
        if (savedDeck && deckNames.includes(savedDeck)) {
            deckSelect.value = savedDeck;
        } else if (currentVal && deckNames.includes(currentVal)) {
            deckSelect.value = currentVal;
        }
    }
    const selectedDeck = deckSelect.value;
    setStorage('anki.selectedDeck', selectedDeck);
    console.log('Selected Anki deck:', selectedDeck);

    try {
        const deckStats = await invoke('getDeckStats', 6, { decks: [selectedDeck] });
        
        const deckIDs = await invoke('deckNamesAndIds', 6);
        
        const selectedDeckId = deckIDs[selectedDeck];
        
        
        if (deckStats && deckStats[selectedDeckId]) {
            
            const stat = deckStats[selectedDeckId];
            ankiNew.textContent = stat.new_count ?? 0;
            ankiLearning.textContent = stat.learn_count ?? 0;
            ankiDue.textContent = stat.review_count ?? 0;
            
            const total = (stat.new_count || 0) + (stat.learn_count || 0) + (stat.review_count || 0);
            
            const isStudying = ankiStudyView.style.display !== 'none' && ankiStudyView.style.display !== '';
            if (!isStudying) {
                showHide(ankiStudyBtn, total > 0, 'block');
            } else {
                showHide(ankiStudyBtn, false);
            }

            if (total === 0) {
                showHide(ankiMessage, true, 'block');
                ankiMessage.textContent = 'Deck finished for now!';
            } else {
                showHide(ankiMessage, false);
            }
        }

        showHide(ankiStats, true, 'flex');
        showHide(deckSelect.parentElement, true, 'block');
    } catch (e) {
        console.error('Failed to parse Anki stats', e);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const ankiStatsView = document.getElementById('anki-stats-view');
    const ankiStudyView = document.getElementById('anki-study-view');
    const ankiStudyBtn = document.getElementById('anki-study-btn');
    const ankiBackBtn = document.getElementById('anki-back-btn');
    const deckSelect = document.getElementById('anki-deck-select');
    const middleLeft = document.querySelector('.middle-left');

    const cardFront = document.getElementById('anki-card-front');
    const cardBack = document.getElementById('anki-card-back');
    const cardDivider = document.getElementById('anki-card-divider');
    const showAnswerBtn = document.getElementById('anki-show-answer');
    const easeButtons = document.getElementById('anki-ease-buttons');

    async function loadCurrentCard() {
        let card = await invoke('guiCurrentCard', 6);
        console.log('Current Anki card:', card);
        if (!card) {
            await updateAnkiStats();
            const total = parseInt(document.getElementById('anki-new').textContent) + 
                          parseInt(document.getElementById('anki-learning').textContent) + 
                          parseInt(document.getElementById('anki-due').textContent);
            
            if (total === 0) {
                cardFront.innerHTML = '<div style="text-align:center; padding:20px;">All done!</div>';
                showHide(cardFront, true, 'block');
                showHide(cardBack, false);
                showHide(cardDivider, false);
                showHide(showAnswerBtn, false);
                showHide(easeButtons, false);
                return;
            } else {
                const selectedDeck = deckSelect.value;
                await invoke('guiDeckReview', 6, { name: selectedDeck });
                setTimeout(loadCurrentCard, 300);
                return;
            }
        }
        renderCard(card);
    }

    async function renderCard(card) {
        clearBlobUrls();
        await processAnkiHtml(cardFront, card.question);
        await processAnkiHtml(cardBack, card.answer);
        
        showHide(cardFront, true, 'block');
        showHide(cardBack, false);
        showHide(cardDivider, false);
        showHide(showAnswerBtn, true, 'block');
        showHide(easeButtons, false);
    }

    async function startStudy() {
        const selectedDeck = deckSelect.value;
        if (!selectedDeck) return;
        await invoke('guiDeckReview', 6, { name: selectedDeck });
        showHide(ankiStatsView, false);
        showHide(ankiStudyView, true, 'block');
        showHide(ankiStudyBtn, false);
        middleLeft.classList.add('expanded');
        loadCurrentCard();
    }

    function stopStudy() {
        showHide(ankiStatsView, true, 'block');
        showHide(ankiStudyView, false);
        showHide(ankiStudyBtn, true, 'block');
        middleLeft.classList.remove('expanded');
        updateAnkiStats();
    }

    async function playAudio() {
        const currentCard = await invoke('guiCurrentCard', 6);
        if (!currentCard) return;
        
        // Find first field that looks like audio if 'Audio' field doesn't exist or is empty
        let audioContent = currentCard.fields.Audio?.value;
        if (!audioContent) {
            for (const fieldName in currentCard.fields) {
                const val = currentCard.fields[fieldName].value;
                if (val && val.includes('[sound:')) {
                    audioContent = val;
                    break;
                }
            }
        }

        if (!audioContent) return;
        const match = audioContent.match(/\[sound:(.+?)\]/);
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
    const ankiPlayAudioBtn = document.querySelector('.anki-play-audio');
    if (ankiPlayAudioBtn) ankiPlayAudioBtn.addEventListener('click', playAudio);
    deckSelect.addEventListener('change', () => updateAnkiStats());
    
    showAnswerBtn.addEventListener('click', async () => {
        await invoke('guiShowAnswer', 6);
        showHide(cardFront, false);
        showHide(cardBack, true, 'block');
        showHide(cardDivider, true, 'block');
        showHide(showAnswerBtn, false);
        showHide(easeButtons, true, 'block');
    });

    document.querySelectorAll('#anki-ease-buttons .anki-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const ease = parseInt(btn.dataset.ease);
            await invoke('guiAnswerCard', 6, { ease });
            updateAnkiStats();
            setTimeout(loadCurrentCard, 300);
        });
    });

    updateAnkiStats();
    setInterval(updateAnkiStats, 60 * 1000);
});