let moduleManager;
let settingsModal;
let categories;
let sections;
let wireframeSlots;
let moduleSelectorPanel;
let availableModulesList;
let selectedSlotName;
let closeModuleSelector;

export async function openSettings() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    try {
        const response = await fetch('components/settings/settings.html');
        const html = await response.text();
        
        modalContainer.innerHTML = html;
        modalContainer.style.display = 'flex';
        
        initElements();
        updateWireframe();
        checkTabsVisibility();
    } catch (error) {
        console.error('Failed to open settings:', error);
    }
}

function checkTabsVisibility() {
    const tabsActive = moduleManager.activeModules.has('tabs');
    const tabsCategory = document.getElementById('settings-category-tabs');
    if (tabsCategory) {
        tabsCategory.style.display = tabsActive ? 'block' : 'none';
    }
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

    // Close on click outside modal
    const modalContainer = document.getElementById('modal-container');
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            modalContainer.style.display = 'none';
        }
    });
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
