import { getLuminance, findBestIcon } from './icon-manager.js';
import { openModal } from '../components/modals/modals.js';

export function handleLinkHover(e, link, hoverMenu, position = 'bottom') {
    if (!hoverMenu) return;

    hoverMenu.innerHTML = `
        <p><strong>${link.name}</strong></p>
        <p>${link.url}</p>
        <p>${link.description || ''}</p>
    `;
    hoverMenu.style.display = 'block';

    const rect = e.currentTarget.getBoundingClientRect();
    let top, left;

    if (position === 'bottom') {
        top = rect.bottom + 5;
        left = rect.left;

        if (top + hoverMenu.offsetHeight > window.innerHeight) {
            top = rect.top - hoverMenu.offsetHeight - 5;
        }
    } else {
        // Position 'top' for bookmarks dock
        top = rect.top - hoverMenu.offsetHeight - 10;
        left = rect.left + (rect.width / 2) - (hoverMenu.offsetWidth / 2);

        if (top < 10) {
            top = rect.bottom + 10;
        }
    }

    if (left < 10) left = 10;
    if (left + hoverMenu.offsetWidth > window.innerWidth) {
        left = window.innerWidth - hoverMenu.offsetWidth - 10;
    }

    hoverMenu.style.top = `${top}px`;
    hoverMenu.style.left = `${left}px`;
}

export function createLinkElement(link, index, type, hoverMenu) {
    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';

    const brandColor = link.color || (type === 'tab' ? '#cccccc' : '#c4a7e7');
    const isDark = getLuminance(brandColor) < 0.5;

    if (type === 'tab') {
        a.className = 'glass-link';
        a.dataset.subindex = index;
        a.innerHTML = `
            <div class="icon-container" style="background-color: ${brandColor};">
                <img src="${link.icon || './img/icons/default-link.svg'}" alt="${link.name}" class="link-icon ${isDark ? 'inverted-icon' : ''}">
            </div>
            <span>${link.name}</span>
        `;
    } else {
        a.className = 'bookmark-item';
        a.dataset.index = index;
        a.style.backgroundColor = brandColor;
        a.innerHTML = `
            <img src="${link.icon || './img/icons/default-link.svg'}" alt="${link.name}" class="bookmark-icon ${isDark ? 'inverted-icon' : ''}">
        `;
    }

    a.addEventListener('mouseenter', (e) => handleLinkHover(e, link, hoverMenu, type === 'tab' ? 'bottom' : 'top'));
    a.addEventListener('mouseleave', () => {
        if (hoverMenu) hoverMenu.style.display = 'none';
    });

    return a;
}

export function setupHoverMenu() {
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
    return globalHoverMenu;
}

export function openLinkModal(title, currentValues = {}, callback) {
    const defaultColor = currentValues.type === 'bookmark' ? '#c4a7e7' : '#cccccc';
    
    openModal(title, [
        { name: 'name', label: 'Name', type: 'text' },
        { name: 'url', label: 'URL', type: 'text' },
        { name: 'icon', label: 'Icon', type: 'select-icon' },
        { name: 'color', label: 'Brand Color', type: 'color' },
        { name: 'description', label: 'Description', type: 'textarea' },
    ], { 
        name: currentValues.name || '', 
        url: currentValues.url || '', 
        icon: currentValues.icon || '', 
        color: currentValues.color || defaultColor, 
        description: currentValues.description || '' 
    }, async (data) => {
        let finalIcon = data.icon;
        let finalColor = data.color;
        
        if (!finalIcon) {
            const best = await findBestIcon(data.url);
            finalIcon = best.icon;
            if (finalColor === defaultColor) finalColor = best.color;
        }
        
        callback({ ...data, icon: finalIcon || './img/icons/default-link.svg', color: finalColor });
    });
}
