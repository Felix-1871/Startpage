import { showAlert, showPrompt } from '../modals/modals.js';

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

export function init() {
    const savedEngines = localStorage.getItem('searchEngines');
    const searchEngines = savedEngines ? JSON.parse(savedEngines) : defaultSearchEngines;

    function setupCustomDropdown(dropdownElementId, hiddenInputId, listElementId, categories) {
        const dropdownInput = document.getElementById(dropdownElementId);
        const hiddenInput = document.getElementById(hiddenInputId);
        const dropdownList = document.getElementById(listElementId);
        const dropdownContainer = dropdownInput.parentElement; 

        if (!dropdownInput || !hiddenInput || !dropdownList || !dropdownContainer) {
            console.error('Dropdown elements not found for:', dropdownElementId);
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

        document.addEventListener('click', (event) => {
            if (!dropdownInput.contains(event.target) && !dropdownList.contains(event.target)) {
                dropdownContainer.classList.remove('active'); 
                dropdownList.style.top = '100%'; 
                dropdownList.style.bottom = 'auto'; 
            }
        });
    }

    setupCustomDropdown(
        'search-engine-select',
        'search-engine-select_hidden',
        'search-engine-select-dropdown-list',
        searchEngines
    );

    const initialSearchEngineValue = localStorage.getItem('searchEngine.selected') || 'ecosia';
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
            if (selectedEngineValue === 'discord_webhook') {
                const webhookUrl = localStorage.getItem('discord_webhook_url');
                if (!webhookUrl) {
                    const url = await showPrompt('Please enter your Discord Webhook URL:');
                    if (url) {
                        localStorage.setItem('discord_webhook_url', url);
                        sendToDiscord(url, query);
                    }
                } else {
                    sendToDiscord(webhookUrl, query);
                }
                mainInput.value = ''; 
                return;
            }

            let selectedEngine = null;
            for (const category in searchEngines) {
                selectedEngine = searchEngines[category].find(engine => engine.value === selectedEngineValue);
                if (selectedEngine) break;
            }

            if (selectedEngine && selectedEngine.url) {
                window.location.href = selectedEngine.url + encodeURIComponent(query);
            } else {
                window.location.href = 'https://www.ecosia.org/search?q=' + encodeURIComponent(query);
            }
        }
    }

    async function sendToDiscord(url, message) {
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
            console.error('Error sending message to Discord:', error);
            await showAlert('Failed to send message to Discord. Check console for details.');
        }
    }

    mainInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    searchArrow.addEventListener('click', performSearch);
}
