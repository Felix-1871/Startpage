import { linkData, renderCategories, renderLinks, syncLinksFromJson, syncLinksOverwrite, getSyncChanges, applyChange } from '../components/tabs/tabs.js';
import { showAlert } from '../components/modals/modals.js';

let modalContainer = null;
let contextMenu = null;
let syncIntervalId = null;

function saveLinkData() {
    localStorage.setItem('linkData', JSON.stringify(linkData));
}

export function saveAndRefresh() {
    saveLinkData();
    const activeCategoryItem = document.querySelector('.category-item.active');
    const activeIndex = activeCategoryItem ? parseInt(activeCategoryItem.dataset.index) : 0;
    renderCategories(activeIndex);
    renderLinks(activeIndex < linkData.length ? activeIndex : 0);
}

export async function showSyncModalQueue(changes) {
    if (!modalContainer) {
        modalContainer = document.getElementById('modal-container');
    }
    if (!contextMenu) {
        contextMenu = document.getElementById('context-menu');
    }

    if (changes.length === 0) {
        await showAlert('No changes detected.');
        return;
    }

    let index = 0;

    async function showNext() {
        if (index >= changes.length) {
            saveAndRefresh();
            if (modalContainer) modalContainer.style.display = 'none';
            if (contextMenu) contextMenu.style.display = 'none';
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
        acceptBtn.onclick = async () => {
            await applyChange(change, 'accept');
            index++;
            await showNext();
        };
        buttons.appendChild(acceptBtn);

        if (change.type === 'updated' || change.type === 'new') {
            const keepBothBtn = document.createElement('button');
            keepBothBtn.textContent = 'Keep Both';
            keepBothBtn.className = 'save-button';
            keepBothBtn.style.backgroundColor = '#c4a7e7';
            keepBothBtn.onclick = async () => {
                await applyChange(change, 'keep-both');
                index++;
                await showNext();
            };
            buttons.appendChild(keepBothBtn);
        }

        const rejectBtn = document.createElement('button');
        rejectBtn.textContent = 'Reject';
        rejectBtn.className = 'cancel-button';
        rejectBtn.onclick = async () => {
            await applyChange(change, 'reject');
            index++;
            await showNext();
        };
        buttons.appendChild(rejectBtn);

        modalContent.appendChild(buttons);
        modalContainer.appendChild(modalContent);
    }

    await showNext();
}

export async function performAutoSync() {
    const success = await syncLinksFromJson();
    if (success) {
        saveAndRefresh();
    }
}

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

export function stopSyncTimer() {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
    }
}

export async function runInteractiveSync() {
    const changes = await getSyncChanges();
    await showSyncModalQueue(changes);
}

export async function runFullSync() {
    const success = await syncLinksOverwrite();
    if (success) {
        saveAndRefresh();
    }
    return success;
}

export function initSyncService(options = {}) {
    if (options.modalContainer) modalContainer = options.modalContainer;
    if (options.contextMenu) contextMenu = options.contextMenu;
}
