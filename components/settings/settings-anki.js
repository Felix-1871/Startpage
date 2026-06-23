import { ANKI_SETTINGS, saveSettingsForDeck } from '../anki-xiehanzi/anki-xiehanzi-helpers.js';
import { invoke, parseStorage } from '../../src/helpers.js';
import { getAnkiDeckStorageKey } from '../../src/config/defaults.js';

export function renderAnkiSettings(moduleManager) {
    const ankiSection = document.getElementById('settings-content-anki');
    if (!ankiSection) return;

    ankiSection.innerHTML = `
        <div class="settings-header">
            <h3>Anki Xiehanzi Settings</h3>
            <p>Configure your Anki integration and Chinese practice preferences.</p>
        </div>
        <div class="settings-group">
            <label for="anki-deck-selector-settings">Selected Deck:</label>
            <select id="anki-deck-selector-settings" class="anki-select"></select>
        </div>
        <div id="anki-fields-container" class="settings-group">
            <p>Select a deck to configure settings.</p>
        </div>
    `;

    const deckSelect = document.getElementById('anki-deck-selector-settings');
    const fieldsContainer = document.getElementById('anki-fields-container');

    const activeAnkiModule = moduleManager.getActiveModuleInSlot('midleft-target');
    const storageKey = getAnkiDeckStorageKey(activeAnkiModule || 'anki-xiehanzi');

    invoke('deckNames', 6).then(deckNames => {
        if (!deckNames) return;

        deckNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            deckSelect.appendChild(option);
        });

        const savedDeck = localStorage.getItem(storageKey);
        if (savedDeck && deckNames.includes(savedDeck)) {
            deckSelect.value = savedDeck;
        }

        const renderFields = () => {
            const deckName = deckSelect.value;
            if (!deckName) return;

            localStorage.setItem(storageKey, deckName);
            fieldsContainer.innerHTML = '<h4>Fields Configuration</h4>';
            const saved = parseStorage(`anki.settings.${deckName}`, {});

            for (const key in ANKI_SETTINGS) {
                const item = ANKI_SETTINGS[key];
                const val = saved[key] !== undefined ? saved[key] : item.default;

                const div = document.createElement('div');
                div.className = 'settings-field';
                div.style.marginBottom = '10px';
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.alignItems = 'center';

                const label = document.createElement('label');
                label.textContent = item.label;
                div.appendChild(label);

                if (item.type === 'select') {
                    const select = document.createElement('select');
                    select.className = 'anki-select';
                    select.innerHTML = `
                        <option value="true" ${val === 'true' ? 'selected' : ''}>Yes</option>
                        <option value="false" ${val === 'false' ? 'selected' : ''}>No</option>
                    `;
                    select.onchange = () => {
                        saved[key] = select.value;
                        saveSettingsForDeck(deckName, saved);
                    };
                    div.appendChild(select);
                } else if (item.type === 'number') {
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.className = 'anki-input';
                    input.value = val;
                    input.onchange = () => {
                        saved[key] = input.value;
                        saveSettingsForDeck(deckName, saved);
                    };
                    div.appendChild(input);
                }
                fieldsContainer.appendChild(div);
            }
        };

        deckSelect.onchange = renderFields;
        renderFields();
    });
}
