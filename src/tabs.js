import { iconList } from './iconList.js';
import { showSelectionModal } from './modals.js';

export const linkData = [
   
  ];

  const categoryList = document.getElementById("category-list");
  const linksGrid = document.getElementById("links-grid");
  const categoriesHeader = document.querySelector('.categories-header');

  const iconCache = {};
  let simpleIcons = [];
  let simpleIconsPromise = null;

  async function loadSimpleIcons() {
    if (simpleIconsPromise) return simpleIconsPromise;
    
    simpleIconsPromise = (async () => {
        try {
            const response = await fetch('./img/simple-icons.json');
            if (response.ok) {
                simpleIcons = await response.json();
            }
        } catch (e) {
            console.error('Failed to load simple-icons.json', e);
        }
    })();
    return simpleIconsPromise;
  }

  loadSimpleIcons();

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

  export async function findBestIcon(url, currentIcon = null, currentColor = null) {
    // If we already have a non-default icon, keep it
    if (currentIcon && !currentIcon.includes('default-link.svg') && currentIcon !== '') {
        return { icon: currentIcon, color: currentColor || '#cccccc' };
    }

    await loadSimpleIcons();

    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
        
        if (iconCache[hostname]) return iconCache[hostname];

        const hostnameWithDot = hostname.replace(/\./g, 'dot');
        const parts = hostname.split('.').filter(p => p !== 'com' && p !== 'org' && p !== 'net' && p !== 'io' && p !== 'pl');
        
        // Exact candidates
        const exactTerms = new Set([
            hostname,
            hostnameWithDot,
            ...parts,
            hostname.replace(/\.[^.]+$/, '').replace(/\./g, 'dot'),
            hostname.replace(/\.[^.]+$/, '')
        ]);

        if (hostname.includes('mail.google')) exactTerms.add('gmail');
        if (hostname.includes('store.ubi')) exactTerms.add('ubisoft');
        if (hostname.includes('blizzard')) exactTerms.add('battledotnet');
        const exactMatches = [];
        const partialMatches = [];

        iconList.forEach(iconFile => {
            const iconName = iconFile.toLowerCase().replace('.svg', '');
            if (exactTerms.has(iconName)) {
                exactMatches.push(iconFile);
                return;
            }
            const matchingParts = parts.filter(p => p.length > 2 && iconName.includes(p));
            if (matchingParts.length >= 2) {
                exactMatches.push(iconFile);
                return;
            }
            if (iconName.length > 3 && (hostname.includes(iconName) || hostnameWithDot.includes(iconName))) {
                partialMatches.push(iconFile);
            }
        });

        let iconResult = './img/icons/default-link.svg';
        let colorResult = '#cccccc';

        if (exactMatches.length === 1 && partialMatches.length === 0) {
            iconResult = `./img/icons/${exactMatches[0]}`;
        } else {
            const allMatches = [...new Set([...exactMatches, ...partialMatches])];
            if (allMatches.length === 1) {
                iconResult = `./img/icons/${allMatches[0]}`;
            } else if (allMatches.length > 1) {
                const message = exactMatches.length > 0
                    ? `Found multiple relevant icons for "${hostname}". Please select one:`
                    : `No exact match for "${hostname}", but found similar icons. Select one:`;
                
                const selected = await showSelectionModal(message, allMatches);
                iconResult = selected ? `./img/icons/${selected}` : './img/icons/default-link.svg';
            }
        }

        // Try to find color based on the resolved icon
        const finalIconSlug = iconResult.split('/').pop().replace('.svg', '');
        const colorMatch = simpleIcons.find(brand => {
            const brandTitle = brand.title.toLowerCase();
            const brandSlug = brandTitle.replace(/[^a-z0-9]/g, '');
            return brandSlug === finalIconSlug || brandTitle.replace(/\s+/g, '') === finalIconSlug;
        });
        
        if (colorMatch) colorResult = `#${colorMatch.hex}`;

        const result = { icon: iconResult, color: colorResult };
        iconCache[hostname] = result;
        return result;
    } catch (e) {
        console.error('Error finding best icon:', e);
    }
    return { icon: './img/icons/default-link.svg', color: '#cccccc' };
  }

  function getLuminance(hex) {
    const rgb = (hex || '#cccccc').replace('#', '');
    const r = parseInt(rgb.substr(0, 2), 16);
    const g = parseInt(rgb.substr(2, 2), 16);
    const b = parseInt(rgb.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  export async function fetchExternalLinks() {
    const response = await fetch('tabs.json');
    if (!response.ok) throw new Error('Failed to fetch tabs.json');
    return await response.json();
  }

  export async function syncLinksOverwrite() {
    try {
        const externalLinks = await fetchExternalLinks();
        linkData.length = 0;
        
        const grouped = {};
        for (const item of externalLinks) {
            if (!grouped[item.group_title]) {
                grouped[item.group_title] = {
                    category: item.group_title,
                    icon: './img/icons/default-category.svg',
                    links: []
                };
            }
            const { icon, color } = await findBestIcon(item.tab_url);
            grouped[item.group_title].links.push({
                name: item.tab_title,
                url: item.tab_url,
                icon: icon,
                color: color,
                description: ''
            });
        }

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

  export async function applyChange(change, action) {
    if (action === 'reject') return;

    if (change.type === 'new' || (change.type === 'updated' && action === 'keep-both')) {
        const item = change.newData || change.data;
        let category = linkData.find(c => c.category === item.group_title);
        if (!category) {
            category = { category: item.group_title, icon: './img/icons/default-category.svg', links: [] };
            linkData.push(category);
        }
        const { icon, color } = await findBestIcon(item.tab_url);
        category.links.push({
            name: item.tab_title,
            url: item.tab_url,
            icon: icon,
            color: color,
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

        for (const item of externalLinks) {
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
                const { icon, color } = await findBestIcon(tab_url);
                category.links.push({
                    name: tab_title,
                    url: tab_url,
                    icon: icon,
                    color: color,
                    description: ''
                });
            } else {
                link.name = tab_title;
                // For legacy links that don't have icon/color yet
                if (!link.icon || link.icon.includes('default-link.svg')) {
                    const { icon, color } = await findBestIcon(tab_url);
                    link.icon = icon;
                    if (!link.color || link.color === '#cccccc') link.color = color;
                }
            }
        }

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
      
      const brandColor = link.color || '#cccccc';
      const isDark = getLuminance(brandColor) < 0.5;
      
      a.innerHTML = `
        <div class="icon-container" style="background-color: ${brandColor};">
            <img src="${link.icon || './img/icons/default-link.svg'}" alt="${link.name}" class="link-icon ${isDark ? 'inverted-icon' : ''}">
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
