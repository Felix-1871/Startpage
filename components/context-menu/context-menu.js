import { linkData, renderCategories, renderLinks, syncLinksFromJson, syncLinksOverwrite, getSyncChanges, applyChange } from '../tabs/tabs.js';
import { findBestIcon } from '../../src/icon-manager.js';
import { openLinkModal } from '../../src/link-manager.js';
import { bookmarks, renderBookmarks, saveBookmarks } from '../bookmarks/bookmarks.js';
import { openModal, showAlert, showConfirm, showPrompt } from '../modals/modals.js';
import { updateAnkiStats } from '../anki/anki.js';
import { renderLute } from '../lute/lute.js';

let contextMenu;
let modalContainer;

function saveLinkData() {
    localStorage.setItem('linkData', JSON.stringify(linkData));
}

function loadLinkData() {
    const storedLinkData = localStorage.getItem('linkData');
    if (storedLinkData) {
        linkData.length = 0;
        JSON.parse(storedLinkData).forEach(item => linkData.push(item));
    }
}

async function performAutoSync() {
    const success = await syncLinksFromJson();
    if (success) {
        saveAndRefresh();
    }
}

function saveAndRefresh() {
    saveLinkData();
    const activeCategoryItem = document.querySelector(".category-item.active");
    const activeIndex = activeCategoryItem ? parseInt(activeCategoryItem.dataset.index) : 0;
    renderCategories(activeIndex);
    renderLinks(activeIndex < linkData.length ? activeIndex : 0);
}

async function showSyncModalQueue(changes) {
    if (changes.length === 0) {
        await showAlert('No changes detected.');
        return;
    }

    let index = 0;

    async function showNext() {
        if (index >= changes.length) {
            saveAndRefresh();
            modalContainer.style.display = 'none'; 
            contextMenu.style.display = 'none'; 
            await showAlert('Sync complete!');
            return;
        }

        const change = changes[index];
        modalContainer.innerHTML = '';
        modalContainer.style.display = 'flex';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        const h3 = document.createElement('h3');
        h3.textContent = `Sync Change (${index + 1}/${changes.length})`;
        modalContent.appendChild(h3);

        const p = document.createElement('p');
        p.textContent = change.description;
        p.style.marginBottom = '20px';
        modalContent.appendChild(p);

        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';

        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Accept';
        acceptBtn.className = 'save-button';
        acceptBtn.onclick = () => { applyChange(change, 'accept'); index++; showNext(); };
        buttons.appendChild(acceptBtn);

        if (change.type === 'updated' || change.type === 'new') {
            const keepBothBtn = document.createElement('button');
            keepBothBtn.textContent = 'Keep Both';
            keepBothBtn.className = 'save-button';
            keepBothBtn.style.backgroundColor = '#c4a7e7';
            keepBothBtn.onclick = () => { applyChange(change, 'keep-both'); index++; showNext(); };
            buttons.appendChild(keepBothBtn);
        }

        const rejectBtn = document.createElement('button');
        rejectBtn.textContent = 'Reject';
        rejectBtn.className = 'cancel-button';
        rejectBtn.onclick = () => { applyChange(change, 'reject'); index++; showNext(); };
        buttons.appendChild(rejectBtn);

        modalContent.appendChild(buttons);
        modalContainer.appendChild(modalContent);
    }

    await showNext();
}

const ACTION_MAP = {
    'edit-category': (index) => {
        const categoryItem = linkData[index];
        openModal('Edit Category', [
            { name: 'category', label: 'Category Name', type: 'text' },
            { name: 'icon', label: 'Icon', type: 'select-icon' },
        ], { category: categoryItem.category, icon: categoryItem.icon }, (data) => {
            linkData[index].category = data.category;
            linkData[index].icon = data.icon || './img/icons/default-category.svg';
            saveAndRefresh();
            contextMenu.style.display = 'none';
        });
    },
    'remove-category': async (index) => {
        if (await showConfirm(`Remove category "${linkData[index].category}"?`)) {
            linkData.splice(index, 1);
            saveAndRefresh();
            contextMenu.style.display = 'none';
        }
    },
    'edit-link': (index, subIndex) => {
        const linkItem = linkData[index].links[subIndex];
        openLinkModal('Edit Link', { ...linkItem, type: 'tab' }, (data) => {
            linkData[index].links[subIndex] = { ...linkData[index].links[subIndex], ...data };
            saveAndRefresh();
            contextMenu.style.display = 'none';
        });
    },
    'remove-link': async (index, subIndex) => {
        if (await showConfirm(`Remove link "${linkData[index].links[subIndex].name}"?`)) {
            linkData[index].links.splice(subIndex, 1);
            saveAndRefresh();
            contextMenu.style.display = 'none';
        }
    },
    'edit-bookmark': (index) => {
        const b = bookmarks[index];
        openLinkModal('Edit Bookmark', { ...b, type: 'bookmark' }, (data) => {
            bookmarks[index] = { ...bookmarks[index], ...data };
            saveBookmarks();
            renderBookmarks();
            contextMenu.style.display = 'none';
        });
    },
    'remove-bookmark': async (index) => {
        if (await showConfirm(`Remove bookmark "${bookmarks[index].name}"?`)) {
            bookmarks.splice(index, 1);
            saveBookmarks();
            renderBookmarks();
            contextMenu.style.display = 'none';
        }
    },
    'settings': () => {
        import('../settings/settings.js').then(m => m.openSettings());
        contextMenu.style.display = 'none';
    },
    'update-anki': () => { updateAnkiStats(); contextMenu.style.display = 'none'; },
    'update-lute': () => { renderLute(); contextMenu.style.display = 'none'; },
    'sync': async () => { const changes = await getSyncChanges(); showSyncModalQueue(changes); contextMenu.style.display = 'none'; },
    'add-category': () => openModal('Add Category', [{ name: 'category', label: 'Name', type: 'text' }, { name: 'icon', label: 'Icon', type: 'select-icon' }], {}, (data) => { linkData.push({ category: data.category, icon: data.icon || './img/icons/default-category.svg', links: [] }); saveAndRefresh(); contextMenu.style.display = 'none'; }),
    'add-link': () => {
        const activeIdx = document.querySelector('.category-item.active')?.dataset.index || 0;
        openLinkModal('Add Link', { type: 'tab' }, (data) => { 
            linkData[activeIdx].links.push(data); 
            saveAndRefresh(); 
            contextMenu.style.display = 'none';
        });
    },
    'add-bookmark': () => {
        openLinkModal('Add Bookmark', { type: 'bookmark' }, (data) => {
            bookmarks.push(data);
            saveBookmarks();
            renderBookmarks();
            contextMenu.style.display = 'none';
        });
    }
};

function renderContextMenu(type = 'global', index = null, subIndex = null) {
    if (!contextMenu) return;
    contextMenu.innerHTML = '';
    
    const configStr = localStorage.getItem('contextMenuConfig');
    let config;
    if (configStr) {
        config = JSON.parse(configStr);
    } else {
        config = {
            'global': [
                { title: 'System Actions', items: [
                    { id: 'settings', label: 'Settings', enabled: true },
                    { id: 'update-anki', label: 'Update Anki', enabled: true },
                    { id: 'update-lute', label: 'Update Lute', enabled: true }
                ]},
                { title: 'Sync Actions', items: [
                    { id: 'sync', label: 'Sync', enabled: true }
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
    }

    const sections = config[type] || config['global'];

    sections.forEach(sec => {
        const enabledItems = sec.items.filter(item => item.enabled);
        if (enabledItems.length === 0) return;

        const div = document.createElement('div');
        div.className = 'context-menu-section';
        div.innerHTML = `<div class="context-menu-title">${sec.title}</div>`;
        const ul = document.createElement('ul');
        enabledItems.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.label;
            li.className = 'context-menu-action-item';
            li.onclick = (e) => { 
                e.stopPropagation(); 
                if (ACTION_MAP[item.id]) {
                    ACTION_MAP[item.id](index, subIndex);
                }
            };
            ul.appendChild(li);
        });
        div.appendChild(ul);
        contextMenu.appendChild(div);
    });
}


let syncIntervalId = null;

export function updateSyncTimer() {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
    }

    const autoEnabled = localStorage.getItem('sync.autoEnabled') !== 'false';
    const interval = parseInt(localStorage.getItem('sync.interval') || '3600000');

    if (autoEnabled) {
        syncIntervalId = setInterval(performAutoSync, interval);
    }
}

export function init() {
    contextMenu = document.getElementById('context-menu');
    modalContainer = document.getElementById('modal-container');

    loadLinkData();
    
    const autoEnabled = localStorage.getItem('sync.autoEnabled') !== 'false';
    if (autoEnabled) {
        performAutoSync(); 
    }
    
    renderCategories();
    renderLinks(0);

    updateSyncTimer();

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        const categoryItem = e.target.closest('.category-item');
        const glassLink = e.target.closest('.glass-link');
        const bookmarkItem = e.target.closest('.bookmark-item');

        if (categoryItem) {
            renderContextMenu('category', parseInt(categoryItem.dataset.index));
        } else if (glassLink) {
            const activeIdx = parseInt(document.querySelector('.category-item.active')?.dataset.index || 0);
            renderContextMenu('link', activeIdx, parseInt(glassLink.dataset.subindex));
        } else if (bookmarkItem) {
            renderContextMenu('bookmark', parseInt(bookmarkItem.dataset.index));
        } else {
            renderContextMenu();
        }
        
        contextMenu.style.display = 'flex';
        contextMenu.style.alignContent = 'flex-start';
        contextMenu.style.width = 'fit-content';
        contextMenu.style.height = 'auto';
        contextMenu.style.maxHeight = 'none';
        contextMenu.style.overflow = 'visible';
        
        const sections = contextMenu.querySelectorAll('.context-menu-section');
        sections.forEach(s => {
            s.style.width = '200px';
            s.style.marginRight = '10px';
        });

        let width = contextMenu.offsetWidth;
        let height = contextMenu.offsetHeight;
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        if (height > viewportHeight - 20) {
            contextMenu.style.height = (viewportHeight - 20) + 'px';
            width = contextMenu.offsetWidth;
            height = contextMenu.offsetHeight;
        }

        let top = e.clientY;
        let left = e.clientX;

        if (top + height > viewportHeight - 10) {
            top = viewportHeight - height - 10;
        }
        if (top < 10) top = 10;

        if (left + width > viewportWidth - 10) {
            left = viewportWidth - width - 10;
        }
        if (left < 10) left = 10;

        contextMenu.style.top = `${top}px`;
        contextMenu.style.left = `${left}px`;
    });

    document.addEventListener('click', (e) => {
        if (contextMenu && !contextMenu.contains(e.target)) {
            contextMenu.style.display = 'none';
        }
    });
}
