import { escapeHtml } from '../../src/dom-utils.js';

function parseDragPayload(event) {
    try {
        return JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch {
        return null;
    }
}

function showEngineModal(searchEngines, saveSearchEngines, renderSearchEngineEditor, category, index = null) {
    const isEdit = index !== null;
    const engine = isEdit ? searchEngines[category][index] : { label: '', value: '', url: '', icon: '' };

    const modal = document.createElement('div');
    modal.className = 'engine-modal';
    modal.innerHTML = `
        <h4>${isEdit ? 'Edit' : 'Add'} Search Engine</h4>
        <div class="engine-modal-fields">
            <div class="engine-field">
                <label>Label</label>
                <input type="text" id="engine-label" value="${escapeHtml(engine.label)}" placeholder="e.g. Google">
            </div>
            <div class="engine-field">
                <label>Value (ID)</label>
                <input type="text" id="engine-value" value="${escapeHtml(engine.value)}" placeholder="e.g. google">
            </div>
            <div class="engine-field">
                <label>Search URL</label>
                <input type="text" id="engine-url" value="${escapeHtml(engine.url)}" placeholder="e.g. https://www.google.com/search?q=">
            </div>
            <div class="engine-field">
                <label>Icon File</label>
                <input type="text" id="engine-icon" value="${escapeHtml(engine.icon)}" placeholder="e.g. google.svg">
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

function showWebhookModal(searchEngines, saveSearchEngines, renderSearchEngineEditor, category, index = null) {
    const isEdit = index !== null;
    const engine = isEdit ? searchEngines[category][index] : { label: '', value: '', url: '', icon: 'webhook.svg', isWebhook: true };

    const modal = document.createElement('div');
    modal.className = 'engine-modal';
    modal.innerHTML = `
        <h4>${isEdit ? 'Edit' : 'Add'} Webhook</h4>
        <div class="engine-modal-fields">
            <div class="engine-field">
                <label>Label</label>
                <input type="text" id="webhook-label" value="${escapeHtml(engine.label)}" placeholder="e.g. Discord">
            </div>
            <div class="engine-field">
                <label>Value (ID)</label>
                <input type="text" id="webhook-value" value="${escapeHtml(engine.value)}" placeholder="e.g. discord_webhook">
            </div>
            <div class="engine-field">
                <label>Webhook URL</label>
                <input type="text" id="webhook-url" value="${escapeHtml(engine.url)}" placeholder="https://discord.com/api/webhooks/...">
            </div>
            <div class="engine-field">
                <label>Icon File</label>
                <input type="text" id="webhook-icon" value="${escapeHtml(engine.icon)}" placeholder="e.g. discord.svg">
            </div>
        </div>
        <div class="engine-modal-actions">
            <button id="cancel-webhook-btn" class="settings-btn" style="background-color: var(--highlight-high); color: var(--text);">Cancel</button>
            <button id="save-webhook-btn" class="settings-btn">Save</button>
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

    document.getElementById('cancel-webhook-btn').onclick = closeModal;
    document.getElementById('save-webhook-btn').onclick = () => {
        const label = document.getElementById('webhook-label').value;
        const value = document.getElementById('webhook-value').value;
        const url = document.getElementById('webhook-url').value;
        const icon = document.getElementById('webhook-icon').value;

        if (label && value) {
            const newWebhook = { label, value, url, icon, isWebhook: true };
            if (isEdit) {
                searchEngines[category][index] = newWebhook;
            } else {
                searchEngines[category].push(newWebhook);
            }
            saveSearchEngines();
            renderSearchEngineEditor();
            closeModal();
        }
    };
}

export function createSearchEngineEditor(searchEngines, saveSearchEngines) {
    function renderSearchEngineEditor() {
        const listContainer = document.getElementById('search-engines-list');
        const previewEngineName = document.getElementById('preview-engine-name');
        const defaultSelector = document.getElementById('default-search-engine-selector');

        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (defaultSelector) {
            const savedDefault = localStorage.getItem('searchEngine.default') || 'ecosia';
            defaultSelector.innerHTML = '';
            Object.entries(searchEngines).forEach(([category, engines]) => {
                const group = document.createElement('optgroup');
                group.label = category;
                engines.forEach(engine => {
                    const opt = document.createElement('option');
                    opt.value = engine.value;
                    opt.textContent = engine.label;
                    opt.selected = engine.value === savedDefault;
                    group.appendChild(opt);
                });
                defaultSelector.appendChild(group);
            });

            defaultSelector.onchange = (e) => {
                localStorage.setItem('searchEngine.default', e.target.value);
            };
        }

        const selectedValue = localStorage.getItem('searchEngine.selected') || 'ecosia';
        let selectedEngine = null;
        for (const cat in searchEngines) {
            selectedEngine = searchEngines[cat].find(e => e.value === selectedValue);
            if (selectedEngine) break;
        }
        if (previewEngineName && selectedEngine) {
            previewEngineName.textContent = selectedEngine.label;
        }

        Object.entries(searchEngines).forEach(([category, engines]) => {
            const catEl = document.createElement('div');
            catEl.className = 'search-category-editor-item';
            catEl.draggable = true;
            catEl.dataset.category = category;

            catEl.innerHTML = `
                <div class="category-editor-header">
                    <input type="text" value="${escapeHtml(category)}" data-old-name="${escapeHtml(category)}">
                    <div class="category-actions">
                        <button class="add-engine-btn settings-btn small-btn" style="padding: 2px 8px; font-size: 0.8em; margin-right: 5px;">+ Engine</button>
                        <button class="add-webhook-btn settings-btn small-btn" style="padding: 2px 8px; font-size: 0.8em; margin-right: 5px; background-color: var(--iris);">+ Webhook</button>
                        <button class="remove-btn" data-category="${escapeHtml(category)}">&times;</button>
                    </div>
                </div>
                <div class="category-engines-list" data-category="${escapeHtml(category)}"></div>
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

            catEl.querySelector('.add-engine-btn').onclick = () => {
                showEngineModal(searchEngines, saveSearchEngines, renderSearchEngineEditor, category);
            };

            catEl.querySelector('.add-webhook-btn').onclick = () => {
                showWebhookModal(searchEngines, saveSearchEngines, renderSearchEngineEditor, category);
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
                        <img src="img/icons/${escapeHtml(engine.icon)}" style="width: 16px; height: 16px; filter: brightness(0) invert(1);">
                        <span>${escapeHtml(engine.label)}</span>
                        ${engine.isWebhook ? '<span class="status-badge" style="margin-left: 5px; font-size: 0.6em; padding: 1px 4px;">Webhook</span>' : ''}
                    </div>
                    <div class="engine-editor-actions">
                        <button class="edit-btn" data-category="${escapeHtml(category)}" data-index="${eIdx}">✎</button>
                        <button class="remove-btn" data-category="${escapeHtml(category)}" data-index="${eIdx}">&times;</button>
                    </div>
                `;

                engineEl.querySelector('.edit-btn').onclick = () => {
                    if (engine.isWebhook) {
                        showWebhookModal(searchEngines, saveSearchEngines, renderSearchEngineEditor, category, eIdx);
                    } else {
                        showEngineModal(searchEngines, saveSearchEngines, renderSearchEngineEditor, category, eIdx);
                    }
                };

                engineEl.querySelector('.remove-btn').onclick = () => {
                    searchEngines[category].splice(eIdx, 1);
                    saveSearchEngines();
                    renderSearchEngineEditor();
                };

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
                    const data = parseDragPayload(e);
                    if (!data || data.type !== 'engine') return;
                    const sourceEngine = searchEngines[data.category].splice(data.index, 1)[0];
                    searchEngines[category].splice(eIdx, 0, sourceEngine);
                    saveSearchEngines();
                    renderSearchEngineEditor();
                };

                enginesList.appendChild(engineEl);
            });

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
                const data = parseDragPayload(e);
                if (!data) return;
                if (data.type === 'search-category') {
                    const entries = Object.entries(searchEngines);
                    const sourceIdx = entries.findIndex(([cat]) => cat === data.category);
                    const targetIdx = entries.findIndex(([cat]) => cat === category);
                    const sourceEntry = entries.splice(sourceIdx, 1)[0];
                    entries.splice(targetIdx, 0, sourceEntry);
                    const reordered = Object.fromEntries(entries);
                    for (const key of Object.keys(searchEngines)) delete searchEngines[key];
                    Object.assign(searchEngines, reordered);
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

    return { renderSearchEngineEditor };
}

export function bindSearchEngineEditor(searchEngines, saveSearchEngines, renderSearchEngineEditor) {
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
}
