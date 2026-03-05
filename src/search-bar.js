import { showAlert, showPrompt } from './modals.js';

document.addEventListener('DOMContentLoaded', () => {
    
    function setupCustomDropdown(dropdownElementId, hiddenInputId, listElementId, options) {
        const dropdownInput = document.getElementById(dropdownElementId);
        const hiddenInput = document.getElementById(hiddenInputId);
        const dropdownList = document.getElementById(listElementId);
        const dropdownContainer = dropdownInput.parentElement; 

        if (!dropdownInput || !hiddenInput || !dropdownList || !dropdownContainer) {
            console.error('Dropdown elements not found for:', dropdownElementId);
            return;
        }

        
        dropdownList.innerHTML = ''; 
        options.forEach(option => {
            const listItem = document.createElement('div');
            listItem.classList.add('custom-dropdown-list-item');
            listItem.textContent = option.label;
            listItem.dataset.value = option.value;
            listItem.addEventListener('click', () => {
                dropdownInput.value = option.label;
                hiddenInput.value = option.value;
                dropdownContainer.classList.remove('active'); 
                dropdownList.style.top = '100%'; 
                dropdownList.style.bottom = 'auto'; 
            });
            dropdownList.appendChild(listItem);
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

    
    const searchEngines = [
        { value: 'discord_webhook', label: 'Discord', url: '' },
        { value: 'ecosia', label: 'Ecosia', url: 'https://www.ecosia.org/search?q=' },
        { value: 'arch_wiki', label: 'Arch', url: 'https://wiki.archlinux.org/index.php?title=Special%253ASearch&fulltext=1&search=' },
        { value: 'yt', label: 'Youtube', url: 'https://www.youtube.com/results?search_query=' },
        { value: 'aur', label: 'AUR', url: 'https://aur.archlinux.org/packages?O=0&K='}
    ];

    
    setupCustomDropdown(
        'search-engine-select',
        'search-engine-select_hidden',
        'search-engine-select-dropdown-list',
        searchEngines
    );

    
    
    const initialSearchEngineValue = localStorage.getItem('searchEngine.selected') || 'ecosia';
    const initialSearchEngineOption = searchEngines.find(s => s.value === initialSearchEngineValue);
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

            const selectedEngine = searchEngines.find(engine => engine.value === selectedEngineValue);
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
});