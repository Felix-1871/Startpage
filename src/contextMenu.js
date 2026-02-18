import { linkData, renderCategories, renderLinks, syncLinksFromJson, syncLinksOverwrite, getSyncChanges, applyChange, findBestIcon } from './tabs.js';
import { bookmarks, renderBookmarks, saveBookmarks } from './bookmarks.js';
import { openModal, showAlert, showConfirm, showPrompt } from './modals.js';

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

    async function performAutoSync() {
        const success = await syncLinksFromJson();
        if (success) {
            saveAndRefresh();
            console.log('Links auto-synced successfully');
        }
    }

    function saveAndRefresh() {
        saveLinkData();
        const activeCategoryItem = document.querySelector(".category-item.active");
        const activeIndex = activeCategoryItem ? parseInt(activeCategoryItem.dataset.index) : 0;
        renderCategories(activeIndex);
        renderLinks(activeIndex < linkData.length ? activeIndex : 0);
    }

    loadLinkData();
    performAutoSync(); 
    renderCategories();
    renderLinks(0);

    // Set up periodic sync (every 1 hour)
    setInterval(performAutoSync, 3600000);

    async function showSyncModalQueue(changes) {
        if (changes.length === 0) {
            await showAlert('No changes detected.');
            return;
        }

        let index = 0;

        async function showNext() {
            if (index >= changes.length) {
                saveAndRefresh();
                modalContainer.style.display = 'none'; // Hide modal
                contextMenu.style.display = 'none'; // Ensure context menu is closed
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
            acceptBtn.onclick = () => { applyChange(change, 'accept'); index++; showNext(); };
            buttons.appendChild(acceptBtn);

            if (change.type === 'updated' || change.type === 'new') {
                const keepBothBtn = document.createElement('button');
                keepBothBtn.textContent = 'Keep Both';
                keepBothBtn.className = 'save-button';
                keepBothBtn.style.backgroundColor = '#c4a7e7';
                keepBothBtn.onclick = () => { applyChange(change, 'keep-both'); index++; showNext(); };
                buttons.appendChild(keepBothBtn);
            }

            const rejectBtn = document.createElement('button');
            rejectBtn.textContent = 'Reject';
            rejectBtn.className = 'cancel-button';
            rejectBtn.onclick = () => { applyChange(change, 'reject'); index++; showNext(); };
            buttons.appendChild(rejectBtn);

            modalContent.appendChild(buttons);
            modalContainer.appendChild(modalContent);
        }

        await showNext();
    }

    function renderContextMenu(type = null, index = null, subIndex = null) {
        contextMenu.innerHTML = '';
        const sections = [];

        if (type === 'category') {
            sections.push({
                title: 'Category Actions',
                items: [
                    { 
                        label: 'Edit Category', 
                        action: () => {
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
                        }
                    },
                    { 
                        label: 'Remove Category', 
                        action: async () => {
                            if (await showConfirm(`Remove category "${linkData[index].category}"?`)) {
                                linkData.splice(index, 1);
                                saveAndRefresh();
                                contextMenu.style.display = 'none';
                            }
                        }
                    }
                ]
            });
        } else if (type === 'link') {
            sections.push({
                title: 'Link Actions',
                items: [
                    { 
                        label: 'Edit Link', 
                        action: () => {
                            const linkItem = linkData[index].links[subIndex];
                            openModal('Edit Link', [
                                { name: 'name', label: 'Link Name', type: 'text' },
                                { name: 'url', label: 'URL', type: 'text' },
                                { name: 'icon', label: 'Icon', type: 'select-icon' },
                                { name: 'color', label: 'Brand Color', type: 'color' },
                                { name: 'description', label: 'Description', type: 'textarea' },
                            ], { name: linkItem.name, url: linkItem.url, icon: linkItem.icon, color: linkItem.color || '#cccccc', description: linkItem.description }, (data) => {
                                linkData[index].links[subIndex] = { ...linkData[index].links[subIndex], ...data, icon: data.icon || './img/icons/default-link.svg' };
                                saveAndRefresh();
                                contextMenu.style.display = 'none';
                            });
                        }
                    },
                    { 
                        label: 'Remove Link', 
                        action: async () => {
                            if (await showConfirm(`Remove link "${linkData[index].links[subIndex].name}"?`)) {
                                linkData[index].links.splice(subIndex, 1);
                                saveAndRefresh();
                                contextMenu.style.display = 'none';
                            }
                        }
                    }
                ]
            });
        } else if (type === 'bookmark') {
            sections.push({
                title: 'Bookmark Actions',
                items: [
                    {
                        label: 'Edit Bookmark',
                        action: () => {
                            const b = bookmarks[index];
                            openModal('Edit Bookmark', [
                                { name: 'name', label: 'Name', type: 'text' },
                                { name: 'url', label: 'URL', type: 'text' },
                                { name: 'icon', label: 'Icon', type: 'select-icon' },
                                { name: 'color', label: 'Brand Color', type: 'color' },
                                { name: 'description', label: 'Description', type: 'textarea' },
                            ], { name: b.name, url: b.url, icon: b.icon, color: b.color || '#c4a7e7', description: b.description }, (data) => {
                                bookmarks[index] = { ...bookmarks[index], ...data, icon: data.icon || './img/icons/default-link.svg' };
                                saveBookmarks();
                                renderBookmarks();
                                contextMenu.style.display = 'none';
                            });
                        }
                    },
                    {
                        label: 'Remove Bookmark',
                        action: async () => {
                            if (await showConfirm(`Remove bookmark "${bookmarks[index].name}"?`)) {
                                bookmarks.splice(index, 1);
                                saveBookmarks();
                                renderBookmarks();
                                contextMenu.style.display = 'none';
                            }
                        }
                    }
                ]
            });
        } else {
            // Default Empty Space Menu
            sections.push({ 
                title: 'Sync Actions', 
                items: [
                    { label: 'Full Sync', action: async () => { if(await showConfirm('Overwrite ALL links with JSON data?')) { await syncLinksOverwrite(); saveAndRefresh(); contextMenu.style.display = 'none'; } } },
                    { label: 'Interactive Sync', action: async () => { const changes = await getSyncChanges(); showSyncModalQueue(changes); contextMenu.style.display = 'none'; } }
                ] 
            });
            sections.push({
                title: 'Add Actions',
                items: [
                    { label: 'Add New Category', action: () => openModal('Add Category', [{ name: 'category', label: 'Name', type: 'text' }, { name: 'icon', label: 'Icon', type: 'select-icon' }], {}, (data) => { linkData.push({ category: data.category, icon: data.icon || './img/icons/default-category.svg', links: [] }); saveAndRefresh(); contextMenu.style.display = 'none'; }) },
                    { 
                        label: 'Add New Link', 
                        action: () => {
                            const activeIdx = document.querySelector('.category-item.active')?.dataset.index || 0;
                            openModal('Add Link', [{ name: 'name', label: 'Name', type: 'text' }, { name: 'url', label: 'URL', type: 'text' }, { name: 'icon', label: 'Icon', type: 'select-icon' }, { name: 'color', label: 'Brand Color', type: 'color' }, { name: 'description', label: 'Description', type: 'textarea' }], { color: '#cccccc' }, async (data) => { 
                                let finalIcon = data.icon;
                                let finalColor = data.color;
                                if (!finalIcon) {
                                    const best = await findBestIcon(data.url);
                                    finalIcon = best.icon;
                                    if (finalColor === '#cccccc') finalColor = best.color;
                                }
                                linkData[activeIdx].links.push({ ...data, icon: finalIcon, color: finalColor }); 
                                saveAndRefresh(); 
                                contextMenu.style.display = 'none';
                            });
                        }
                    },
                    {
                        label: 'Add New Bookmark',
                        action: () => {
                            openModal('Add Bookmark', [
                                { name: 'name', label: 'Name', type: 'text' },
                                { name: 'url', label: 'URL', type: 'text' },
                                { name: 'icon', label: 'Icon', type: 'select-icon' },
                                { name: 'color', label: 'Brand Color', type: 'color' },
                                { name: 'description', label: 'Description', type: 'textarea' },
                            ], { color: '#c4a7e7' }, async (data) => {
                                let finalIcon = data.icon;
                                let finalColor = data.color;
                                if (!finalIcon) {
                                    const best = await findBestIcon(data.url);
                                    finalIcon = best.icon;
                                    if (finalColor === '#c4a7e7') finalColor = best.color;
                                }
                                bookmarks.push({ ...data, icon: finalIcon, color: finalColor });
                                saveBookmarks();
                                renderBookmarks();
                                contextMenu.style.display = 'none';
                            });
                        }
                    }
                ]
            });
        }

        sections.forEach(sec => {
            const div = document.createElement('div');
            div.className = 'context-menu-section';
            div.innerHTML = `<div class="context-menu-title">${sec.title}</div>`;
            const ul = document.createElement('ul');
            sec.items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item.label;
                li.className = 'context-menu-action-item';
                li.onclick = (e) => { e.stopPropagation(); item.action(); };
                ul.appendChild(li);
            });
            div.appendChild(ul);
            contextMenu.appendChild(div);
        });
    }

    document.addEventListener('contextmenu', (e) => {
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

      // Natural size measurement
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
    });
  
    document.addEventListener('click', (e) => {
      if (!contextMenu.contains(e.target)) {
        contextMenu.style.display = 'none';
      }
    });
});
