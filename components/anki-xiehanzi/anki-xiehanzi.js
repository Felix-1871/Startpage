import { loadSettingsForDeck, setCSSDisplay, getStorage, setStorage, showHide } from './anki-xiehanzi-helpers.js';
import { createAnkiCore } from '../../src/anki-core.js';
import { invoke } from '../../src/helpers.js';
import { initCharacterWriter, doPractice, saveCharacterToList } from './char-practice/anki-character-writer.js';
import { loadSentences, loadMoreSentences, updateSentenceVisibility } from './sentences/anki-sentences.js';

const ankiCore = createAnkiCore({
    storageKey: 'anki-xiehanzi.selectedDeck',
    disconnectedMessage: 'Anki disconnected (Is it running?)',
    onDeckSelected: (deck) => {
        loadSettingsForDeck(deck);
        setCSSDisplay();
    },
    processOptions: { removeFooters: true, groupCharMeaning: true },
});

export const updateAnkiStats = ankiCore.updateAnkiStats;

function loadSubCss(id, href) {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.id = id;
    document.head.appendChild(link);
}

export function init() {
    loadSubCss('style-anki-sentences', 'components/anki-xiehanzi/sentences/anki-sentences.css');
    loadSubCss('style-anki-character-writer', 'components/anki-xiehanzi/char-practice/anki-character-writer.css');

    const ankiStatsView = document.getElementById('anki-stats-view');
    const ankiStudyView = document.getElementById('anki-study-view');
    const ankiStudyBtn = document.getElementById('anki-study-btn');
    const ankiBackBtn = document.getElementById('anki-back-btn');
    const deckSelect = document.getElementById('anki-deck-select');

    const cardFront = document.getElementById('anki-card-front');
    const cardBack = document.getElementById('anki-card-back');
    const cardDivider = document.getElementById('anki-card-divider');
    const showAnswerBtn = document.getElementById('anki-show-answer');
    const easeButtons = document.getElementById('anki-ease-buttons');
    const ankiPlayAudioBtn = document.querySelector('.anki-play-audio');

    const switchIdList = ['text-pinyin', 'text-meaning', 'text-sim', 'text-trad'];
    const numberInputList = ['no-of-sentence', 'level-of-sentence', 'length-of-sentence'];
    const sentenceCheckboxList = ['text-sentence', 'text-sentence-random', 'text-sentence-colored'];
    let frontBack = 'front';

    function getCardCharacter() {
        if (!cardFront) return null;
        const text = cardFront.textContent.trim();
        const match = text.match(/[\u4e00-\u9fa5]/);
        return match ? match[0] : text.charAt(0) || null;
    }

    async function renderCard(card) {
        ankiCore.clearBlobUrls();
        const selectedDeck = deckSelect.value;
        loadSettingsForDeck(selectedDeck);

        await ankiCore.processAnkiHtml(cardFront, card.question);
        await ankiCore.processAnkiHtml(cardBack, card.answer);

        const isWriteDeck = card && card.deckName && card.deckName.toLowerCase().includes('write');
        const writerContainer = document.getElementById('character-target');

        if (isWriteDeck) {
            writerContainer.style.display = 'block';
            await invoke('guiShowAnswer', 6);
            cardFront.classList.add('hidden');
            cardBack.classList.remove('hidden');
            cardDivider.classList.remove('hidden');
            showAnswerBtn.classList.add('hidden');
            easeButtons.classList.remove('hidden');
        } else {
            writerContainer.style.display = 'none';
            cardFront.classList.remove('hidden');
            cardBack.classList.add('hidden');
            cardDivider.classList.add('hidden');
            showAnswerBtn.classList.remove('hidden');
            easeButtons.classList.add('hidden');
        }

        cardFront.style.display = '';
        cardBack.style.display = '';
        showAnswerBtn.style.display = '';
        easeButtons.style.display = '';

        setCSSDisplay();

        const char = getCardCharacter();
        if (char) {
            const currentPrefix = isWriteDeck ? 'back' : frontBack;
            loadSentences(char, currentPrefix);

            const perIndex = getStorage(currentPrefix + 'practice-select');
            const tradChar = document.getElementById('char_trad')?.innerText || '';
            const simChar = document.getElementById('char_sim')?.innerText || char;
            window.characters = perIndex == 1 ? tradChar : simChar;
            doPractice();
        }

        setTimeout(setCSSDisplay, 100);
    }

    const { loadCurrentCard, startStudy, stopStudy } = ankiCore.createStudyHelpers({ renderCard });

    if (ankiStudyBtn) ankiStudyBtn.addEventListener('click', startStudy);
    if (ankiBackBtn) ankiBackBtn.addEventListener('click', stopStudy);
    if (ankiPlayAudioBtn) ankiPlayAudioBtn.addEventListener('click', () => ankiCore.playAudio());
    if (deckSelect) deckSelect.addEventListener('change', () => updateAnkiStats());

    if (showAnswerBtn) showAnswerBtn.addEventListener('click', async () => {
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
            if (ease < 4) {
                const char = getCardCharacter();
                saveCharacterToList(char);
            }
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
                if (char) loadMoreSentences(char, frontBack);
            }
        });
    }

    function setActive(side) {
        frontBack = side === 'text-front' ? 'front' : 'back';
        const frontBtn = document.getElementById('text-front');
        const backBtn = document.getElementById('text-back');
        if (frontBtn && backBtn) {
            if (side === 'text-front') {
                frontBtn.classList.add('btn-active');
                backBtn.classList.remove('btn-active');
            } else {
                backBtn.classList.add('btn-active');
                frontBtn.classList.remove('btn-active');
            }
        }
        initSwitchPrefs();
        updateSentenceVisibility(frontBack);
        initCharacterWriter(side);
    }

    function applyToggleEffect(id, isShow) {
        const effects = {
            'text-pinyin': ['.pinyin'],
            'text-sim': ['#char-sim-id'],
            'text-trad': ['#char-trad-id', '.sep']
        };

        if (effects[id]) {
            effects[id].forEach(selector => showHide(selector, isShow));
        }
    }

    function showTraditionalChar() {
        const tradChar = document.getElementById('char_trad');
        const simChar = document.getElementById('char_sim');
        if (!tradChar || !simChar) return;

        if (tradChar.innerHTML !== simChar.innerHTML) {
            showHide(tradChar, getStorage(frontBack + 'text-trad') === 'true', 'block');
        } else if (getStorage(frontBack + 'text-sim') === 'true') {
            showHide(tradChar, false);
        }
    }

    function initSwitchPrefs() {
        switchIdList.forEach(_id => {
            const perId = frontBack + _id;
            const elem = document.getElementById(_id);
            if (!elem) return;
            const divId = _id.replace('text-', 'char_');
            const divElem = document.getElementById(divId);

            const stored = getStorage(perId);
            elem.checked = stored !== 'false';
            setStorage(perId, elem.checked.toString());

            if (divElem) {
                showHide(divElem, elem.checked, 'block');
            }

            applyToggleEffect(_id, elem.checked);
        });

        sentenceCheckboxList.forEach(_id => {
            const elem = document.getElementById(_id);
            if (elem) {
                const saved = getStorage(frontBack + _id);
                elem.checked = saved !== 'false';
                setStorage(frontBack + _id, elem.checked.toString());
            }
        });

        showTraditionalChar();
    }

    function setPrefs(e) {
        if (!e || !e.id) return;
        const perId = frontBack + e.id;
        setStorage(perId, e.type === 'checkbox' ? e.checked.toString() : e.type === 'number' ? e.value : e.selectedIndex);

        if (e.type === 'checkbox') {
            const divId = e.id.replace('text-', 'char_');
            const divElem = document.getElementById(divId);
            if (divElem) {
                showHide(divElem, e.checked, 'block');
                applyToggleEffect(e.id, e.checked);
            }

            if (['text-sim', 'text-trad', 'text-pinyin', 'text-meaning'].includes(e.id)) {
                updateSentenceVisibility(frontBack);
            }
        }
    }

    function openSidebar(id) {
        const el = document.getElementById(id);
        if (el) el.style.width = id === 'sidebar' ? '250px' : '160px';
    }

    function closeSidebar(id) {
        const el = document.getElementById(id);
        if (el) el.style.width = '0';
    }

    [...switchIdList, ...numberInputList, ...sentenceCheckboxList].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                setPrefs(el);
                if (id.startsWith('text-sentence') || ['no-of-sentence', 'level-of-sentence', 'length-of-sentence'].includes(id)) {
                    const char = getCardCharacter();
                    if (char) loadMoreSentences(char, frontBack);
                }
            });
        }
    });

    const btnMenu = document.getElementById('btnShowMenu');
    const btnMore = document.getElementById('btnMoreOptions');
    const btnFront = document.getElementById('text-front');
    const btnBack = document.getElementById('text-back');

    if (btnMenu) btnMenu.addEventListener('click', (e) => { e.stopPropagation(); openSidebar('sidebar'); });
    if (btnMore) btnMore.addEventListener('click', (e) => { e.stopPropagation(); openSidebar('more-info-sidebar'); });
    if (btnFront) btnFront.addEventListener('click', () => setActive('text-front'));
    if (btnBack) btnBack.addEventListener('click', () => setActive('text-back'));

    const onDocumentClick = (event) => {
        const sidebar = document.getElementById('sidebar');
        const moreSidebar = document.getElementById('more-info-sidebar');
        const menuBtn = document.getElementById('btnShowMenu');
        const moreBtn = document.getElementById('btnMoreOptions');

        if (sidebar && menuBtn && !sidebar.contains(event.target) && !menuBtn.contains(event.target)) {
            closeSidebar('sidebar');
        }

        if (moreSidebar && moreBtn && !moreSidebar.contains(event.target) && !moreBtn.contains(event.target)) {
            closeSidebar('more-info-sidebar');
        }
    };

    document.addEventListener('click', onDocumentClick);

    setActive(document.getElementById('back') ? 'text-back' : 'text-front');

    updateAnkiStats();
    const statsInterval = setInterval(updateAnkiStats, 60 * 1000);

    return () => {
        clearInterval(statsInterval);
        document.removeEventListener('click', onDocumentClick);
    };
}
