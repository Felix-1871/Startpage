
import { getStorage, setStorage, showHide } from '../../../src/helpers.js';


const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'components/anki/char-practice/anki-character-writer.css';
document.head.appendChild(link);

let characters = "";
let frontBack = "front";

export function initCharacterWriter(side) {
    frontBack = side === "text-front" ? "front" : "back";
    initPractice();
    initDrawPrefs();
    attachListeners();
}

function attachListeners() {
    const writerIds = [
        "practice-select",
        "draw-size", "stroke-size", "hint-miss",
        "text-grid", "text-stroke-color", "text-outline"
    ];

    writerIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => handleWriterPrefChange(id));
        }
    });
}

function initPractice() {
    const elem = document.getElementById("practice-select");
    if (!elem) return;
    const stored = getStorage(frontBack + "practice-select");
    elem.selectedIndex = (stored !== null && stored !== undefined) ? parseInt(stored) : 0;
    setStorage(frontBack + "practice-select", elem.selectedIndex);
}

function initDrawPrefs() {
    const defaults = { "draw-size": 400, "stroke-size": 64, "hint-miss": 5 };
    const numberInputList = ["draw-size", "stroke-size", "hint-miss"];

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

export function doPractice() {
    const target = document.getElementById('character-target');
    if (!target) return;
    target.innerHTML = '';
    
    const practiceSelect = document.getElementById("practice-select");
    if (practiceSelect) {
        const perIndex = practiceSelect.selectedIndex;
        const tradChar = document.getElementById('char_trad');
        const simChar = document.getElementById('char_sim');
        if (tradChar && simChar) {
            characters = perIndex == 1 ? tradChar.innerHTML : simChar.innerHTML;
        }
    }

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
        
        const rootStyle = getComputedStyle(document.documentElement);
        const colorAccent = rootStyle.getPropertyValue('--accent').trim() || '#eb81cf';
        const colorText = rootStyle.getPropertyValue('--text').trim() || '#e0def4';
        const colorHighlightMed = rootStyle.getPropertyValue('--highlight-med').trim() || '#403d52';
        const colorRose = rootStyle.getPropertyValue('--rose').trim() || '#ebbcba';
        const colorBorderSubtle = rootStyle.getPropertyValue('--border-subtle').trim() || 'rgba(224, 222, 244, 0.1)';
        const colorText05 = rootStyle.getPropertyValue('--text-05').trim() || 'rgba(224, 222, 244, 0.05)';

        if (showGrid) {
            charDiv.style.border = `1px solid ${colorBorderSubtle}`;
            charDiv.style.background = `repeating-linear-gradient(0deg, transparent, transparent 49%, ${colorText05} 50%, transparent 51%), repeating-linear-gradient(90deg, transparent, transparent 49%, ${colorText05} 50%, transparent 51%)`;
        }
        target.appendChild(charDiv);

        if (typeof HanziWriter !== 'undefined') {
            const writer = HanziWriter.create(charDiv, char, {
                width: drawSize,
                height: drawSize,
                padding: 5,
                showOutline: showOutline !== false,
                showCharacter: false,
                strokeAnimationSpeed: 1,
                delayBetweenStrokes: 200,
                strokeColor: customColor ? colorAccent : colorText,
                outlineColor: colorHighlightMed,
                drawingColor: colorRose,
                drawingThickness: strokeSize,
                showHintAfterMisses: hintMiss
            });
            writer.quiz();
        }
    });
}

export function handleWriterPrefChange(id) {
    const perId = frontBack + id;
    const elem = document.getElementById(id);
    if (!elem) return;

    setStorage(perId, elem.type === "checkbox" ? elem.checked.toString() : elem.type === "number" ? elem.value : elem.selectedIndex);

    if (id === "practice-select" || id.startsWith("draw-") || id.startsWith("stroke-") || id.startsWith("hint-") || ["text-grid", "text-stroke-color", "text-outline"].includes(id)) {
        doPractice();
    }
}

export function saveCharacterToList(char) {
    if (!char) return;
    const key = 'anki-writing-list';
    let list = JSON.parse(localStorage.getItem(key) || '[]');
    
    if (!list.includes(char)) {
        list.push(char);
        localStorage.setItem(key, JSON.stringify(list));
        console.log(`Saved character '${char}' to writing list.`);
    }
}
