import { findBestIcon } from '../../src/icon-manager.js';
import { createLinkElement, setupHoverMenu } from '../../src/link-manager.js';
import { escapeHtml } from '../../src/dom-utils.js';

export const linkData = [];

let categoryList, linksGrid, categoriesHeader;
let globalHoverMenu, globalCategoryHoverMenu;

export async function fetchExternalLinks() {
    const response = await fetch('tabs.json');
    if (!response.ok) throw new Error('Failed to fetch tabs.json');
    return await response.json();
}

async function resolveIconsForLinks(items, getUrl) {
    const urls = [...new Set(items.map(getUrl))];
    const iconResults = await Promise.all(urls.map(url => findBestIcon(url)));
    const iconMap = new Map(urls.map((url, i) => [url, iconResults[i]]));
    return iconMap;
}

export async function syncLinksOverwrite() {
    try {
        const externalLinks = await fetchExternalLinks();
        linkData.length = 0;

        const iconMap = await resolveIconsForLinks(externalLinks, item => item.tab_url);

        const grouped = {};
        for (const item of externalLinks) {
            if (!grouped[item.group_title]) {
                grouped[item.group_title] = {
                    category: item.group_title,
                    icon: './img/icons/default-category.svg',
                    links: []
                };
            }
            const { icon, color } = iconMap.get(item.tab_url);
            grouped[item.group_title].links.push({
                name: item.tab_title,
                url: item.tab_url,
                icon,
                color,
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
            icon,
            color,
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
        const newLinks = externalLinks.filter(item => {
            return !linkData.some(cat => cat.links.some(l => l.url === item.tab_url));
        });

        const iconMap = newLinks.length > 0
            ? await resolveIconsForLinks(newLinks, item => item.tab_url)
            : new Map();

        for (const item of externalLinks) {
            const { group_title, tab_title, tab_url } = item;

            let category = linkData.find(c => c.category === group_title);
            if (!category) {
                category = {
                    category: group_title,
                    icon: './img/icons/default-category.svg',
                    links: []
                };
                linkData.push(category);
            }

            let link = null;
            for (const cat of linkData) {
                link = cat.links.find(l => l.url === tab_url);
                if (link) break;
            }

            if (!link) {
                const { icon, color } = iconMap.get(tab_url) || await findBestIcon(tab_url);
                category.links.push({
                    name: tab_title,
                    url: tab_url,
                    icon,
                    color,
                    description: ''
                });
            } else if (link.name !== tab_title) {
                link.name = tab_title;
            }
        }

        return true;
    } catch (error) {
        console.error('Sync error:', error);
        return false;
    }
}

export function renderCategories(activeIndex = 0) {
    if (!categoryList) return;
    categoryList.innerHTML = '';
    linkData.forEach((category, index) => {
        const li = document.createElement('li');
        li.className = 'category-item';
        if (index === parseInt(activeIndex)) {
            li.classList.add('active');
        }
        li.dataset.index = index;
        li.innerHTML = `<img src="${escapeHtml(category.icon)}" alt="${escapeHtml(category.category)}" class="category-icon"> <span class="category-text">${escapeHtml(category.category)}</span>`;
        categoryList.appendChild(li);

        li.addEventListener('mouseenter', () => {
            if (categoriesHeader.classList.contains('icons-only')) {
                const rect = li.getBoundingClientRect();
                globalCategoryHoverMenu.textContent = category.category;
                globalCategoryHoverMenu.style.display = 'block';

                const top = rect.top - globalCategoryHoverMenu.offsetHeight - 5;
                const left = rect.left + (rect.width / 2) - (globalCategoryHoverMenu.offsetWidth / 2);

                globalCategoryHoverMenu.style.top = `${top}px`;
                globalCategoryHoverMenu.style.left = `${left}px`;
            }
        });
        li.addEventListener('mouseleave', () => {
            globalCategoryHoverMenu.style.display = 'none';
        });
    });
    checkCategoryOverflow();
}

export function renderLinks(categoryIndex) {
    if (!linksGrid) return;
    const category = linkData[categoryIndex];
    linksGrid.innerHTML = '';
    if (!category) return;
    category.links.forEach((link, subIndex) => {
        const a = createLinkElement(link, subIndex, 'tab', globalHoverMenu);
        linksGrid.appendChild(a);
    });
}

function checkCategoryOverflow() {
    if (!categoriesHeader || !categoryList) return;
    const containerWidth = categoriesHeader.clientWidth;
    categoriesHeader.classList.remove('icons-only');

    const totalWidth = Array.from(categoryList.children).reduce((acc, child) => acc + child.offsetWidth, 0);

    if (totalWidth > containerWidth || linkData.length > 7) {
        categoriesHeader.classList.add('icons-only');
    }
}

export function init() {
    categoryList = document.getElementById('category-list');
    linksGrid = document.getElementById('links-grid');
    categoriesHeader = document.querySelector('.categories-header');

    globalHoverMenu = setupHoverMenu();

    globalCategoryHoverMenu = document.getElementById('global-category-hover-menu');
    if (!globalCategoryHoverMenu) {
        globalCategoryHoverMenu = document.createElement('div');
        globalCategoryHoverMenu.id = 'global-category-hover-menu';
        globalCategoryHoverMenu.className = 'category-hover-menu';
        globalCategoryHoverMenu.style.position = 'fixed';
        globalCategoryHoverMenu.style.display = 'none';
        globalCategoryHoverMenu.style.zIndex = '1000000';
        document.body.appendChild(globalCategoryHoverMenu);
    }

    if (categoryList) {
        categoryList.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                categoryList.scrollLeft += e.deltaY;
            }
        });

        categoryList.addEventListener('click', (e) => {
            const categoryItem = e.target.closest('.category-item');
            if (categoryItem) {
                const previouslyActive = document.querySelector('.category-item.active');
                if (previouslyActive) {
                    previouslyActive.classList.remove('active');
                }
                categoryItem.classList.add('active');
                renderLinks(categoryItem.dataset.index);
            }
        });
    }

    window.addEventListener('resize', () => {
        checkCategoryOverflow();
        const activeCategoryItem = document.querySelector('.category-item.active');
        if (activeCategoryItem) {
            renderLinks(activeCategoryItem.dataset.index);
        }
    });

    if (linkData.length > 0) {
        renderCategories();
        renderLinks(0);
    }
}
