import { ANKI_SETTINGS } from '../anki-xiehanzi-helpers.js';
import { invoke, getStorage } from '../../../src/helpers.js';


const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'components/anki/sentences/anki-sentences.css';
document.head.appendChild(link);

let sentencesData = null;
let indexByChar = null;
let cachedResults = [];
let lastQueryKey = "";
let sentenceOffset = 0;
let isSentenceLoading = false;

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

export async function loadSentences(searchText, prefix = "front") {
    if (!searchText) return;
    
    if (sentencesData && indexByChar) {
        loadMoreSentences(searchText, prefix);
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

        loadMoreSentences(searchText, prefix);
    } catch (error) {
        console.error("Failed to load sentences:", error);
        const container = document.getElementById("char_sentence");
        if (container) container.classList.add("hidden");
    } finally {
        isSentenceLoading = false;
    }
}

export function loadMoreSentences(searchText, prefix = "front") {
    if (!sentencesData || !indexByChar || !searchText) return;

    
    const getKey = (keyName) => {
        
        
        
        
        
        
        
        
        
        
        
        return prefix + keyName;
    };

    const settings = {
        limit: parseInt(getStorage(prefix + "no-of-sentence")) || 5,
        level: parseInt(getStorage(prefix + "level-of-sentence")) || 9,
        length: parseInt(getStorage(prefix + "length-of-sentence")) || 10,
        random: getStorage(prefix + "text-sentence-random") === "true",
        show: getStorage(prefix + "text-sentence") !== "false",
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

    const showSim = getStorage(prefix + "text-sim") !== "false";
    const showPin = getStorage(prefix + "text-pinyin") !== "false";
    const showMean = getStorage(prefix + "text-meaning") !== "false";

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

export function updateSentenceVisibility(prefix = "front") {
    const showSim = getStorage(prefix + "text-sim") !== "false";
    const showPinyin = getStorage(prefix + "text-pinyin") !== "false";
    const showMeaning = getStorage(prefix + "text-meaning") !== "false";

    const sentences = document.querySelectorAll(".sentence");
    sentences.forEach(div => {
        const sim = div.querySelector(".sen-sim");
        const pin = div.querySelector(".sen-pin");
        const eng = div.querySelector(".sen-eng");
        if (sim) sim.style.display = showSim ? 'block' : 'none';
        if (pin) pin.style.display = showPinyin ? 'block' : 'none';
        if (eng) eng.style.display = showMeaning ? 'block' : 'none';
    });
}