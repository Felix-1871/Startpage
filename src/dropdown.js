document.addEventListener('DOMContentLoaded', () => {
    // Function to handle custom dropdown logic
    function setupCustomDropdown(dropdownElementId, hiddenInputId, listElementId, options) {
        const dropdownInput = document.getElementById(dropdownElementId);
        const hiddenInput = document.getElementById(hiddenInputId);
        const dropdownList = document.getElementById(listElementId);
        const dropdownContainer = dropdownInput.parentElement; // Get the parent for positioning reference (which is .browser-dropdown)

        if (!dropdownInput || !hiddenInput || !dropdownList || !dropdownContainer) {
            console.error('Dropdown elements not found for:', dropdownElementId);
            return;
        }

        // Populate dropdown list
        dropdownList.innerHTML = ''; // Clear existing items
        options.forEach(option => {
            const listItem = document.createElement('div');
            listItem.classList.add('custom-dropdown-list-item');
            listItem.textContent = option.label;
            listItem.dataset.value = option.value;
            listItem.addEventListener('click', () => {
                dropdownInput.value = option.label;
                hiddenInput.value = option.value;
                dropdownContainer.classList.remove('active'); // Changed from dropdownList
                dropdownList.style.top = '100%'; // Reset to default position
                dropdownList.style.bottom = 'auto'; // Reset to default position
            });
            dropdownList.appendChild(listItem);
        });

        // Toggle dropdown visibility and position
        dropdownInput.addEventListener('click', () => {
            dropdownContainer.classList.toggle('active'); // Changed from dropdownList
            if (dropdownContainer.classList.contains('active')) { // Changed from dropdownList
                const spaceBelow = window.innerHeight - dropdownContainer.getBoundingClientRect().bottom;
                const spaceAbove = dropdownContainer.getBoundingClientRect().top;
                const listHeight = dropdownList.scrollHeight;

                if (spaceBelow < listHeight && spaceAbove > listHeight) {
                    // Not enough space below, but enough above - position upwards
                    dropdownList.style.top = 'auto';
                    dropdownList.style.bottom = '100%';
                } else {
                    // Default to positioning downwards
                    dropdownList.style.top = '100%';
                    dropdownList.style.bottom = 'auto';
                }
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!dropdownInput.contains(event.target) && !dropdownList.contains(event.target)) {
                dropdownContainer.classList.remove('active'); // Changed from dropdownList
                dropdownList.style.top = '100%'; // Reset to default position
                dropdownList.style.bottom = 'auto'; // Reset to default position
            }
        });
    }

    // Define search engine options
    const searchEngines = [
        { value: 'ecosia', label: 'Ecosia', url: 'https://www.ecosia.org/search?q=' },
        { value: 'arch_wiki', label: 'Arch', url: 'https://wiki.archlinux.org/index.php?title=Special%253ASearch&fulltext=1&search=' },
        { value: 'yt', label: 'Youtube', url: 'https://www.youtube.com/results?search_query=' },
        { value: 'aur', label: 'AUR', url: 'https://aur.archlinux.org/packages?O=0&K='}
    ];

    // Setup the search engine dropdown
    setupCustomDropdown(
        'search-engine-select',
        'search-engine-select_hidden',
        'search-engine-select-dropdown-list',
        searchEngines
    );

    // Initial setting for the search engine dropdown
    // This could be loaded from user settings if available
    const initialSearchEngineValue = localStorage.getItem('searchEngine.selected') || 'ecosia';
    const initialSearchEngineOption = searchEngines.find(s => s.value === initialSearchEngineValue);
    if (initialSearchEngineOption) {
        document.getElementById('search-engine-select').value = initialSearchEngineOption.label;
        document.getElementById('search-engine-select_hidden').value = initialSearchEngineOption.value;
    }

    // --- Search Functionality ---
    const mainInput = document.getElementById('main-input');
    const searchArrow = document.querySelector('.search-arrow');
    const searchEngineHiddenInput = document.getElementById('search-engine-select_hidden');

    function performSearch() {
        const query = mainInput.value.trim();
        const selectedEngineValue = searchEngineHiddenInput.value;

        if (query) {
            const selectedEngine = searchEngines.find(engine => engine.value === selectedEngineValue);
            if (selectedEngine && selectedEngine.url) {
                window.location.href = selectedEngine.url + encodeURIComponent(query);
            } else {
                // Fallback to Google if no engine or URL is found
                window.location.href = 'https://www.ecosia.org/search?q=' + encodeURIComponent(query);
            }
        }
    }

    // Event listener for Enter key in main input
    mainInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    // Event listener for click on search arrow
    searchArrow.addEventListener('click', performSearch);
});