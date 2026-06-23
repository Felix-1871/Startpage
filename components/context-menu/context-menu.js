import { linkData, renderCategories, renderLinks } from '../tabs/tabs.js';
import { defaultContextMenuConfig } from '../../src/config/defaults.js';
import { parseStorage } from '../../src/helpers.js';
import { escapeHtml } from '../../src/dom-utils.js';
import { openLinkModal } from '../../src/link-manager.js';
import { bookmarks, renderBookmarks, saveBookmarks } from '../bookmarks/bookmarks.js';
import { openModal, showConfirm } from '../modals/modals.js';
import { updateAnkiStats } from '../anki/anki.js';
import { renderLute } from '../lute/lute.js';
import {
    saveAndRefresh,
    showSyncModalQueue,
    updateSyncTimer,
    initSyncService,
    runInteractiveSync,
    runFullSync,
} from '../../src/sync-service.js';

export { saveAndRefresh, showSyncModalQueue, updateSyncTimer, runInteractiveSync, runFullSync };

let contextMenu;

function loadLinkData() {
    const stored = parseStorage('linkData', null);
    if (stored) {
        linkData.length = 0;
        stored.forEach(item => linkData.push(item));
    }
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
    'sync': async () => { await runInteractiveSync(); contextMenu.style.display = 'none'; },
    'interactive-sync': async () => { await runInteractiveSync(); contextMenu.style.display = 'none'; },
    'full-sync': async () => { await runFullSync(); contextMenu.style.display = 'none'; },
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

    const config = parseStorage('contextMenuConfig', defaultContextMenuConfig);
    const sections = config[type] || config['global'];

    sections.forEach(sec => {
        const enabledItems = sec.items.filter(item => item.enabled);
        if (enabledItems.length === 0) return;

        const div = document.createElement('div');
        div.className = 'context-menu-section';
        div.innerHTML = `<div class="context-menu-title">${escapeHtml(sec.title)}</div>`;
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

async function performAutoSync() {
    const { syncLinksFromJson } = await import('../tabs/tabs.js');
    const success = await syncLinksFromJson();
    if (success) {
        saveAndRefresh();
    }
}

export function init() {
    contextMenu = document.getElementById('context-menu');
    const modalContainer = document.getElementById('modal-container');

    initSyncService({ contextMenu, modalContainer });
    loadLinkData();

    const autoEnabled = localStorage.getItem('sync.autoEnabled') !== 'false';
    if (autoEnabled) {
        performAutoSync();
    }

    renderCategories();
    renderLinks(0);
    updateSyncTimer();

    const onContextMenu = (e) => {
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
    };

    const onDocumentClick = (e) => {
        if (contextMenu && !contextMenu.contains(e.target)) {
            contextMenu.style.display = 'none';
        }
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('click', onDocumentClick);

    return () => {
        document.removeEventListener('contextmenu', onContextMenu);
        document.removeEventListener('click', onDocumentClick);
    };
}
