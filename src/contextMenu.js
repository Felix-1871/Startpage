import { linkData, renderCategories, renderLinks, syncLinksFromJson, syncLinksOverwrite, getSyncChanges, applyChange } from './links.js';
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
        renderCategories();
        const activeCategoryItem = document.querySelector(".category-item.active");
        const activeIndex = activeCategoryItem ? parseInt(activeCategoryItem.dataset.index) : 0;
        renderLinks(activeIndex < linkData.length ? activeIndex : 0);
    }

    loadLinkData();
    performAutoSync(); 
    renderCategories();
    renderLinks(0);

    // Set up periodic sync (every 1 hour)
    setInterval(performAutoSync, 3600000);

    let openActionMenu = null;

    function closeOpenActionMenu() {
        if (openActionMenu) {
            openActionMenu.remove();
            openActionMenu = null;
        }
    }

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

    function createActionMenu(parentLi, type, index, subIndex = null) {
        if (openActionMenu) openActionMenu.remove();

        const actionMenu = document.createElement('div');
        actionMenu.className = 'context-menu-item-actions';

        const editButton = document.createElement('button');
        editButton.className = 'context-menu-action-button';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', (e) => {
            e.stopPropagation();
            actionMenu.remove();
            if (type === 'category') {
                const categoryItem = linkData[index];
                openModal('Edit Category', [
                    { name: 'category', label: 'Category Name', type: 'text' },
                    { name: 'icon', label: 'Icon', type: 'select-icon' },
                ], { category: categoryItem.category, icon: categoryItem.icon }, (data) => {
                    linkData[index].category = data.category;
                    linkData[index].icon = data.icon;
                    saveAndRefresh();
                    renderContextMenu();
                });
            } else if (type === 'link') {
                const linkItem = linkData[index].links[subIndex];
                openModal('Edit Link', [
                    { name: 'name', label: 'Link Name', type: 'text' },
                    { name: 'url', label: 'URL', type: 'text' },
                    { name: 'icon', label: 'Icon', type: 'select-icon' },
                    { name: 'description', label: 'Description', type: 'textarea' },
                ], { name: linkItem.name, url: linkItem.url, icon: linkItem.icon, description: linkItem.description }, (data) => {
                    linkData[index].links[subIndex] = { ...linkData[index].links[subIndex], ...data };
                    saveAndRefresh();
                    renderContextMenu();
                });
            }
        });
        actionMenu.appendChild(editButton);

        const removeButton = document.createElement('button');
        removeButton.className = 'context-menu-action-button';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            actionMenu.remove();
            if (await showConfirm(`Remove ${type}?`)) {
                if (type === 'category') linkData.splice(index, 1);
                else linkData[index].links.splice(subIndex, 1);
                saveAndRefresh();
                renderContextMenu();
            }
        });
        actionMenu.appendChild(removeButton);

        parentLi.appendChild(actionMenu);
        openActionMenu = actionMenu;
    }


    function renderContextMenu() {
        if (openActionMenu) openActionMenu.remove();
        contextMenu.innerHTML = '';

        const sections = [
            { 
                title: 'Sync Actions', 
                items: [
                    { label: 'Full Sync', action: async () => { if(await showConfirm('Overwrite ALL links with JSON data?')) { await syncLinksOverwrite(); saveAndRefresh(); } } },
                    { label: 'Interactive Sync', action: async () => { const changes = await getSyncChanges(); showSyncModalQueue(changes); } }
                ] 
            },
            {
                title: 'Categories',
                items: linkData.map((cat, i) => ({ label: cat.category, action: (e, li) => createActionMenu(li, 'category', i) })),
                footer: { label: 'Add New Category', action: () => openModal('Add Category', [{ name: 'category', label: 'Name', type: 'text' }, { name: 'icon', label: 'Icon', type: 'select-icon' }], {}, (data) => { linkData.push({ category: data.category, icon: data.icon, links: [] }); saveAndRefresh(); renderContextMenu(); }) }
            }
        ];

        sections.forEach(sec => {
            const div = document.createElement('div');
            div.className = 'context-menu-section';
            div.innerHTML = `<div class="context-menu-title">${sec.title}</div>`;
            const ul = document.createElement('ul');
            sec.items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item.label;
                li.className = 'context-menu-action-item';
                li.onclick = (e) => { e.stopPropagation(); item.action(e, li); };
                ul.appendChild(li);
            });
            if (sec.footer) {
                const li = document.createElement('li');
                li.textContent = sec.footer.label;
                li.style.fontStyle = 'italic';
                li.onclick = (e) => { e.stopPropagation(); sec.footer.action(); };
                ul.appendChild(li);
            }
            div.appendChild(ul);
            contextMenu.appendChild(div);
        });

        // Add Active Category Links section
        const activeIdx = document.querySelector('.category-item.active')?.dataset.index || 0;
        const activeCat = linkData[activeIdx];
        if (activeCat) {
            const div = document.createElement('div');
            div.className = 'context-menu-section';
            div.innerHTML = `<div class="context-menu-title">${activeCat.category}</div>`;
            const ul = document.createElement('ul');
            activeCat.links.forEach((link, i) => {
                const li = document.createElement('li');
                li.textContent = link.name;
                li.className = 'context-menu-action-item';
                li.onclick = (e) => { e.stopPropagation(); createActionMenu(li, 'link', activeIdx, i); };
                ul.appendChild(li);
            });
            const addLi = document.createElement('li');
            addLi.textContent = 'Add New Link';
            addLi.style.fontStyle = 'italic';
            addLi.onclick = (e) => { e.stopPropagation(); openModal('Add Link', [{ name: 'name', label: 'Name', type: 'text' }, { name: 'url', label: 'URL', type: 'text' }, { name: 'icon', label: 'Icon', type: 'select-icon' }, { name: 'description', label: 'Description', type: 'textarea' }], {}, (data) => { linkData[activeIdx].links.push({ ...data, color: '#cccccc' }); saveAndRefresh(); renderContextMenu(); }); };
            ul.appendChild(addLi);
            div.appendChild(ul);
            contextMenu.appendChild(div);
        }
    }

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      
      // 1. Render content and prepare for measurement
      renderContextMenu();
      
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

      // 2. Measure natural size
      let width = contextMenu.offsetWidth;
      let height = contextMenu.offsetHeight;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // 3. Handle Vertical Overflow by Forcing Column Layout
      if (height > viewportHeight - 20) {
          // Too tall! Force columnar layout by restricting height
          contextMenu.style.height = (viewportHeight - 20) + 'px';
          // Re-measure width because it wrapped into columns
          width = contextMenu.offsetWidth;
          height = contextMenu.offsetHeight;
      }

      // 4. Calculate Final Position
      let top = e.clientY;
      let left = e.clientX;

      // Vertical correction
      if (top + height > viewportHeight - 10) {
          top = viewportHeight - height - 10;
      }
      if (top < 10) top = 10;

      // Horizontal correction
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
        if (openActionMenu) openActionMenu.remove();
      }
    });
});
