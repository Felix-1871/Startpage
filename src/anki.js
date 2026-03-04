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
            
            // Only show study button if NOT currently in study view
            if (ankiStudyView.style.display === 'none') {
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
        loadJsonSentences();
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
            // Refresh stats after answering
            updateAnkiStats();
            setTimeout(loadCurrentCard, 300);
        });
    });

    updateAnkiStats();
    setInterval(updateAnkiStats, 60 * 1000);
});


    var offset = 0;
    var db = null;

    function getSentenceSettings() {
        return {
            limit: parseInt(localStorage.getItem("no-of-sentence") ||
                document.getElementById("no-of-sentence")?.value) || 5,
            level: parseInt(localStorage.getItem("level-of-sentence") ||
                document.getElementById("level-of-sentence")?.value) || 9,
            length: parseInt(localStorage.getItem("length-of-sentence") ||
                document.getElementById("length-of-sentence")?.value) || 10,
            random: localStorage.getItem("text-sentence-random") !== "false" &&
                (document.getElementById("text-sentence-random")?.checked ?? true),
            colored: localStorage.getItem("text-sentence-colored") !== "false" &&
                (document.getElementById("text-sentence-colored")?.checked ?? true),
            show: localStorage.getItem("text-sentence") !== "false" &&
                (document.getElementById("text-sentence")?.checked ?? true)
        };
    }

    setTimeout(() => {
        var settings = getSentenceSettings();
        var sentenceDiv = document.getElementById("char_sentence");
        if (sentenceDiv) {
            sentenceDiv.style.display = settings.show ? "block" : "none";
        }
        if (settings.show) {
            loadSentences();
        }
    }, 100);

    var sentences = null;
    var indexByChar = null;
    var cachedResults = [];
    var lastQueryKey = "";
    var offset = 0;
    var isLoading = false;

    function shuffle(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = array[i];
            array[i] = array[j];
            array[j] = tmp;
        }
        return array;
    }

    function buildCharIndex(data) {
        var index = Object.create(null);

        for (var i = 0; i < data.length; i++) {
            var sentence = data[i];
            if (!sentence.simplified) continue;

            var uniqueChars = new Set(sentence.simplified);
            uniqueChars.forEach(function (ch) {
                if (!index[ch]) index[ch] = [];
                index[ch].push(sentence);
            });
        }
        return index;
    }

    function makeQueryKey(char, settings) {
        return (
            char + "|" +
            settings.level + "|" +
            settings.length + "|" +
            settings.limit + "|" +
            (settings.random ? 1 : 0)
        );
    }

    function escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
loadSentences();
    async function loadSentences() {
        if (sentences && indexByChar) {
            loadMore();
            return;
        }

        if (isLoading) return;
        isLoading = true;

        try {
            var response = await invoke('retrieveMediaFile', 6, { filename: '_chinese_sentences.json' });

            sentences = await JSON.parse(atob(response));
            console.log("Loaded sentences:", sentences.length);
            indexByChar = buildCharIndex(sentences);

            cachedResults = [];
            lastQueryKey = "";
            offset = 0;

            loadMore();
        } catch (error) {
            console.log("Failed to load sentences:", error);
            var container = document.getElementById("char_sentence");
            if (container) container.style.display = "none";
        } finally {
            isLoading = false;
        }
    }

    function loadMore() {
        if (!sentences || !indexByChar) return;

        var settings = getSentenceSettings();
        var searchText = "有";

        var queryKey = makeQueryKey(searchText, settings);

        if (queryKey !== lastQueryKey) {
            lastQueryKey = queryKey;
            offset = 0;

            var pool;
            if (searchText.length === 1) {
                pool = indexByChar[searchText] || [];
            } else {
                pool = sentences;
            }

            cachedResults = pool.filter(function (s) {
                return (
                    s.simplified &&
                    s.simplified.includes(searchText) &&
                    s.hsk_level <= settings.level &&
                    s.simplified.length < settings.length
                );
            });

            if (settings.random) {
                shuffle(cachedResults);
            } else {
                cachedResults.sort(function (a, b) {
                    return a.id - b.id;
                });
            }
        }

        var page = cachedResults.slice(offset, offset + settings.limit);
        if (!page.length) {
            var loadMoreBtn = document.getElementById("loadMore");
            if (loadMoreBtn) {
                loadMoreBtn.disabled = true;
                loadMoreBtn.textContent = "No more sentences";
            }
            return;
        }

        var container = document.getElementById("sentences");
        if (!container) return;

        var showSimplified = Persistence.getItem(frontBack + "text-sim") !== "false";
        var showTraditional = Persistence.getItem(frontBack + "text-trad") !== "false";
        var showPinyin = Persistence.getItem(frontBack + "text-pinyin") !== "false";
        var showMeaning = Persistence.getItem(frontBack + "text-meaning") !== "false";

        var highlightRegex = new RegExp(escapeRegex(searchText), "g");

        page.forEach(function (s) {
            var simplifiedHTML = s.simplified || "";
            var pinyinHTML = s.pinyin || "";

            if (settings.colored && s.simplified && s.pinyin) {
                var colored = getColoredHanziHTML(s.pinyin, s.simplified);
                pinyinHTML = colored[0].innerHTML;
                simplifiedHTML = colored[1];
            }

            simplifiedHTML = simplifiedHTML.replace(
                highlightRegex,
                "<b>" + searchText + "</b>"
            );

            var div = document.createElement("div");
            div.className = "sentence";
            div.innerHTML =
                '<div class="sen-card">' +
                '<div class="sen-sim" style="display:' + (showSimplified ? "block" : "none") + '">' + simplifiedHTML + "</div>" +
                '<div class="sen-pin" style="display:' + (showPinyin ? "block" : "none") + '">' + pinyinHTML + "</div>" +
                '<div class="sen-eng" style="display:' + (showMeaning ? "block" : "none") + '">' + (s.english || "") + "</div>" +
                "</div>";

            container.appendChild(div);
        });

        offset += settings.limit;
    }

    var loadMoreBtn = document.getElementById("loadMore");
    if (loadMoreBtn) {
        loadMoreBtn.onclick = loadMore;
    }
