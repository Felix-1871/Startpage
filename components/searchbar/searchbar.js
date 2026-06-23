import { defaultSearchEngines } from '../../src/config/defaults.js';
import { parseStorage } from '../../src/helpers.js';
import { showAlert, showPrompt } from '../modals/modals.js';

export function init() {
    const searchEngines = parseStorage('searchEngines', JSON.parse(JSON.stringify(defaultSearchEngines)));

    function setupCustomDropdown(dropdownElementId, hiddenInputId, listElementId, categories) {
        const dropdownInput = document.getElementById(dropdownElementId);
        const hiddenInput = document.getElementById(hiddenInputId);
        const dropdownList = document.getElementById(listElementId);

        if (!dropdownInput || !hiddenInput || !dropdownList) {
            console.error('Dropdown elements not found for:', dropdownElementId);
            return;
        }

        const dropdownContainer = dropdownInput.parentElement;
        if (!dropdownContainer) {
            console.error('Dropdown container not found for:', dropdownElementId);
            return;
        }

        dropdownList.innerHTML = '';

        Object.entries(categories).forEach(([categoryName, engines]) => {
            const categoryHeader = document.createElement('div');
            categoryHeader.classList.add('dropdown-category-header');
            categoryHeader.textContent = categoryName;
            dropdownList.appendChild(categoryHeader);

            const gridContainer = document.createElement('div');
            gridContainer.classList.add('dropdown-grid-container');

            engines.forEach(engine => {
                const listItem = document.createElement('div');
                listItem.classList.add('custom-dropdown-list-item');

                const icon = document.createElement('img');
                icon.src = `img/icons/${engine.icon}`;
                icon.classList.add('engine-icon');
                listItem.appendChild(icon);

                const label = document.createElement('span');
                label.textContent = engine.label;
                listItem.appendChild(label);

                listItem.dataset.value = engine.value;
                listItem.addEventListener('click', () => {
                    dropdownInput.value = engine.label;
                    hiddenInput.value = engine.value;
                    dropdownContainer.classList.remove('active');
                    dropdownList.style.top = '100%';
                    dropdownList.style.bottom = 'auto';
                    localStorage.setItem('searchEngine.selected', engine.value);
                });
                gridContainer.appendChild(listItem);
            });
            dropdownList.appendChild(gridContainer);
        });

        dropdownInput.addEventListener('click', () => {
            dropdownContainer.classList.toggle('active');
            if (dropdownContainer.classList.contains('active')) {
                const spaceBelow = window.innerHeight - dropdownContainer.getBoundingClientRect().bottom;
                const spaceAbove = dropdownContainer.getBoundingClientRect().top;
                const listHeight = dropdownList.scrollHeight;

                if (spaceBelow < listHeight && spaceAbove > listHeight) {
                    dropdownList.style.top = 'auto';
                    dropdownList.style.bottom = '100%';
                } else {
                    dropdownList.style.top = '100%';
                    dropdownList.style.bottom = 'auto';
                }
            }
        });

        const onDocumentClick = (event) => {
            if (!dropdownInput.contains(event.target) && !dropdownList.contains(event.target)) {
                dropdownContainer.classList.remove('active');
                dropdownList.style.top = '100%';
                dropdownList.style.bottom = 'auto';
            }
        };

        document.addEventListener('click', onDocumentClick);
        return () => document.removeEventListener('click', onDocumentClick);
    }

    const cleanupDropdown = setupCustomDropdown(
        'search-engine-select',
        'search-engine-select_hidden',
        'search-engine-select-dropdown-list',
        searchEngines
    );

    const initialSearchEngineValue = localStorage.getItem('searchEngine.default') || 'ecosia';
    let initialSearchEngineOption = null;
    for (const category in searchEngines) {
        initialSearchEngineOption = searchEngines[category].find(s => s.value === initialSearchEngineValue);
        if (initialSearchEngineOption) break;
    }

    if (initialSearchEngineOption) {
        document.getElementById('search-engine-select').value = initialSearchEngineOption.label;
        document.getElementById('search-engine-select_hidden').value = initialSearchEngineOption.value;
    }

    const mainInput = document.getElementById('main-input');
    const searchArrow = document.querySelector('.search-arrow');
    const searchEngineHiddenInput = document.getElementById('search-engine-select_hidden');

    async function performSearch() {
        const query = mainInput.value.trim();
        const selectedEngineValue = searchEngineHiddenInput.value;

        if (query) {
            let selectedEngine = null;
            for (const category in searchEngines) {
                selectedEngine = searchEngines[category].find(engine => engine.value === selectedEngineValue);
                if (selectedEngine) break;
            }

            if (selectedEngine && selectedEngine.isWebhook) {
                let webhookUrl = selectedEngine.url;
                if (!webhookUrl) {
                    webhookUrl = await showPrompt(`Please enter the Webhook URL for ${selectedEngine.label}:`);
                    if (webhookUrl) {
                        selectedEngine.url = webhookUrl;
                        localStorage.setItem('searchEngines', JSON.stringify(searchEngines));
                    }
                }

                if (webhookUrl) {
                    await sendToWebhook(webhookUrl, query);
                }
                mainInput.value = '';
                return;
            }

            if (selectedEngine && selectedEngine.url) {
                window.location.href = selectedEngine.url + encodeURIComponent(query);
            } else {
                window.location.href = 'https://www.ecosia.org/search?q=' + encodeURIComponent(query);
            }
        }
    }

    async function sendToWebhook(url, message) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: message }),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
        } catch (error) {
            console.error('Error sending message to webhook:', error);
            await showAlert('Failed to send message to webhook. Check console for details.');
        }
    }

    const onKeydown = (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    };

    mainInput.addEventListener('keydown', onKeydown);
    searchArrow.addEventListener('click', performSearch);

    return () => {
        if (cleanupDropdown) cleanupDropdown();
        mainInput.removeEventListener('keydown', onKeydown);
        searchArrow.removeEventListener('click', performSearch);
    };
}
