import { linkData, renderCategories, renderLinks } from './links.js';

document.addEventListener("DOMContentLoaded", () => {
    const contextMenu = document.getElementById('context-menu');
    const modalContainer = document.getElementById('modal-container');

    // Function to save linkData to localStorage
    function saveLinkData() {
        localStorage.setItem('linkData', JSON.stringify(linkData));
    }

    // Function to load linkData from localStorage
    function loadLinkData() {
        const storedLinkData = localStorage.getItem('linkData');
        if (storedLinkData) {
            linkData.length = 0;
            JSON.parse(storedLinkData).forEach(item => linkData.push(item));
        }
    }

    loadLinkData();
    renderCategories();
    renderLinks(0);

    function closeOpenActionMenu() {
        if (openActionMenu) {
            openActionMenu.remove();
            openActionMenu = null;
        }
    }

    function openModal(title, fields, currentValues = {}, onSubmit) {
        modalContainer.innerHTML = ''; // Clear previous modal content
        modalContainer.style.display = 'flex'; // Show modal overlay

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        const h3 = document.createElement('h3');
        h3.textContent = title;
        modalContent.appendChild(h3);

        const form = document.createElement('form');
        form.addEventListener('submit', (e) => e.preventDefault()); // Prevent default form submission

        const inputElements = {}; // To store references to input fields

        fields.forEach(field => {
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';

            const label = document.createElement('label');
            label.textContent = field.label + ':';
            label.htmlFor = field.name;
            formGroup.appendChild(label);

            let input;
            if (field.type === 'textarea') {
                input = document.createElement('textarea');
                input.rows = 3;
            } else if (field.type === 'select-icon') {
                input = document.createElement('select');
                // Option for manual input
                const manualOption = document.createElement('option');
                manualOption.value = '';
                manualOption.textContent = 'Enter custom path...';
                input.appendChild(manualOption);

                ICON_PATHS.forEach(iconPath => {
                    const option = document.createElement('option');
                    option.value = iconPath;
                    option.textContent = iconPath.split('/').pop(); // Display filename
                    input.appendChild(option);
                });
                // Current icon path might not be in ICON_PATHS, so add it if it's new
                if (currentValues[field.name] && !ICON_PATHS.includes(currentValues[field.name])) {
                    const customOption = document.createElement('option');
                    customOption.value = currentValues[field.name];
                    customOption.textContent = currentValues[field.name].split('/').pop() + ' (Custom)';
                    input.appendChild(customOption);
                }

                input.value = currentValues[field.name] || ''; // Set current value
                
                const iconPreview = document.createElement('img');
                iconPreview.className = 'icon-preview';
                iconPreview.style.display = 'none'; // Hidden by default
                formGroup.appendChild(iconPreview);

                const customPathInput = document.createElement('input');
                customPathInput.type = 'text';
                customPathInput.placeholder = 'Or enter custom path (e.g., ./img/icons/my-icon.svg)';
                customPathInput.style.display = 'none'; // Hidden by default
                formGroup.appendChild(customPathInput);

                const updateIconPreview = (path) => {
                    if (path) {
                        iconPreview.src = path;
                        iconPreview.style.display = 'inline-block';
                    } else {
                        iconPreview.style.display = 'none';
                    }
                };

                // Logic to show/hide custom path input and update preview
                const handleIconChange = () => {
                    const selectedValue = input.value;
                    if (selectedValue === '') {
                        customPathInput.style.display = 'block';
                        updateIconPreview(customPathInput.value);
                    } else {
                        customPathInput.style.display = 'none';
                        updateIconPreview(selectedValue);
                    }
                };

                input.addEventListener('change', handleIconChange);
                customPathInput.addEventListener('input', () => updateIconPreview(customPathInput.value));
                
                handleIconChange(); // Initial call to set correct state

                // Set initial value for custom path if it's not a pre-selected icon
                if (currentValues[field.name] && !ICON_PATHS.includes(currentValues[field.name])) {
                    input.value = ''; // Select "Enter custom path..."
                    customPathInput.value = currentValues[field.name];
                    customPathInput.style.display = 'block';
                    updateIconPreview(customPathInput.value);
                } else if (currentValues[field.name]) {
                    input.value = currentValues[field.name];
                    updateIconPreview(currentValues[field.name]);
                }


            } else {
                input = document.createElement('input');
                input.type = field.type;
            }

            input.id = field.name;
            input.name = field.name;
            input.value = currentValues[field.name] || '';
            input.placeholder = field.placeholder || '';
            
            if (field.type !== 'select-icon') { // select-icon handled separately
                formGroup.appendChild(input);
            }
            inputElements[field.name] = input; // Store reference

            if (field.type === 'select-icon') {
                 // Store a reference to the actual value we want to retrieve
                inputElements[field.name] = {
                    get value() {
                        return input.value === '' ? customPathInput.value : input.value;
                    },
                    set value(val) {
                        if (ICON_PATHS.includes(val)) {
                            input.value = val;
                            customPathInput.style.display = 'none';
                        } else {
                            input.value = '';
                            customPathInput.value = val;
                            customPathInput.style.display = 'block';
                        }
                        updateIconPreview(val);
                    }
                };
            }

            form.appendChild(formGroup);
        });

        const modalButtons = document.createElement('div');
        modalButtons.className = 'modal-buttons';

        const saveButton = document.createElement('button');
        saveButton.type = 'submit';
        saveButton.className = 'save-button';
        saveButton.textContent = 'Save';
        saveButton.addEventListener('click', () => {
            const data = {};
            fields.forEach(field => {
                data[field.name] = inputElements[field.name].value;
            });
            onSubmit(data);
            modalContainer.style.display = 'none'; // Hide modal
            contextMenu.style.display = 'none'; // Close context menu
        });
        modalButtons.appendChild(saveButton);

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'cancel-button';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
            modalContainer.style.display = 'none'; // Hide modal
            contextMenu.style.display = 'none'; // Close context menu
        });
        modalButtons.appendChild(cancelButton);

        form.appendChild(modalButtons);
        modalContent.appendChild(form);
        modalContainer.appendChild(modalContent);

        // Close modal when clicking outside (on the overlay)
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                modalContainer.style.display = 'none';
                contextMenu.style.display = 'none';
            }
        });
    }

    // Function to save linkData to localStorage
    function saveLinkData() {
        localStorage.setItem('linkData', JSON.stringify(linkData));
    }

    // Function to load linkData from localStorage
    function loadLinkData() {
        const storedLinkData = localStorage.getItem('linkData');
        if (storedLinkData) {
            linkData.length = 0;
            JSON.parse(storedLinkData).forEach(item => linkData.push(item));
        }
    }

    loadLinkData();
    renderCategories();
    renderLinks(0);

    let openActionMenu = null;

    function closeOpenActionMenu() {
        if (openActionMenu) {
            openActionMenu.remove();
            openActionMenu = null;
        }
    }

    function createActionMenu(parentLi, type, index, subIndex = null) {
        closeOpenActionMenu();

        const actionMenu = document.createElement('div');
        actionMenu.className = 'context-menu-item-actions';

        const editButton = document.createElement('button');
        editButton.className = 'context-menu-action-button';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', (e) => {
            e.stopPropagation();
            closeOpenActionMenu();
            if (type === 'category') {
                const categoryItem = linkData[index];
                openModal('Edit Category', [
                    { name: 'category', label: 'Category Name', type: 'text' },
                    { name: 'icon', label: 'Icon', type: 'select-icon' },
                ], {
                    category: categoryItem.category,
                    icon: categoryItem.icon
                }, (data) => {
                    linkData[index].category = data.category;
                    linkData[index].icon = data.icon;
                    saveLinkData();
                    renderCategories();
                    const currentActiveIndex = parseInt(document.querySelector('.category-item.active')?.dataset.index || '0');
                    renderLinks(currentActiveIndex < linkData.length ? currentActiveIndex : 0);
                    renderContextMenu();
                });
            } else if (type === 'link') {
                const linkItem = linkData[index].links[subIndex];
                openModal('Edit Link', [
                    { name: 'name', label: 'Link Name', type: 'text' },
                    { name: 'url', label: 'URL', type: 'text' },
                    { name: 'icon', label: 'Icon', type: 'select-icon' },
                    { name: 'description', label: 'Description', type: 'textarea' },
                ], {
                    name: linkItem.name,
                    url: linkItem.url,
                    icon: linkItem.icon,
                    description: linkItem.description
                }, (data) => {
                    linkData[index].links[subIndex].name = data.name;
                    linkData[index].links[subIndex].url = data.url;
                    linkData[index].links[subIndex].icon = data.icon;
                    linkData[index].links[subIndex].description = data.description;
                    saveLinkData();
                    renderLinks(index);
                    renderContextMenu();
                });
            }
        });
        actionMenu.appendChild(editButton);

        const removeButton = document.createElement('button');
        removeButton.className = 'context-menu-action-button';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            closeOpenActionMenu();
            if (type === 'category') {
                const categoryItem = linkData[index];
                if (confirm(`Are you sure you want to remove category "${categoryItem.category}"?`)) {
                    linkData.splice(index, 1);
                    saveLinkData();
                    renderCategories();
                    renderLinks(0);
                    renderContextMenu();
                }
            } else if (type === 'link') {
                const linkItem = linkData[index].links[subIndex];
                if (confirm(`Are you sure you want to remove link "${linkItem.name}"?`)) {
                    linkData[index].links.splice(subIndex, 1);
                    saveLinkData();
                    renderLinks(index);
                    renderContextMenu();
                }
            }
        });
        actionMenu.appendChild(removeButton);

        parentLi.style.position = 'relative';
        parentLi.appendChild(actionMenu);
        openActionMenu = actionMenu;
    }


    function renderContextMenu() {
        closeOpenActionMenu();
        contextMenu.innerHTML = '';

        // Categories Section
        const categoriesSection = document.createElement('div');
        categoriesSection.className = 'context-menu-section';
        categoriesSection.innerHTML = '<div class="context-menu-title">Categories</div>';
        const categoryUl = document.createElement('ul');

        linkData.forEach((categoryItem, index) => {
            const li = document.createElement('li');
            li.textContent = categoryItem.category;
            li.className = 'context-menu-action-item';
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                createActionMenu(li, 'category', index);
            });
            categoryUl.appendChild(li);
        });

        const addCategoryLi = document.createElement('li');
        addCategoryLi.textContent = 'Add New Category';
        addCategoryLi.dataset.action = 'add-category';
        addCategoryLi.addEventListener('click', (e) => {
            e.stopPropagation();
            closeOpenActionMenu();
            openModal('Add New Category', [
                { name: 'category', label: 'Category Name', type: 'text' },
                { name: 'icon', label: 'Icon', type: 'select-icon' },
            ], {}, (data) => {
                linkData.push({ category: data.category, icon: data.icon, links: [] });
                saveLinkData();
                renderCategories();
                renderContextMenu();
            });
        });
        categoryUl.appendChild(addCategoryLi);
        categoriesSection.appendChild(categoryUl);
        contextMenu.appendChild(categoriesSection);

        // Links Section (for currently active category)
        const activeCategoryItem = document.querySelector('.category-item.active');
        const activeCategoryIndex = activeCategoryItem ? parseInt(activeCategoryItem.dataset.index) : 0;
        const activeCategory = linkData[activeCategoryIndex];

        if (activeCategory) {
            const linksSection = document.createElement('div');
            linksSection.className = 'context-menu-section';
            linksSection.innerHTML = `<div class="context-menu-title">Links in ${activeCategory.category}</div>`;
            const linksUl = document.createElement('ul');

            activeCategory.links.forEach((linkItem, subIndex) => {
                const li = document.createElement('li');
                li.textContent = linkItem.name;
                li.className = 'context-menu-action-item';
                li.addEventListener('click', (e) => {
                    e.stopPropagation();
                    createActionMenu(li, 'link', activeCategoryIndex, subIndex);
                });
                linksUl.appendChild(li);
            });

            const addLinkLi = document.createElement('li');
            addLinkLi.textContent = `Add New Link to ${activeCategory.category}`;
            addLinkLi.dataset.action = 'add-link';
            addLinkLi.addEventListener('click', (e) => {
                e.stopPropagation();
                closeOpenActionMenu();
                openModal(`Add New Link to ${activeCategory.category}`, [
                    { name: 'name', label: 'Link Name', type: 'text' },
                    { name: 'url', label: 'URL', type: 'text' },
                    { name: 'icon', label: 'Icon', type: 'select-icon' },
                    { name: 'description', label: 'Description', type: 'textarea' },
                ], {}, (data) => {
                    linkData[activeCategoryIndex].links.push({
                        name: data.name,
                        url: data.url,
                        icon: data.icon,
                        color: "#cccccc", // Default color for now
                        description: data.description
                    });
                    saveLinkData();
                    renderLinks(activeCategoryIndex);
                    renderContextMenu();
                });
            });
            linksUl.appendChild(addLinkLi);
            linksSection.appendChild(linksUl);
            contextMenu.appendChild(linksSection);
        }
    }

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      closeOpenActionMenu();
      
      const { clientX: mouseX, clientY: mouseY } = e;
      
      contextMenu.style.top = `${mouseY}px`;
      contextMenu.style.left = `${mouseX}px`;
      
      renderContextMenu();
      contextMenu.style.display = 'block';
    });
  
    document.addEventListener('click', (e) => {
      if (!contextMenu.contains(e.target)) {
        contextMenu.style.display = 'none';
        closeOpenActionMenu();
      } else if (openActionMenu && !openActionMenu.contains(e.target) && !e.target.closest('.context-menu-action-item')) {
        closeOpenActionMenu();
      }
    });
});
