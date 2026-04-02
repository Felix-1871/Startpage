import { ANKI_SETTINGS, loadSettingsForDeck, saveSettingsForDeck, setCSSDisplay } from '../anki/anki-xiehanzi-helpers.js';

let moduleManager;
let settingsModal;
let categories;
let sections;
let wireframeSlots;
let moduleSelectorPanel;
let availableModulesList;
let selectedSlotName;
let closeModuleSelector;

let contextMenuConfig;
let searchEngines;

const defaultSearchEngines = {
    'General': [
        { value: 'ecosia', label: 'Ecosia', url: 'https://www.ecosia.org/search?q=', icon: 'ecosia.svg' },
        { value: 'google', label: 'Google', url: 'https://www.google.com/search?q=', icon: 'google.svg' },
        { value: 'duckduckgo', label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', icon: 'duckduckgo.svg' },
    ],
    'Dev': [
        { value: 'arch_wiki', label: 'Arch', url: 'https://wiki.archlinux.org/index.php?title=Special%253ASearch&fulltext=1&search=', icon: 'archlinux.svg' },
        { value: 'github', label: 'GitHub', url: 'https://github.com/search?q=', icon: 'github.svg' },
        { value: 'stackoverflow', label: 'Stack Overflow', url: 'https://stackoverflow.com/search?q=', icon: 'stackoverflow.svg' },
        { value: 'aur', label: 'AUR', url: 'https://aur.archlinux.org/packages?O=0&K=', icon: 'archlinux.svg' },
    ],
    'Media': [
        { value: 'yt', label: 'Youtube', url: 'https://www.youtube.com/results?search_query=', icon: 'youtube.svg' },
        { value: 'twitch', label: 'Twitch', url: 'https://www.twitch.tv/search?term=', icon: 'twitch.svg' },
        { value: 'reddit', label: 'Reddit', url: 'https://www.reddit.com/search/?q=', icon: 'reddit.svg' },
    ],
    'Social': [
        { value: 'discord_webhook', label: 'Discord', url: '', icon: 'discord.svg' },
    ]
};

function loadSearchEngines() {
    const saved = localStorage.getItem('searchEngines');
    if (saved) {
        searchEngines = JSON.parse(saved);
    } else {
        searchEngines = JSON.parse(JSON.stringify(defaultSearchEngines));
    }
}

function saveSearchEngines() {
    localStorage.setItem('searchEngines', JSON.stringify(searchEngines));
}

const defaultContextMenuConfig = {
    'global': [
        { title: 'System Actions', items: [
            { id: 'settings', label: 'Settings', enabled: true },
            { id: 'update-anki', label: 'Update Anki', enabled: true },
            { id: 'update-lute', label: 'Update Lute', enabled: true }
        ]},
        { title: 'Sync Actions', items: [
            { id: 'full-sync', label: 'Full Sync', enabled: true },
            { id: 'interactive-sync', label: 'Interactive Sync', enabled: true }
        ]},
        { title: 'Add Actions', items: [
            { id: 'add-category', label: 'Add New Category', enabled: true },
            { id: 'add-link', label: 'Add New Link', enabled: true },
            { id: 'add-bookmark', label: 'Add New Bookmark', enabled: true }
        ]}
    ],
    'category': [
        { title: 'Category Actions', items: [
            { id: 'edit-category', label: 'Edit Category', enabled: true },
            { id: 'remove-category', label: 'Remove Category', enabled: true }
        ]}
    ],
    'link': [
        { title: 'Link Actions', items: [
            { id: 'edit-link', label: 'Edit Link', enabled: true },
            { id: 'remove-link', label: 'Remove Link', enabled: true }
        ]}
    ],
    'bookmark': [
        { title: 'Bookmark Actions', items: [
            { id: 'edit-bookmark', label: 'Edit Bookmark', enabled: true },
            { id: 'remove-bookmark', label: 'Remove Bookmark', enabled: true }
        ]}
    ]
};

function loadContextMenuConfig() {
    const saved = localStorage.getItem('contextMenuConfig');
    if (saved) {
        contextMenuConfig = JSON.parse(saved);
    } else {
        contextMenuConfig = JSON.parse(JSON.stringify(defaultContextMenuConfig));
    }
}

function saveContextMenuConfig() {
    localStorage.setItem('contextMenuConfig', JSON.stringify(contextMenuConfig));
}

export async function openSettings() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    try {
        const response = await fetch('components/settings/settings.html');
        const html = await response.text();
        
        modalContainer.innerHTML = html;
        modalContainer.style.display = 'flex';
        
        loadContextMenuConfig();
        loadSearchEngines();
        initElements();
        updateWireframe();
        checkTabsVisibility();
        renderAnkiSettings();
        renderContextMenuEditor();
        renderSearchEngineEditor();
    } catch (error) {
        console.error('Failed to open settings:', error);
    }
}

function checkTabsVisibility() {
    const modules = ['tabs', 'anki', 'lute', 'searchbar'];
    modules.forEach(mod => {
        const isActive = moduleManager.activeModules.has(mod);
        const categoryItem = document.getElementById(`settings-category-${mod}`);
        if (categoryItem) {
            categoryItem.style.display = isActive ? 'block' : 'none';
        }
    });
}

function initElements() {
    settingsModal = document.getElementById('settings-modal-inner');
    categories = settingsModal.querySelectorAll('.settings-category-item');
    sections = settingsModal.querySelectorAll('.settings-section');
    wireframeSlots = settingsModal.querySelectorAll('.wireframe-slot');
    moduleSelectorPanel = document.getElementById('module-selector-panel');
    availableModulesList = document.getElementById('available-modules-list');
    selectedSlotName = document.getElementById('selected-slot-name');
    closeModuleSelector = document.getElementById('close-module-selector');

    const refreshIconBtn = document.getElementById('refresh-icon-list-btn');
    const refreshStatus = document.getElementById('refresh-icon-status');

    if (refreshIconBtn) {
        refreshIconBtn.addEventListener('click', () => {
            refreshStatus.textContent = 'Please run updateIconList.sh manually in your terminal to update the icons.json file.';
            refreshStatus.style.color = 'var(--gold)';
        });
    }

    categories.forEach(cat => {
        cat.addEventListener('click', () => {
            const target = cat.dataset.category;
            categories.forEach(c => c.classList.remove('active'));
            cat.classList.add('active');
            sections.forEach(sec => {
                sec.classList.toggle('active', sec.id === `settings-content-${target}`);
            });
        });
    });

    wireframeSlots.forEach(slot => {
        slot.addEventListener('click', () => {
            const slotId = slot.dataset.slot;
            showModuleSelector(slotId);
        });
    });

    closeModuleSelector.addEventListener('click', () => {
        moduleSelectorPanel.classList.add('hidden');
    });

    const addCategoryBtn = document.getElementById('add-context-category-btn');
    const typeSelector = document.getElementById('context-menu-type-selector');

    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => {
            const currentType = typeSelector ? typeSelector.value : 'global';
            contextMenuConfig[currentType].push({
                title: 'New Category',
                items: []
            });
            saveContextMenuConfig();
            renderContextMenuEditor();
        });
    }

    if (typeSelector) {
        typeSelector.addEventListener('change', () => {
            renderContextMenuEditor();
        });
    }

    const addSearchCategoryBtn = document.getElementById('add-search-category-btn');
    if (addSearchCategoryBtn) {
        addSearchCategoryBtn.addEventListener('click', () => {
            const newCatName = 'New Category';
            let finalName = newCatName;
            let counter = 1;
            while (searchEngines[finalName]) {
                finalName = `${newCatName} ${counter++}`;
            }
            searchEngines[finalName] = [];
            saveSearchEngines();
            renderSearchEngineEditor();
        });
    }

    // Close on click outside modal
    const modalContainer = document.getElementById('modal-container');
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            modalContainer.style.display = 'none';
        }
    });
}

function renderAnkiSettings() {
    const ankiSection = document.getElementById('settings-content-anki');
    if (!ankiSection) return;

    ankiSection.innerHTML = `
        <div class="settings-header">
            <h3>Anki Settings</h3>
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

    import('../anki/anki.js').then(async (m) => {
        const deckNames = await (await import('../../src/helpers.js')).invoke('deckNames', 6);
        if (deckNames) {
            deckNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                deckSelect.appendChild(option);
            });

            const savedDeck = localStorage.getItem('anki.selectedDeck');
            if (savedDeck && deckNames.includes(savedDeck)) {
                deckSelect.value = savedDeck;
            }

            const renderFields = () => {
                const deckName = deckSelect.value;
                if (!deckName) return;

                fieldsContainer.innerHTML = '<h4>Fields Configuration</h4>';
                const saved = JSON.parse(localStorage.getItem(`anki.settings.${deckName}`) || "{}");
                
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
        }
    });
}

function renderContextMenuEditor() {
    const listContainer = document.getElementById('context-menu-categories-list');
    const previewContainer = document.getElementById('context-menu-preview');
    const typeSelector = document.getElementById('context-menu-type-selector');
    if (!listContainer || !previewContainer) return;

    listContainer.innerHTML = '';
    previewContainer.innerHTML = '';

    const currentType = typeSelector ? typeSelector.value : 'global';
    const sections = contextMenuConfig[currentType];

    sections.forEach((section, sIdx) => {
        const secEl = document.createElement('div');
        secEl.className = 'context-category-editor-item';
        secEl.draggable = true;
        secEl.dataset.index = sIdx;

        secEl.innerHTML = `
            <div class="category-editor-header">
                <input type="text" value="${section.title}" data-index="${sIdx}">
                <div class="category-actions">
                    <button class="remove-btn" data-index="${sIdx}">&times;</button>
                </div>
            </div>
            <div class="category-items-list" data-section-index="${sIdx}"></div>
        `;

        const titleInput = secEl.querySelector('input');
        titleInput.onchange = (e) => {
            section.title = e.target.value;
            saveContextMenuConfig();
            renderContextMenuEditor();
        };

        const removeBtn = secEl.querySelector('.remove-btn');
        removeBtn.onclick = () => {
            sections.splice(sIdx, 1);
            saveContextMenuConfig();
            renderContextMenuEditor();
        };

        const itemsList = secEl.querySelector('.category-items-list');
        section.items.forEach((item, iIdx) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'context-item-editor-item';
            itemEl.draggable = true;
            itemEl.dataset.sectionIndex = sIdx;
            itemEl.dataset.itemIndex = iIdx;

            itemEl.innerHTML = `
                <div class="item-editor-info">
                    <span class="item-drag-handle">::</span>
                    <span>${item.label}</span>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" ${item.enabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            `;

            const toggle = itemEl.querySelector('input');
            toggle.onchange = (e) => {
                item.enabled = e.target.checked;
                saveContextMenuConfig();
                renderContextMenuEditor();
            };

            // Drag events for items
            itemEl.ondragstart = (e) => {
                e.stopPropagation();
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'item', sIdx, iIdx }));
            };

            itemEl.ondragover = (e) => {
                e.preventDefault();
                e.stopPropagation();
            };

            itemEl.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.type === 'item') {
                    const sourceItem = contextMenuConfig[currentType][data.sIdx].items.splice(data.iIdx, 1)[0];
                    contextMenuConfig[currentType][sIdx].items.splice(iIdx, 0, sourceItem);
                    saveContextMenuConfig();
                    renderContextMenuEditor();
                }
            };

            itemsList.appendChild(itemEl);
        });

        // Drag events for sections
        secEl.ondragstart = (e) => {
            if (e.target === secEl) {
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'section', sIdx }));
            }
        };

        secEl.ondragover = (e) => {
            e.preventDefault();
        };

        secEl.ondrop = (e) => {
            e.preventDefault();
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'section') {
                const sourceSec = contextMenuConfig[currentType].splice(data.sIdx, 1)[0];
                contextMenuConfig[currentType].splice(sIdx, 0, sourceSec);
                saveContextMenuConfig();
                renderContextMenuEditor();
            } else if (data.type === 'item') {
                // Drop item into section (at the end)
                const sourceItem = contextMenuConfig[currentType][data.sIdx].items.splice(data.iIdx, 1)[0];
                contextMenuConfig[currentType][sIdx].items.push(sourceItem);
                saveContextMenuConfig();
                renderContextMenuEditor();
            }
        };

        listContainer.appendChild(secEl);

        // Render Preview
        const previewSec = document.createElement('div');
        previewSec.className = 'context-menu-section';
        previewSec.style.width = '150px';
        previewSec.innerHTML = `<div class="context-menu-title">${section.title}</div>`;
        const previewUl = document.createElement('ul');
        section.items.forEach(item => {
            if (item.enabled) {
                const li = document.createElement('li');
                li.textContent = item.label;
                li.className = 'context-menu-action-item';
                previewUl.appendChild(li);
            }
        });
        previewSec.appendChild(previewUl);
        previewContainer.appendChild(previewSec);
    });
}


function renderSearchEngineEditor() {
    const listContainer = document.getElementById('search-engines-list');
    const previewEngineName = document.getElementById('preview-engine-name');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    // Update Preview
    const selectedValue = localStorage.getItem('searchEngine.selected') || 'ecosia';
    let selectedEngine = null;
    for (const cat in searchEngines) {
        selectedEngine = searchEngines[cat].find(e => e.value === selectedValue);
        if (selectedEngine) break;
    }
    if (previewEngineName && selectedEngine) {
        previewEngineName.textContent = selectedEngine.label;
    }

    Object.entries(searchEngines).forEach(([category, engines], catIdx) => {
        const catEl = document.createElement('div');
        catEl.className = 'search-category-editor-item';
        catEl.draggable = true;
        catEl.dataset.category = category;

        catEl.innerHTML = `
            <div class="category-editor-header">
                <input type="text" value="${category}" data-old-name="${category}">
                <div class="category-actions">
                    <button class="add-engine-btn settings-btn small-btn" style="padding: 2px 8px; font-size: 0.8em; margin-right: 5px;">+ Engine</button>
                    <button class="remove-btn" data-category="${category}">&times;</button>
                </div>
            </div>
            <div class="category-engines-list" data-category="${category}"></div>
        `;

        const titleInput = catEl.querySelector('input');
        titleInput.onchange = (e) => {
            const oldName = e.target.dataset.oldName;
            const newName = e.target.value;
            if (newName && newName !== oldName && !searchEngines[newName]) {
                searchEngines[newName] = searchEngines[oldName];
                delete searchEngines[oldName];
                saveSearchEngines();
                renderSearchEngineEditor();
            } else {
                e.target.value = oldName;
            }
        };

        const removeCatBtn = catEl.querySelector('.remove-btn');
        removeCatBtn.onclick = () => {
            delete searchEngines[category];
            saveSearchEngines();
            renderSearchEngineEditor();
        };

        const addEngineBtn = catEl.querySelector('.add-engine-btn');
        addEngineBtn.onclick = () => {
            showEngineModal(category);
        };

        const enginesList = catEl.querySelector('.category-engines-list');
        engines.forEach((engine, eIdx) => {
            const engineEl = document.createElement('div');
            engineEl.className = 'search-engine-editor-item';
            engineEl.draggable = true;
            engineEl.dataset.category = category;
            engineEl.dataset.index = eIdx;

            engineEl.innerHTML = `
                <div class="engine-editor-info">
                    <span class="engine-drag-handle">::</span>
                    <img src="img/icons/${engine.icon}" style="width: 16px; height: 16px; filter: brightness(0) invert(1);">
                    <span>${engine.label}</span>
                </div>
                <div class="engine-editor-actions">
                    <button class="edit-btn" data-category="${category}" data-index="${eIdx}">✎</button>
                    <button class="remove-btn" data-category="${category}" data-index="${eIdx}">&times;</button>
                </div>
            `;

            const editBtn = engineEl.querySelector('.edit-btn');
            editBtn.onclick = () => {
                showEngineModal(category, eIdx);
            };

            const removeBtn = engineEl.querySelector('.remove-btn');
            removeBtn.onclick = () => {
                searchEngines[category].splice(eIdx, 1);
                saveSearchEngines();
                renderSearchEngineEditor();
            };

            // Drag & Drop for Engines
            engineEl.ondragstart = (e) => {
                e.stopPropagation();
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'engine', category, index: eIdx }));
            };

            engineEl.ondragover = (e) => {
                e.preventDefault();
                e.stopPropagation();
            };

            engineEl.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.type === 'engine') {
                    const sourceEngine = searchEngines[data.category].splice(data.index, 1)[0];
                    searchEngines[category].splice(eIdx, 0, sourceEngine);
                    saveSearchEngines();
                    renderSearchEngineEditor();
                }
            };

            enginesList.appendChild(engineEl);
        });

        // Drag & Drop for Categories
        catEl.ondragstart = (e) => {
            if (e.target === catEl) {
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'search-category', category }));
            }
        };

        catEl.ondragover = (e) => {
            e.preventDefault();
        };

        catEl.ondrop = (e) => {
            e.preventDefault();
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'search-category') {
                const entries = Object.entries(searchEngines);
                const sourceIdx = entries.findIndex(([cat]) => cat === data.category);
                const targetIdx = entries.findIndex(([cat]) => cat === category);
                const sourceEntry = entries.splice(sourceIdx, 1)[0];
                entries.splice(targetIdx, 0, sourceEntry);
                searchEngines = Object.fromEntries(entries);
                saveSearchEngines();
                renderSearchEngineEditor();
            } else if (data.type === 'engine') {
                const sourceEngine = searchEngines[data.category].splice(data.index, 1)[0];
                searchEngines[category].push(sourceEngine);
                saveSearchEngines();
                renderSearchEngineEditor();
            }
        };

        listContainer.appendChild(catEl);
    });
}

function showEngineModal(category, index = null) {
    const isEdit = index !== null;
    const engine = isEdit ? searchEngines[category][index] : { label: '', value: '', url: '', icon: '' };

    const modal = document.createElement('div');
    modal.className = 'engine-modal';
    modal.innerHTML = `
        <h4>${isEdit ? 'Edit' : 'Add'} Search Engine</h4>
        <div class="engine-modal-fields">
            <div class="engine-field">
                <label>Label</label>
                <input type="text" id="engine-label" value="${engine.label}" placeholder="e.g. Google">
            </div>
            <div class="engine-field">
                <label>Value (ID)</label>
                <input type="text" id="engine-value" value="${engine.value}" placeholder="e.g. google">
            </div>
            <div class="engine-field">
                <label>Search URL</label>
                <input type="text" id="engine-url" value="${engine.url}" placeholder="e.g. https://www.google.com/search?q=">
            </div>
            <div class="engine-field">
                <label>Icon File</label>
                <input type="text" id="engine-icon" value="${engine.icon}" placeholder="e.g. google.svg">
            </div>
        </div>
        <div class="engine-modal-actions">
            <button id="cancel-engine-btn" class="settings-btn" style="background-color: var(--highlight-high); color: var(--text);">Cancel</button>
            <button id="save-engine-btn" class="settings-btn">Save</button>
        </div>
    `;

    document.body.appendChild(modal);

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '999';
    document.body.appendChild(overlay);

    const closeModal = () => {
        document.body.removeChild(modal);
        if (overlay.parentNode) document.body.removeChild(overlay);
    };

    document.getElementById('cancel-engine-btn').onclick = closeModal;
    document.getElementById('save-engine-btn').onclick = () => {
        const label = document.getElementById('engine-label').value;
        const value = document.getElementById('engine-value').value;
        const url = document.getElementById('engine-url').value;
        const icon = document.getElementById('engine-icon').value;

        if (label && value) {
            const newEngine = { label, value, url, icon };
            if (isEdit) {
                searchEngines[category][index] = newEngine;
            } else {
                searchEngines[category].push(newEngine);
            }
            saveSearchEngines();
            renderSearchEngineEditor();
            closeModal();
        }
    };
}


function updateWireframe() {
    wireframeSlots.forEach(slot => {
        const slotId = slot.dataset.slot;
        const activeModule = moduleManager.getActiveModuleInSlot(slotId);
        if (activeModule) {
            slot.classList.add('active-module');
            slot.textContent = activeModule.charAt(0).toUpperCase() + activeModule.slice(1);
        } else {
            slot.classList.remove('active-module');
            slot.textContent = slot.getAttribute('title');
        }
    });
}

function showModuleSelector(slotId) {
    selectedSlotName.textContent = `Configure Slot: ${slotId}`;
    moduleSelectorPanel.classList.remove('hidden');
    availableModulesList.innerHTML = '';

    const available = moduleManager.getModulesForSlot(slotId);
    const activeInSlot = moduleManager.getActiveModuleInSlot(slotId);

    // Add "None" option
    const noneItem = document.createElement('li');
    noneItem.className = `module-item ${!activeInSlot ? 'active' : ''}`;
    noneItem.innerHTML = `
        <div class="module-info">
            <h5>Empty</h5>
            <p>No module assigned to this slot.</p>
        </div>
    `;
    noneItem.onclick = async () => {
        if (activeInSlot) {
            await moduleManager.unloadModule(activeInSlot);
            updateWireframe();
            checkTabsVisibility();
        }
        moduleSelectorPanel.classList.add('hidden');
    };
    availableModulesList.appendChild(noneItem);

    available.forEach(mod => {
        const isCurrent = activeInSlot === mod.name;
        const li = document.createElement('li');
        li.className = `module-item ${isCurrent ? 'active' : ''}`;
        li.innerHTML = `
            <div class="module-info">
                <h5>${mod.name.charAt(0).toUpperCase() + mod.name.slice(1)}</h5>
                <p>${mod.description}</p>
            </div>
            ${isCurrent ? '<span class="status-badge">Active</span>' : ''}
        `;
        li.onclick = async () => {
            if (activeInSlot && activeInSlot !== mod.name) {
                await moduleManager.unloadModule(activeInSlot);
            }
            if (!isCurrent) {
                await moduleManager.loadModule(mod.name, mod.path, `#${slotId}`);
                updateWireframe();
                checkTabsVisibility();
            }
            moduleSelectorPanel.classList.add('hidden');
        };
        availableModulesList.appendChild(li);
    });
}

export function init(manager) {
    moduleManager = manager;
}
