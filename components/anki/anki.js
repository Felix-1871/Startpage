import { createAnkiCore } from '../../src/anki-core.js';
import { invoke } from '../../src/helpers.js';

const ankiCore = createAnkiCore({
    storageKey: 'anki-basic.selectedDeck',
    disconnectedMessage: 'Anki disconnected',
});

export const updateAnkiStats = ankiCore.updateAnkiStats;

export function init() {
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

    async function renderCard(card) {
        ankiCore.clearBlobUrls();
        await ankiCore.processAnkiHtml(cardFront, card.question);
        await ankiCore.processAnkiHtml(cardBack, card.answer);

        cardFront.classList.remove('hidden');
        cardBack.classList.add('hidden');
        cardDivider.classList.add('hidden');
        showAnswerBtn.classList.remove('hidden');
        easeButtons.classList.add('hidden');

        cardFront.style.display = '';
        cardBack.style.display = '';
        showAnswerBtn.style.display = '';
        easeButtons.style.display = '';
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
    const statsInterval = setInterval(updateAnkiStats, 60 * 1000);

    return () => clearInterval(statsInterval);
}
