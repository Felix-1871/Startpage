export const linkData = [
   
  ];

  const categoryList = document.getElementById("category-list");
  const linksGrid = document.getElementById("links-grid");
  const categoriesHeader = document.querySelector('.categories-header');

  // Create global hover menu if it doesn't exist
  let globalHoverMenu = document.getElementById('global-link-hover-menu');
  if (!globalHoverMenu) {
    globalHoverMenu = document.createElement('div');
    globalHoverMenu.id = 'global-link-hover-menu';
    globalHoverMenu.className = 'link-hover-menu';
    globalHoverMenu.style.position = 'fixed';
    globalHoverMenu.style.display = 'none';
    globalHoverMenu.style.zIndex = '1000000';
    document.body.appendChild(globalHoverMenu);
  }

  // Create global category hover menu if it doesn't exist
  let globalCategoryHoverMenu = document.getElementById('global-category-hover-menu');
  if (!globalCategoryHoverMenu) {
    globalCategoryHoverMenu = document.createElement('div');
    globalCategoryHoverMenu.id = 'global-category-hover-menu';
    globalCategoryHoverMenu.className = 'category-hover-menu';
    globalCategoryHoverMenu.style.position = 'fixed';
    globalCategoryHoverMenu.style.display = 'none';
    globalCategoryHoverMenu.style.zIndex = '1000000';
    document.body.appendChild(globalCategoryHoverMenu);
  }

  // Enable mousewheel horizontal scrolling for categories
  categoryList.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      categoryList.scrollLeft += e.deltaY;
    }
  });

  export async function fetchExternalLinks() {
    const response = await fetch('links.json');
    if (!response.ok) throw new Error('Failed to fetch links.json');
    return await response.json();
  }

  export async function syncLinksOverwrite() {
    try {
        const externalLinks = await fetchExternalLinks();
        linkData.length = 0;
        
        const grouped = {};
        externalLinks.forEach(item => {
            if (!grouped[item.group_title]) {
                grouped[item.group_title] = {
                    category: item.group_title,
                    icon: './img/icons/default-category.svg',
                    links: []
                };
            }
            grouped[item.group_title].links.push({
                name: item.tab_title,
                url: item.tab_url,
                icon: './img/icons/default-link.svg',
                color: '#cccccc',
                description: ''
            });
        });

        Object.values(grouped).forEach(cat => linkData.push(cat));
        return true;
    } catch (error) {
        console.error('Overwrite sync error:', error);
        return false;
    }
  }

  export async function getSyncChanges() {
    const externalLinks = await fetchExternalLinks();
    const changes = [];

    const externalMap = new Map();
    externalLinks.forEach(item => {
        if (!externalMap.has(item.tab_url)) externalMap.set(item.tab_url, []);
        externalMap.get(item.tab_url).push(item);
    });

    const internalMap = new Map();
    linkData.forEach(cat => {
        cat.links.forEach(link => {
            if (!internalMap.has(link.url)) internalMap.set(link.url, []);
            internalMap.get(link.url).push({ ...link, category: cat.category });
        });
    });

    externalLinks.forEach(item => {
        const internals = internalMap.get(item.tab_url) || [];
        const exactMatch = internals.find(i => i.category === item.group_title);

        if (!exactMatch) {
            const otherCatMatch = internals.find(i => i.category !== item.group_title);
            if (otherCatMatch) {
                const externalAlsoHasInOtherCat = externalMap.get(item.tab_url).find(e => e.group_title === otherCatMatch.category);
                if (!externalAlsoHasInOtherCat) {
                    changes.push({ 
                        type: 'updated', 
                        oldData: otherCatMatch, 
                        newData: item, 
                        description: `Duplicate/Move Alert: "${item.tab_title}" exists in "${otherCatMatch.category}" but JSON wants it in "${item.group_title}".` 
                    });
                } else {
                    changes.push({ type: 'new', data: item, description: `New link: ${item.tab_title} in ${item.group_title}` });
                }
            } else {
                changes.push({ type: 'new', data: item, description: `New link: ${item.tab_title} in ${item.group_title}` });
            }
        } else if (exactMatch.name !== item.tab_title) {
            changes.push({ 
                type: 'updated', 
                oldData: exactMatch, 
                newData: item, 
                description: `Update Title: "${exactMatch.name}" -> "${item.tab_title}" in "${item.group_title}"` 
            });
        }
    });

    internalMap.forEach((internals, url) => {
        internals.forEach(internal => {
            const externalHas = externalMap.get(url)?.find(e => e.group_title === internal.category);
            if (!externalHas) {
                changes.push({ type: 'deleted', data: internal, description: `Deleted link: ${internal.name} from ${internal.category}` });
            }
        });
    });

    return changes;
  }

  export function applyChange(change, action) {
    if (action === 'reject') return;

    if (change.type === 'new' || (change.type === 'updated' && action === 'keep-both')) {
        const item = change.newData || change.data;
        let category = linkData.find(c => c.category === item.group_title);
        if (!category) {
            category = { category: item.group_title, icon: './img/icons/default-category.svg', links: [] };
            linkData.push(category);
        }
        category.links.push({
            name: item.tab_title,
            url: item.tab_url,
            icon: './img/icons/default-link.svg',
            color: '#cccccc',
            description: ''
        });
    } else if (change.type === 'updated' && action === 'accept') {
        const item = change.newData;
        const oldLink = change.oldData;
        
        const oldCat = linkData.find(c => c.category === oldLink.category);
        if (oldCat) {
            oldCat.links = oldCat.links.filter(l => l.url !== oldLink.url);
        }

        let newCat = linkData.find(c => c.category === item.group_title);
        if (!newCat) {
            newCat = { category: item.group_title, icon: './img/icons/default-category.svg', links: [] };
            linkData.push(newCat);
        }
        newCat.links.push({
            ...oldLink,
            name: item.tab_title,
            url: item.tab_url
        });
    } else if (change.type === 'deleted' && action === 'accept') {
        const cat = linkData.find(c => c.category === change.data.category);
        if (cat) {
            cat.links = cat.links.filter(l => l.url !== change.data.url);
        }
    }
  }

  export async function syncLinksFromJson() {
    try {
        const externalLinks = await fetchExternalLinks();

        externalLinks.forEach(item => {
            const { group_title, tab_title, tab_url } = item;
            
            let category = linkData.find(c => c.category === group_title);
            if (!category) {
                category = {
                    category: group_title,
                    icon: './img/icons/default-category.svg', // Default icon
                    links: []
                };
                linkData.push(category);
            }

            let link = category.links.find(l => l.url === tab_url);
            if (!link) {
                category.links.push({
                    name: tab_title,
                    url: tab_url,
                    icon: './img/icons/default-link.svg', // Default icon
                    color: '#cccccc',
                    description: ''
                });
            } else {
                link.name = tab_title;
            }
        });

        return true;
    } catch (error) {
        console.error('Sync error:', error);
        return false;
    }
  }

  export function renderCategories(activeIndex = 0) {
    categoryList.innerHTML = "";
    linkData.forEach((category, index) => {
      const li = document.createElement("li");
      li.className = "category-item";
      if (index === parseInt(activeIndex)) {
        li.classList.add("active");
      }
      li.dataset.index = index;
      li.innerHTML = `<img src="${category.icon}" alt="${category.category}" class="category-icon"> <span class="category-text">${category.category}</span>`;
      categoryList.appendChild(li);

      // Category Hover
      li.addEventListener("mouseenter", () => {
        if (categoriesHeader.classList.contains('icons-only')) {
            const rect = li.getBoundingClientRect();
            globalCategoryHoverMenu.textContent = category.category;
            globalCategoryHoverMenu.style.display = 'block';
            
            // Position above the category item
            const top = rect.top - globalCategoryHoverMenu.offsetHeight - 5;
            const left = rect.left + (rect.width / 2) - (globalCategoryHoverMenu.offsetWidth / 2);
            
            globalCategoryHoverMenu.style.top = `${top}px`;
            globalCategoryHoverMenu.style.left = `${left}px`;
        }
      });
      li.addEventListener("mouseleave", () => {
        globalCategoryHoverMenu.style.display = 'none';
      });
    });
    checkCategoryOverflow();
  }
  
  export function renderLinks(categoryIndex) {
    const category = linkData[categoryIndex];
    linksGrid.innerHTML = "";
    if (!category) return;
    category.links.forEach((link, subIndex) => {
      const a = document.createElement("a");
      a.href = link.url;
      a.className = "glass-link";
      a.dataset.subindex = subIndex;
      a.target = "_blank";
      a.innerHTML = `
        <div class="icon-placeholder" style="background-color: ${link.color};">
            <img src="${link.icon}" alt="${link.name}" class="link-icon">
        </div>
        <span>${link.name}</span>
      `;

      // Link Hover
      a.addEventListener('mouseenter', () => {
        const rect = a.getBoundingClientRect();
        globalHoverMenu.innerHTML = `
            <p><strong>${link.name}</strong></p>
            <p>${link.url}</p>
            <p>${link.description || 'No description available.'}</p>
        `;
        globalHoverMenu.style.display = 'block';
        
        let top = rect.bottom + 5;
        let left = rect.left;
        
        if (top + globalHoverMenu.offsetHeight > window.innerHeight) {
            top = rect.top - globalHoverMenu.offsetHeight - 5;
        }
        if (left + globalHoverMenu.offsetWidth > window.innerWidth) {
            left = window.innerWidth - globalHoverMenu.offsetWidth - 10;
        }

        globalHoverMenu.style.top = `${top}px`;
        globalHoverMenu.style.left = `${left}px`;
      });

      a.addEventListener('mouseleave', () => {
        globalHoverMenu.style.display = 'none';
      });

      linksGrid.appendChild(a);
    });
  }

  categoryList.addEventListener("click", (e) => {
    const categoryItem = e.target.closest(".category-item");
    if (categoryItem) {
      const previouslyActive = document.querySelector(".category-item.active");
      if (previouslyActive) {
        previouslyActive.classList.remove("active");
      }
      categoryItem.classList.add("active");
      renderLinks(categoryItem.dataset.index);
    }
  });

  function checkCategoryOverflow() {
    const containerWidth = categoriesHeader.clientWidth;
    categoriesHeader.classList.remove('icons-only');
    
    const totalWidth = Array.from(categoryList.children).reduce((acc, child) => acc + child.offsetWidth, 0);
    
    if (totalWidth > containerWidth || linkData.length > 7) {
        categoriesHeader.classList.add('icons-only');
    }
  }


  window.addEventListener('resize', () => {
    checkCategoryOverflow();
    const activeCategoryItem = document.querySelector(".category-item.active");
    if (activeCategoryItem) {
      renderLinks(activeCategoryItem.dataset.index);
    }
  });
