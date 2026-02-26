document.addEventListener('DOMContentLoaded', () => {
    const ankiStatsView = document.getElementById('anki-stats-view');
    const ankiStudyView = document.getElementById('anki-study-view');
    const ankiStudyBtn = document.getElementById('anki-study-btn');
    const ankiBackBtn = document.getElementById('anki-back-btn');
    const deckSelect = document.getElementById('anki-deck-select');
    
    const ankiNew = document.getElementById('anki-new');
    const ankiLearning = document.getElementById('anki-learning');
    const ankiDue = document.getElementById('anki-due');
    const ankiMessage = document.getElementById('anki-message');

    const cardFront = document.getElementById('anki-card-front');
    const cardBack = document.getElementById('anki-card-back');
    const cardDivider = document.getElementById('anki-card-divider');
    const showAnswerBtn = document.getElementById('anki-show-answer');
    const easeButtons = document.getElementById('anki-ease-buttons');

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

        // Fix media paths by fetching them via AnkiConnect
        const mediaElements = tempDiv.querySelectorAll('[src], [href], link[rel="stylesheet"]');
        for (const el of mediaElements) {
            const attr = el.hasAttribute('src') ? 'src' : 'href';
            let path = el.getAttribute(attr);
            
            if (!path || path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) continue;

            // Handle relative paths in Anki (often just the filename)
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

        // Inject the HTML
        container.innerHTML = tempDiv.innerHTML;

        // Manually execute scripts
        const scripts = tempDiv.querySelectorAll('script');
        for (const oldScript of scripts) {
            const newScript = document.createElement('script');
            if (oldScript.src) {
                newScript.src = oldScript.src;
                // Wait for external scripts to load to preserve execution order
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

    async function updateAnkiStats() {
        const version = await invoke('version', 6);
        if (!version) {
            document.getElementById('anki-stats').style.display = 'none';
            ankiMessage.style.display = 'block';
            ankiMessage.textContent = 'Anki disconnected (Is it running?)';
            ankiStudyBtn.style.display = 'none';
            deckSelect.parentElement.style.display = 'none';
            return;
        }

        const deckNames = await invoke('deckNames', 6);
        if (!deckNames) return;

        // Populate dropdown if empty
        if (deckSelect.options.length <= 1 || deckSelect.options[0].value === "") {
            const currentVal = deckSelect.value;
            deckSelect.innerHTML = '';
            deckNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                deckSelect.appendChild(option);
            });
            
            // Try to restore previous selection
            const savedDeck = localStorage.getItem('anki.selectedDeck');
            if (savedDeck && deckNames.includes(savedDeck)) {
                deckSelect.value = savedDeck;
            } else if (currentVal && deckNames.includes(currentVal)) {
                deckSelect.value = currentVal;
            }
        }

        const selectedDeck = deckSelect.value;
        if (!selectedDeck) {
            // If still no deck selected (e.g. fresh install), don't show 0s
            return;
        }

        localStorage.setItem('anki.selectedDeck', selectedDeck);

        try {
        const deckStats = await invoke('getDeckStats', 6, { decks: [selectedDeck] });
        
        if (deckStats && deckStats[selectedDeck]) {
            const stat = deckStats[selectedDeck];
                ankiNew.textContent = stat.new_count ?? 0;
                ankiLearning.textContent = stat.learn_count ?? 0;
                ankiDue.textContent = stat.review_count ?? 0;
                
                const total = (stat.new_count || 0) + (stat.learn_count || 0) + (stat.review_count || 0);
                ankiStudyBtn.style.display = total > 0 ? 'block' : 'none';
                if (total === 0) {
                    ankiMessage.style.display = 'block';
                    ankiMessage.textContent = 'Deck finished for now!';
                } else {
                    ankiMessage.style.display = 'none';
                }
            }

            document.getElementById('anki-stats').style.display = 'flex';
            deckSelect.parentElement.style.display = 'block';
        } catch (e) {
            console.error('Failed to parse Anki stats', e);
        }
    }

    async function loadCurrentCard() {
        // Try to get current card
        let card = await invoke('guiCurrentCard', 6);
        
        // If null, Anki might not be in the reviewer yet or deck is empty
        if (!card) {
            // Check if there are actually cards due
            await updateAnkiStats();
            const total = parseInt(ankiNew.textContent) + parseInt(ankiLearning.textContent) + parseInt(ankiDue.textContent);
            
            if (total === 0) {
                cardFront.innerHTML = '<div style="text-align:center; padding:20px;">All done!</div>';
                cardBack.style.display = 'none';
                cardDivider.style.display = 'none';
                showAnswerBtn.style.display = 'none';
                easeButtons.style.display = 'none';
                return;
            } else {
                // If cards are due but guiCurrentCard is null, try to re-trigger review
                const selectedDeck = deckSelect.value;
                await invoke('guiDeckReview', 6, { name: selectedDeck });
                // Wait a tiny bit for Anki UI to catch up
                setTimeout(async () => {
                    card = await invoke('guiCurrentCard', 6);
                    if (card) renderCard(card);
                }, 200);
                return;
            }
        }

        renderCard(card);
    }

    async function renderCard(card) {
        clearBlobUrls();
        await processAnkiHtml(cardFront, card.question);
        await processAnkiHtml(cardBack, card.answer);
        
        cardBack.style.display = 'none';
        cardDivider.style.display = 'none';
        showAnswerBtn.style.display = 'block';
        easeButtons.style.display = 'none';
    }

    async function startStudy() {
        const selectedDeck = deckSelect.value;
        if (!selectedDeck) return;

        // Ensure Anki is showing the right deck
        await invoke('guiDeckReview', 6, { name: selectedDeck });

        ankiStatsView.style.display = 'none';
        ankiStudyView.style.display = 'block';
        ankiStudyBtn.style.display = 'none';
        
        loadCurrentCard();
    }

    function stopStudy() {
        ankiStatsView.style.display = 'block';
        ankiStudyView.style.display = 'none';
        ankiStudyBtn.style.display = 'block';
        updateAnkiStats();
    }

    // Event Listeners
    ankiStudyBtn.addEventListener('click', startStudy);
    ankiBackBtn.addEventListener('click', stopStudy);
    deckSelect.addEventListener('change', () => {
        updateAnkiStats();
    });

    showAnswerBtn.addEventListener('click', async () => {
        await invoke('guiShowAnswer', 6);
        cardBack.style.display = 'block';
        cardDivider.style.display = 'block';
        showAnswerBtn.style.display = 'none';
        easeButtons.style.display = 'flex';
    });

    document.querySelectorAll('#anki-ease-buttons .anki-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const ease = parseInt(btn.dataset.ease);
            await invoke('guiAnswerCard', 6, { ease });
            // Small delay to let Anki scheduling advance
            setTimeout(loadCurrentCard, 150);
        });
    });

    // Initial load
    updateAnkiStats();
    // Refresh stats every minute
    setInterval(updateAnkiStats, 60 * 1000);
});
