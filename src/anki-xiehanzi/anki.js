import { openAnkiSettings, setCSSDisplay, loadSettingsForDeck, ANKI_SETTINGS } from './anki-xiehanzi-helpers.js';
import { getStorage, setStorage, showHide, invoke, b64toBlob} from './helpers.js';

let activeBlobUrls = [];
let sentencesData = null;
let indexByChar = null;
let cachedResults = [];
let lastQueryKey = "";
let sentenceOffset = 0;
let isSentenceLoading = false;

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
        const currentCard = await invoke('guiCurrentCard', 6);
        const writerContainer = document.getElementById('character-target');
        if (currentCard.deckName.includes('Audio')) writerContainer.style.display = 'none';
        else writerContainer.style.display = 'block';
        

        const char = getCardCharacter();
        if (char) {
            loadSentences(char);

            const perIndex = getStorage(frontBack + "practice-select");
            const tradChar = document.getElementById('char_trad')?.innerText || "";
            const simChar = document.getElementById('char_sim')?.innerText || char;
            characters = perIndex == 1 ? tradChar : simChar;
            doPractice();
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

    // --- Drawing Exercise Integration ---

    const switchIdList = ["text-grid", "text-pinyin", "text-meaning", "text-sim", "text-trad", "text-stroke-color", "text-outline"];
    const numberInputList = ["draw-size", "stroke-size", "hint-miss", "no-of-sentence", "level-of-sentence", "length-of-sentence"];
    const sentenceCheckboxList = ["text-sentence", "text-sentence-random", "text-sentence-colored"];
    let frontBack = "front";
    let characters = "";

    function setActive(side) {
        frontBack = side === "text-front" ? "front" : "back";
        const frontBtn = document.getElementById("text-front");
        const backBtn = document.getElementById("text-back");
        if (frontBtn && backBtn) {
        if (side === "text-front") {
            frontBtn.classList.add("btn-active");
            backBtn.classList.remove("btn-active");
        } else {
            backBtn.classList.add("btn-active");
            frontBtn.classList.remove("btn-active");
        }
        }
        initSwitchPrefs();
    }

    function initPractice() {
        const elem = document.getElementById("practice-select");
        if (!elem) return;
        const stored = getStorage(frontBack + "practice-select");
        elem.selectedIndex = (stored !== null && stored !== undefined) ? parseInt(stored) : 0;
        setStorage(frontBack + "practice-select", elem.selectedIndex);
    }

    function initSwitchPrefs() {
        const drawIds = ["text-grid", "text-stroke-color", "text-outline"];

        switchIdList.forEach(_id => {
            const perId = frontBack + _id;
            const elem = document.getElementById(_id);
            if (!elem) return;
            const divId = _id.replace("text-", "char_");
            const divElem = document.getElementById(divId);

            const stored = getStorage(perId);
            elem.checked = stored !== "false";
            setStorage(perId, elem.checked.toString());

            if (divElem && !drawIds.includes(_id)) {
                showHide(divElem, elem.checked, "block");
            }

            applyToggleEffect(_id, elem.checked);
        });

        sentenceCheckboxList.forEach(_id => {
            const elem = document.getElementById(_id);
            if (elem) {
                const saved = getStorage(frontBack + _id);
                elem.checked = saved !== "false";
                setStorage(frontBack + _id, elem.checked.toString());
            }
        });

        showTraditionalChar();
    }

    function applyToggleEffect(id, isShow) {
        const effects = {
            "text-pinyin": [".pinyin"],
            "text-sim": ["#char-sim-id"],
            "text-trad": ["#char-trad-id", ".sep"]
        };

        if (effects[id]) {
            effects[id].forEach(selector => showHide(selector, isShow));
        }
    }

    function showTraditionalChar() {
        const tradChar = document.getElementById("char_trad");
        const simChar = document.getElementById("char_sim");
        if (!tradChar || !simChar) return;

        if (tradChar.innerHTML !== simChar.innerHTML) {
            showHide(tradChar, getStorage(frontBack + "text-trad") === "true", "block");
        } else {
            if (getStorage(frontBack + "text-sim") === "true") {
                showHide(tradChar, false);
            }
        }
    }

    function initDrawPrefs() {
        const defaults = { "draw-size": 400, "stroke-size": 64, "hint-miss": 5, "no-of-sentence": 5, "level-of-sentence": 3 };

        numberInputList.forEach(_id => {
            const elem = document.getElementById(_id);
            if (elem) {
                const stored = getStorage(frontBack + _id);
                elem.value = stored || defaults[_id] || elem.value;
                setStorage(frontBack + _id, elem.value);
            }
        });

        const perIndex = getStorage(frontBack + "practice-select");
        const practiceSelect = document.getElementById("practice-select");
        if (practiceSelect) {
        practiceSelect.selectedIndex = perIndex || 0;
            const tradChar = document.getElementById('char_trad');
            const simChar = document.getElementById('char_sim');
            if (tradChar && simChar) {
                characters = perIndex == 1 ? tradChar.innerHTML : simChar.innerHTML;
            }
        }
    }

    function setPrefs(e) {
        if (!e || !e.id) return;
        const perId = frontBack + e.id;
        setStorage(perId, e.type === "checkbox" ? e.checked.toString() : e.type === "number" ? e.value : e.selectedIndex);

        if (e.id === "practice-select") {
            const tradChar = document.getElementById('char_trad');
            const simChar = document.getElementById('char_sim');
            if (tradChar && simChar) {
                characters = e.selectedIndex === 1
                    ? tradChar.innerHTML
                    : simChar.innerHTML;
            doPractice();
            }
            return;
        }

        if (e.type === "checkbox") {
            const drawIds = ["text-stroke-color", "text-outline"];
            if (drawIds.includes(e.id)) return;

            const divId = e.id.replace("text-", "char_");
            const divElem = document.getElementById(divId);
            if (divElem) {
                showHide(divElem, e.checked, "block");
                applyToggleEffect(e.id, e.checked);
            }

            if (["text-sim", "text-trad", "text-pinyin", "text-meaning"].includes(e.id)) {
                updateSentenceVisibility();
            }
        }
    }

    function updateSentenceVisibility() {
        const showSim = getStorage(frontBack + "text-sim") !== "false";
        const showTrad = getStorage(frontBack + "text-trad") !== "false";
        const showPinyin = getStorage(frontBack + "text-pinyin") !== "false";
        const showMeaning = getStorage(frontBack + "text-meaning") !== "false";

        showHide(document.querySelectorAll(".sen-sim"), showSim, 'block');
        showHide(document.querySelectorAll(".sen-trad"), showTrad, 'block');
        showHide(document.querySelectorAll(".sen-pin"), showPinyin, 'block');
        showHide(document.querySelectorAll(".sen-eng"), showMeaning, 'block');
    }

    function openSidebar(id) {
        const el = document.getElementById(id);
        if (el) el.style.width = id === "sidebar" ? "250px" : "160px";
    }
    function closeSidebar(id) {
        const el = document.getElementById(id);
        if (el) el.style.width = "0";
    }

    function doPractice() {
        const target = document.getElementById('character-target');
        if (!target) return;
        target.innerHTML = '';
        if (!characters) return;

        const drawSize = parseInt(document.getElementById('draw-size')?.value) || 200;
        const strokeSize = parseInt(document.getElementById('stroke-size')?.value) || 20;
        const hintMiss = parseInt(document.getElementById('hint-miss')?.value) || 3;
        const showOutline = document.getElementById('text-outline')?.checked;
        const customColor = document.getElementById('text-stroke-color')?.checked;
        const showGrid = document.getElementById('text-grid')?.checked;

        const chars = characters.split('').filter(c => /[\u4e00-\u9fa5]/.test(c));
        
        chars.forEach(char => {
            const charDiv = document.createElement('div');
            charDiv.style.display = 'inline-block';
            charDiv.style.margin = '5px';
            if (showGrid) {
                charDiv.style.border = '1px solid rgba(224, 222, 244, 0.1)';
                charDiv.style.background = 'repeating-linear-gradient(0deg, transparent, transparent 49%, rgba(224, 222, 244, 0.05) 50%, transparent 51%), repeating-linear-gradient(90deg, transparent, transparent 49%, rgba(224, 222, 244, 0.05) 50%, transparent 51%)';
            }
            target.appendChild(charDiv);

            const writer = HanziWriter.create(charDiv, char, {
                width: drawSize,
                height: drawSize,
                padding: 5,
                showOutline: showOutline !== false,
                showCharacter: false,
                strokeAnimationSpeed: 1,
                delayBetweenStrokes: 200,
                strokeColor: customColor ? '#eb81cf' : '#e0def4',
                outlineColor: '#403d52',
                drawingColor: '#9ccfd8',
                drawingThickness: strokeSize / 5,
                showHintAfterMisses: hintMiss
            });
            writer.quiz();
        });
    }

    [...switchIdList, ...numberInputList, ...sentenceCheckboxList].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                setPrefs(el);
                if (id.startsWith('text-sentence') || ['no-of-sentence', 'level-of-sentence', 'length-of-sentence'].includes(id)) {
                    const char = getCardCharacter();
                    if (char) loadMoreSentences(char);
                } else {
                    doPractice();
                }
            });
        }
    });

    const practiceSelect = document.getElementById('practice-select');
    if (practiceSelect) {
        practiceSelect.addEventListener('change', () => setPrefs(practiceSelect));
    }

    const btnMenu = document.getElementById("btnShowMenu");
    const btnMore = document.getElementById("btnMoreOptions");
    const btnFront = document.getElementById("text-front");
    const btnBack = document.getElementById("text-back");

    if (btnMenu) btnMenu.addEventListener('click', (e) => { e.stopPropagation(); openSidebar("sidebar"); });
    if (btnMore) btnMore.addEventListener('click', (e) => { e.stopPropagation(); openSidebar("more-info-sidebar"); });
    if (btnFront) btnFront.addEventListener('click', () => setActive('text-front'));
    if (btnBack) btnBack.addEventListener('click', () => setActive('text-back'));

    document.addEventListener('click', function (event) {
        const sidebar = document.getElementById("sidebar");
        const moreSidebar = document.getElementById("more-info-sidebar");
        const btnMenu = document.getElementById("btnShowMenu");
        const btnMore = document.getElementById("btnMoreOptions");

        if (sidebar && btnMenu && !sidebar.contains(event.target) && !btnMenu.contains(event.target)) {
            closeSidebar("sidebar");
        }

        if (moreSidebar && btnMore && !moreSidebar.contains(event.target) && !btnMore.contains(event.target)) {
            closeSidebar("more-info-sidebar");
        }
    });

    function initAll() {
        setActive(document.getElementById("back") ? "text-back" : "text-front");
        initPractice();
        initSwitchPrefs();
        initDrawPrefs();
    }

    initAll();
});