import { openAnkiSettings, setCSSDisplay, loadSettingsForDeck, ANKI_SETTINGS } from './ankiSettings.js';

const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';
let activeBlobUrls = [];


let sentencesData = null;
let indexByChar = null;
let cachedResults = [];
let lastQueryKey = "";
let sentenceOffset = 0;
let isSentenceLoading = false;

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

    const footers = tempDiv.querySelectorAll('.modal-footer1');
    footers.forEach(f => f.remove());

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
            
            const blob = b64toBlob(base64, mime);
            const blobUrl = URL.createObjectURL(blob);
            activeBlobUrls.push(blobUrl);
            el.setAttribute(attr, blobUrl);
        } else {
            el.setAttribute(attr, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        }
    }

    if (container.id === 'char_meaning') {
        const children = Array.from(tempDiv.children);
        container.innerHTML = '';
        let currentGroup = null;

        children.forEach((child) => {
            if (child.tagName === 'DIV' && (child.classList.contains('char') || child.id?.startsWith('char'))) {
                currentGroup = document.createElement('div');
                currentGroup.className = 'meaning-item-group';
                container.appendChild(currentGroup);
            }
            if (currentGroup) {
                currentGroup.appendChild(child);
            } else {
                container.appendChild(child);
            }
        });
    } else {
        container.innerHTML = tempDiv.innerHTML;
    }

    const scripts = tempDiv.querySelectorAll('script');
    for (const oldScript of scripts) {
        try {
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
        } catch (e) {
        }
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function buildCharIndex(data) {
    const index = Object.create(null);
    for (let i = 0; i < data.length; i++) {
        const sentence = data[i];
        if (!sentence.simplified) continue;
           
        const chars = [...sentence.simplified];
        const uniqueChars = new Set(chars);

        uniqueChars.forEach(ch => {
            if (/[\u4e00-\u9fa5]/.test(ch)) {
                if (!index[ch]) index[ch] = [];
                index[ch].push(sentence);
            }
        });
    }
    return index;
}

function makeQueryKey(char, settings) {
    return `${char}|${settings.level}|${settings.length}|${settings.limit}|${settings.random ? 1 : 0}`;
}

async function loadSentences(searchText) {
    if (!searchText) return;
    
    if (sentencesData && indexByChar) {
        loadMoreSentences(searchText);
        return;
    }

    if (isSentenceLoading) return;
    isSentenceLoading = true;

    try {
        const response = await invoke('retrieveMediaFile', 6, { filename: '_chinese_sentences.json' });
        if (!response) throw new Error("No sentence data returned from Anki");
        
        const binaryString = atob(response);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const decoded = new TextDecoder('utf-8').decode(bytes);
        
        sentencesData = JSON.parse(decoded);
        indexByChar = buildCharIndex(sentencesData);

        cachedResults = [];
        lastQueryKey = "";
        sentenceOffset = 0;

        loadMoreSentences(searchText);
    } catch (error) {
        console.error("Failed to load sentences:", error);
        const container = document.getElementById("char_sentence");
        if (container) container.classList.add("hidden");
    } finally {
        isSentenceLoading = false;
    }
}

function loadMoreSentences(searchText) {
    if (!sentencesData || !indexByChar || !searchText) return;

    const settings = {
        limit: parseInt(sessionStorage.getItem(ANKI_SETTINGS.noOfSentence.key)) || 5,
        level: parseInt(sessionStorage.getItem(ANKI_SETTINGS.levelOfSentence.key)) || 9,
        length: parseInt(sessionStorage.getItem(ANKI_SETTINGS.lengthOfSentence.key)) || 10,
        random: sessionStorage.getItem(ANKI_SETTINGS["char_sentence-random"].key) === '"true"',
        show: sessionStorage.getItem(ANKI_SETTINGS.char_sentence.key) === '"true"',
    };

    const container = document.getElementById("char_sentence");
    if (!settings.show) {
        if (container) container.classList.add("hidden");
        return;
    } else {
        if (container) container.classList.remove("hidden");
    }

    const queryKey = makeQueryKey(searchText, settings);

    if (queryKey !== lastQueryKey) {
        lastQueryKey = queryKey;
        sentenceOffset = 0;

        let pool = searchText.length === 1 ? (indexByChar[searchText] || []) : sentencesData;

        cachedResults = pool.filter(s => {
            const levelMatch = s.hsk_level === undefined || s.hsk_level <= settings.level;
            const lengthMatch = s.simplified.length <= settings.length;
            if (!levelMatch || !lengthMatch) {
            }
            return (
                s.simplified &&
                s.simplified.includes(searchText) &&
                levelMatch &&
                lengthMatch
            );
        });

        if (settings.random) {
            shuffle(cachedResults);
        } else {
            cachedResults.sort((a, b) => a.id - b.id);
        }
    }

    const sentencesGrid = document.getElementById("sentences");
    if (!sentencesGrid) return;

    if (sentenceOffset === 0) sentencesGrid.innerHTML = '';

    const page = cachedResults.slice(sentenceOffset, sentenceOffset + settings.limit);
    
    if (page.length === 0 && sentenceOffset === 0) {
        sentencesGrid.innerHTML = '<div style="text-align:center; padding:10px; opacity:0.6;">No example sentences found.</div>';
        return;
    }

    const showSim = sessionStorage.getItem(ANKI_SETTINGS.char_sim.key) !== '"false"';
    const showPin = sessionStorage.getItem(ANKI_SETTINGS.char_pinyin.key) !== '"false"';
    const showMean = sessionStorage.getItem(ANKI_SETTINGS.char_meaning.key) !== '"false"';

    page.forEach(s => {
        const div = document.createElement("div");
        div.className = "sentence";
        
        let simplifiedHTML = s.simplified;
        const regex = new RegExp(searchText, "g");
        simplifiedHTML = simplifiedHTML.replace(regex, `<b>${searchText}</b>`);

        div.innerHTML = `
            <div class="sen-card">
                <div class="sen-sim" style="display:${showSim ? 'block' : 'none'}">${simplifiedHTML}</div>
                <div class="sen-pin" style="display:${showPin ? 'block' : 'none'}">${s.pinyin}</div>
                <div class="sen-eng" style="display:${showMean ? 'block' : 'none'}">${s.english || ""}</div>
            </div>
        `;
        sentencesGrid.appendChild(div);
    });

    sentenceOffset += settings.limit;
    
    const loadMoreBtn = document.getElementById("loadMore");
    if (loadMoreBtn) {
        if (sentenceOffset >= cachedResults.length) {
            loadMoreBtn.classList.add("hidden");
        } else {
            loadMoreBtn.classList.remove("hidden");
        }
    }
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
                ankiStudyBtn.style.display = total > 0 ? 'block' : 'none';
            } else {
                ankiStudyBtn.style.display = 'none';
            }

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
                cardFront.classList.remove('hidden');
                cardBack.classList.add('hidden');
                cardDivider.classList.add('hidden');
                showAnswerBtn.classList.add('hidden');
                easeButtons.classList.add('hidden');
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

    function getCardCharacter() {
        const cardFront = document.getElementById('anki-card-front');
        if (!cardFront) return null;
        const text = cardFront.textContent.trim();
        const match = text.match(/[\u4e00-\u9fa5]/);
        return match ? match[0] : text.charAt(0) || null;
    }

    async function renderCard(card) {
        clearBlobUrls();
        const selectedDeck = deckSelect.value;
        loadSettingsForDeck(selectedDeck);

        await processAnkiHtml(cardFront, card.question);
        await processAnkiHtml(cardBack, card.answer);
        
        cardFront.classList.remove('hidden');
        cardBack.classList.add('hidden');
        cardDivider.classList.add('hidden');
        showAnswerBtn.classList.remove('hidden');
        easeButtons.classList.add('hidden');
        
        cardFront.style.display = '';
        cardBack.style.display = '';
        showAnswerBtn.style.display = '';
        easeButtons.style.display = '';

        setCSSDisplay();
        
        const char = getCardCharacter();
        if (char) {
            loadSentences(char);
        }

        setTimeout(setCSSDisplay, 100);
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
        if (!currentCard) return;
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
        if (selectedDeck) {
            openAnkiSettings(selectedDeck, () => {
                setCSSDisplay();
                const char = getCardCharacter();
                if (char) loadSentences(char);
            });
        }
    });
    ankiPlayAudioBtn.addEventListener('click', playAudio);
    deckSelect.addEventListener('change', () => updateAnkiStats());
    
    showAnswerBtn.addEventListener('click', async () => {
        await invoke('guiShowAnswer', 6);
        cardFront.classList.add('hidden');
        cardBack.classList.remove('hidden');
        cardDivider.classList.remove('hidden');
        showAnswerBtn.classList.add('hidden');
        easeButtons.classList.remove('hidden');
        setCSSDisplay();
    });

    document.querySelectorAll('#anki-ease-buttons .anki-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const ease = parseInt(btn.dataset.ease);
            await invoke('guiAnswerCard', 6, { ease });
            updateAnkiStats();
            setTimeout(loadCurrentCard, 300);
        });
    });

    
    const ankiContainer = document.getElementById('anki-container');
    if (ankiContainer) {
        ankiContainer.addEventListener('click', (e) => {
            const target = e.target.closest('#loadMore');
            if (target) {
                const char = getCardCharacter();
                if (char) loadMoreSentences(char);
            }
        });
    }

    updateAnkiStats();
    setInterval(updateAnkiStats, 60 * 1000);
});
