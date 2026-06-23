import { invoke, b64toBlob } from './helpers.js';

const MIME_BY_EXT = {
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

function mimeForFilename(filename) {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    return MIME_BY_EXT[ext] || 'application/octet-stream';
}

export function createAnkiCore({ storageKey, disconnectedMessage = 'Anki disconnected', onDeckSelected, processOptions = {} }) {
    let activeBlobUrls = [];
    const injectedScripts = [];

    function clearBlobUrls() {
        activeBlobUrls.forEach(url => URL.revokeObjectURL(url));
        activeBlobUrls = [];
        injectedScripts.forEach((script) => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        });
        injectedScripts.length = 0;
    }

    async function processAnkiHtml(container, html) {
        if (!html) {
            container.innerHTML = '';
            return;
        }

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        if (processOptions.removeFooters) {
            tempDiv.querySelectorAll('.modal-footer1').forEach(f => f.remove());
        }

        const mediaElements = tempDiv.querySelectorAll('[src], [href]');
        const filenames = new Map();
        for (const el of mediaElements) {
            const attr = el.hasAttribute('src') ? 'src' : 'href';
            const path = el.getAttribute(attr);
            if (!path || path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) continue;
            const filename = path.split('/').pop();
            if (!filenames.has(filename)) {
                filenames.set(filename, []);
            }
            filenames.get(filename).push({ el, attr });
        }

        await Promise.all([...filenames.keys()].map(async (filename) => {
            const base64 = await invoke('retrieveMediaFile', 6, { filename });
            const targets = filenames.get(filename);
            for (const { el, attr } of targets) {
                if (base64) {
                    const blob = b64toBlob(base64, mimeForFilename(filename));
                    const blobUrl = URL.createObjectURL(blob);
                    activeBlobUrls.push(blobUrl);
                    el.setAttribute(attr, blobUrl);
                } else {
                    el.setAttribute(attr, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
                }
            }
        }));

        if (processOptions.groupCharMeaning && container.id === 'char_meaning') {
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
                injectedScripts.push(newScript);
            } catch {
                // script injection may fail for some Anki card content
            }
        }
    }

    async function updateAnkiStats() {
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
            ankiMessage.textContent = disconnectedMessage;
            ankiStudyBtn.style.display = 'none';
            deckSelect.parentElement.style.display = 'none';
            return;
        }

        const deckNames = await invoke('deckNames', 6);
        if (!deckNames) return;

        if (deckSelect.options.length <= 1 || deckSelect.options[0].value === '') {
            const currentVal = deckSelect.value;
            deckSelect.innerHTML = '';
            deckNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                deckSelect.appendChild(option);
            });

            const savedDeck = localStorage.getItem(storageKey);
            if (savedDeck && deckNames.includes(savedDeck)) {
                deckSelect.value = savedDeck;
            } else if (currentVal && deckNames.includes(currentVal)) {
                deckSelect.value = currentVal;
            }
        }

        const selectedDeck = deckSelect.value;
        if (!selectedDeck) return;

        localStorage.setItem(storageKey, selectedDeck);
        if (onDeckSelected) onDeckSelected(selectedDeck);

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
                const isStudying = !ankiStudyView.classList.contains('hidden');
                ankiStudyBtn.style.display = isStudying ? 'none' : (total > 0 ? 'block' : 'none');

                if (total === 0) {
                    ankiMessage.style.display = 'block';
                    ankiMessage.textContent = 'Deck finished for now!';
                } else {
                    ankiMessage.style.display = 'none';
                }
            }

            ankiStats.style.display = 'flex';
            deckSelect.parentElement.style.display = 'block';
        } catch (e) {
            console.error('Failed to parse Anki stats', e);
        }
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

    function createStudyHelpers({ renderCard, onStopStudy }) {
        const cardFront = document.getElementById('anki-card-front');
        const cardBack = document.getElementById('anki-card-back');
        const cardDivider = document.getElementById('anki-card-divider');
        const showAnswerBtn = document.getElementById('anki-show-answer');
        const easeButtons = document.getElementById('anki-ease-buttons');
        const ankiStatsView = document.getElementById('anki-stats-view');
        const ankiStudyView = document.getElementById('anki-study-view');
        const ankiStudyBtn = document.getElementById('anki-study-btn');
        const deckSelect = document.getElementById('anki-deck-select');
        const middleLeft = document.querySelector('.middle-left');

        let loadRetryCount = 0;
        const MAX_LOAD_RETRIES = 20;

        async function loadCurrentCard() {
            const card = await invoke('guiCurrentCard', 6);
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
                    loadRetryCount = 0;
                    return;
                }

                if (loadRetryCount < MAX_LOAD_RETRIES) {
                    loadRetryCount++;
                    setTimeout(loadCurrentCard, 500);
                }
                return;
            }

            loadRetryCount = 0;
            await renderCard(card);
        }

        async function startStudy() {
            const selectedDeck = deckSelect.value;
            if (!selectedDeck) return;
            await invoke('guiDeckReview', 6, { name: selectedDeck });
            ankiStatsView.style.display = 'none';
            ankiStudyView.classList.remove('hidden');
            ankiStudyBtn.style.display = 'none';
            middleLeft.classList.add('expanded');
            loadCurrentCard();
        }

        function stopStudy() {
            ankiStatsView.style.display = 'block';
            ankiStudyView.classList.add('hidden');
            ankiStudyBtn.style.display = 'block';
            middleLeft.classList.remove('expanded');
            if (onStopStudy) onStopStudy();
            updateAnkiStats();
        }

        return { loadCurrentCard, startStudy, stopStudy, clearBlobUrls, processAnkiHtml };
    }

    return {
        clearBlobUrls,
        processAnkiHtml,
        updateAnkiStats,
        playAudio,
        createStudyHelpers,
    };
}
