import { escapeHtml } from '../../src/dom-utils.js';

export function renderContextMenuEditor(contextMenuConfig, saveContextMenuConfig) {
    const listContainer = document.getElementById('context-menu-categories-list');
    const typeSelector = document.getElementById('context-menu-type-selector');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    const currentType = typeSelector ? typeSelector.value : 'global';
    const sections = contextMenuConfig[currentType];

    sections.forEach((section, sIdx) => {
        const secEl = document.createElement('div');
        secEl.className = 'context-category-editor-item';
        secEl.draggable = true;
        secEl.dataset.index = sIdx;

        secEl.innerHTML = `
            <div class="category-editor-header">
                <input type="text" value="${escapeHtml(section.title)}" data-index="${sIdx}">
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
            renderContextMenuEditor(contextMenuConfig, saveContextMenuConfig);
        };

        const removeBtn = secEl.querySelector('.remove-btn');
        removeBtn.onclick = () => {
            sections.splice(sIdx, 1);
            saveContextMenuConfig();
            renderContextMenuEditor(contextMenuConfig, saveContextMenuConfig);
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
                    <span>${escapeHtml(item.label)}</span>
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
                renderContextMenuEditor(contextMenuConfig, saveContextMenuConfig);
            };

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
                    renderContextMenuEditor(contextMenuConfig, saveContextMenuConfig);
                }
            };

            itemsList.appendChild(itemEl);
        });

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
                renderContextMenuEditor(contextMenuConfig, saveContextMenuConfig);
            } else if (data.type === 'item') {
                const sourceItem = contextMenuConfig[currentType][data.sIdx].items.splice(data.iIdx, 1)[0];
                contextMenuConfig[currentType][sIdx].items.push(sourceItem);
                saveContextMenuConfig();
                renderContextMenuEditor(contextMenuConfig, saveContextMenuConfig);
            }
        };

        listContainer.appendChild(secEl);
    });
}

export function bindContextMenuEditor(contextMenuConfig, saveContextMenuConfig, renderFn) {
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
            renderFn();
        });
    }

    if (typeSelector) {
        typeSelector.addEventListener('change', () => renderFn());
    }
}
