import { updateSyncTimer, runInteractiveSync, runFullSync } from '../../src/sync-service.js';
import { showConfirm } from '../modals/modals.js';

export function renderTabsSyncSettings() {
    const syncToggle = document.getElementById('sync-enabled-toggle');
    const intervalSelector = document.getElementById('sync-interval-selector');
    const manualBtn = document.getElementById('manual-sync-btn');
    const hardBtn = document.getElementById('hard-sync-btn');

    if (!syncToggle) return;

    syncToggle.checked = localStorage.getItem('sync.autoEnabled') !== 'false';
    intervalSelector.value = localStorage.getItem('sync.interval') || '3600000';

    syncToggle.onchange = () => {
        localStorage.setItem('sync.autoEnabled', syncToggle.checked);
        updateSyncTimer();
    };

    intervalSelector.onchange = () => {
        localStorage.setItem('sync.interval', intervalSelector.value);
        updateSyncTimer();
    };

    manualBtn.onclick = () => runInteractiveSync();

    hardBtn.onclick = async () => {
        const confirmed = await showConfirm('Overwrite ALL links with JSON data?');
        if (confirmed) {
            await runFullSync();
        }
    };
}
