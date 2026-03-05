import { openModal } from './modals.js';
import { getStorage, setStorage, showHide, invoke } from './helpers.js';

export const ANKI_SETTINGS = {
    "char_zhuyin": { label: 'Show Zhuyin', key: 'backtext-zhuyin', default: 'false', type: 'select' },
    "char_pinyin": { label: 'Show Pinyin', key: 'backtext-pinyin', default: 'true', type: 'select' },
    "char_meaning": { label: 'Show Meaning', key: 'backtext-meaning', default: 'true', type: 'select' },
    "char_sentence": { label: 'Show Sentence', key: 'backtext-sentence', default: 'true', type: 'select' },
    "char_trad": { label: 'Show Traditional', key: 'backtext-trad', default: 'false', type: 'select' },
    "char_sim": { label: 'Show Simplified', key: 'backtext-sim', default: 'true', type: 'select' },
    "char_sentence-random": { label: 'Random Sentence', key: 'backtext-sentence-random', default: 'true', type: 'select' },
    "noOfSentence": { label: 'Number of Sentences', key: 'backno-of-sentence', default: '5', type: 'number' },
    "levelOfSentence": { label: 'Sentence Level', key: 'backlevel-of-sentence', default: '6', type: 'number' },
    "lengthOfSentence": { label: 'Sentence Length', key: 'backlength-of-sentence', default: '30', type: 'number' }
};

export function loadSettingsForDeck(deckName) {
    if (!deckName) return {};
    const saved = JSON.parse(localStorage.getItem(`anki.settings.${deckName}`) || "{}");
    
    const settings = {};
    for (const name in ANKI_SETTINGS) {
        settings[name] = saved[name] !== undefined ? saved[name] : ANKI_SETTINGS[name].default;
    }

    for (const name in ANKI_SETTINGS) {
        const item = ANKI_SETTINGS[name];
        let val = settings[name];
        if (val === "true" || val === "false") {
            val = `"${val}"`;
        }
        sessionStorage.setItem(item.key, val);
    }
    return settings;
}

export function saveSettingsForDeck(deckName, data) {
    localStorage.setItem(`anki.settings.${deckName}`, JSON.stringify(data));
    loadSettingsForDeck(deckName);
}

export function setCSSDisplay() {
    const ankiContainer = document.getElementById('anki-container');
    if (!ankiContainer) return;

    const footers = ankiContainer.querySelectorAll('.modal-footer1');
    footers.forEach(f => {
        f.classList.add('hidden');
        f.style.display = 'none';
    });

    for (const name in ANKI_SETTINGS) {
        const item = ANKI_SETTINGS[name];
        if (name.startsWith('char_') ) {
            const val = sessionStorage.getItem(item.key);
            const isVisible = (val === '"true"' || val === 'true');
            
            
            const elements = ankiContainer.querySelectorAll(`#${name}, .${name}`);
            
            elements.forEach(el => {
                if (isVisible) {
                    el.classList.remove('hidden');
                    el.style.display = 'block';
                } else {
                    el.classList.add('hidden');
                    el.style.display = 'none';
                }
            });
        }
    }
}

export function openAnkiSettings(deckName, onComplete) {
    if (!deckName) return;

    const boolOptions = [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' }
    ];

    const fields = [];
    for (const name in ANKI_SETTINGS) {
        const item = ANKI_SETTINGS[name];
        const field = {
            name: name,
            label: item.label,
            type: item.type
        };
        if (item.type === 'select') {
            field.options = boolOptions;
        }
        fields.push(field);
    }

    const saved = JSON.parse(localStorage.getItem(`anki.settings.${deckName}`) || "{}");
    const currentValues = {};
    for (const name in ANKI_SETTINGS) {
        currentValues[name] = saved[name] !== undefined ? saved[name] : ANKI_SETTINGS[name].default;
    }

    openModal(`Settings: ${deckName}`, fields, currentValues, (data) => {
        saveSettingsForDeck(deckName, data);
        setCSSDisplay();
        if (onComplete) onComplete();
    });
}
