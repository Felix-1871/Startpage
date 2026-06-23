import { defaultSearchEngines, defaultContextMenuConfig } from '../../src/config/defaults.js';
import { parseStorage } from '../../src/helpers.js';
import { applyTheme, renderThemingSettings } from './settings-theme.js';
import { renderTabsSyncSettings } from './settings-sync.js';
import { renderAnkiSettings } from './settings-anki.js';
import { renderWireframe, renderClockWeatherSettings } from './settings-wireframe.js';
import { renderContextMenuEditor, bindContextMenuEditor } from './settings-context-menu.js';
import { createSearchEngineEditor, bindSearchEngineEditor } from './settings-engines.js';

export { applyTheme };

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

function isSearchEnginesShape(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        && Object.values(value).every((engines) => Array.isArray(engines));
}

function isContextMenuConfigShape(value) {
    return value && typeof value === 'object'
        && ['global', 'category', 'link', 'bookmark'].every((key) => Array.isArray(value[key]));
}

function loadSearchEngines() {
    const stored = parseStorage('searchEngines', null);
    searchEngines = isSearchEnginesShape(stored)
        ? stored
        : JSON.parse(JSON.stringify(defaultSearchEngines));
}

function saveSearchEngines() {
    localStorage.setItem('searchEngines', JSON.stringify(searchEngines));
}

function loadContextMenuConfig() {
    const stored = parseStorage('contextMenuConfig', null);
    contextMenuConfig = isContextMenuConfigShape(stored)
        ? stored
        : JSON.parse(JSON.stringify(defaultContextMenuConfig));
}

function saveContextMenuConfig() {
    localStorage.setItem('contextMenuConfig', JSON.stringify(contextMenuConfig));
}

function checkTabsVisibility() {
    const modules = ['tabs', 'anki', 'anki-xiehanzi', 'lute', 'searchbar', 'clock-weather'];
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

    const { renderSearchEngineEditor } = createSearchEngineEditor(searchEngines, saveSearchEngines);
    const renderContextMenu = () => renderContextMenuEditor(contextMenuConfig, saveContextMenuConfig);

    bindContextMenuEditor(contextMenuConfig, saveContextMenuConfig, renderContextMenu);
    bindSearchEngineEditor(searchEngines, saveSearchEngines, renderSearchEngineEditor);

    renderWireframe(moduleManager, {
        wireframeSlots,
        moduleSelectorPanel,
        availableModulesList,
        selectedSlotName,
        closeModuleSelector,
        checkTabsVisibility,
    });

    renderSearchEngineEditor();
    renderContextMenu();

    const modalContainer = document.getElementById('modal-container');
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            modalContainer.style.display = 'none';
        }
    });
}

export async function openSettings() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    try {
        const response = await fetch('components/settings/settings.html');
        if (!response.ok) throw new Error('Failed to load settings.html');
        const html = await response.text();

        modalContainer.innerHTML = html;
        modalContainer.style.display = 'flex';

        loadContextMenuConfig();
        loadSearchEngines();
        initElements();
        checkTabsVisibility();
        renderAnkiSettings(moduleManager);
        renderClockWeatherSettings(moduleManager);
        renderThemingSettings();
        renderTabsSyncSettings();
    } catch (error) {
        console.error('Failed to open settings:', error);
    }
}

export function init(manager) {
    moduleManager = manager;
}
