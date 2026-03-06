import { findBestIcon } from './tabs.js';

export const bookmarks = [];

const bookmarksList = document.getElementById('bookmarks-list');

function getLuminance(hex) {
    const rgb = (hex || '#cccccc').replace('#', '');
    const r = parseInt(rgb.substr(0, 2), 16);
    const g = parseInt(rgb.substr(2, 2), 16);
    const b = parseInt(rgb.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function saveBookmarks() {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

export function loadBookmarks() {
    const stored = localStorage.getItem('bookmarks');
    if (stored) {
        bookmarks.length = 0;
        JSON.parse(stored).forEach(b => bookmarks.push(b));
    }
}

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

export function renderBookmarks() {
    if (!bookmarksList) return;
    bookmarksList.innerHTML = '';
    
    bookmarks.forEach((b, index) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = b.url;
        a.className = 'bookmark-item';
        a.dataset.index = index;
        a.target = '_blank';
        a.style.backgroundColor = b.color || '#c4a7e7';
        
        const isDark = getLuminance(b.color || '#c4a7e7') < 0.5;
        
        a.innerHTML = `<img src="${b.icon || './img/icons/default-link.svg'}" alt="${b.name}" class="bookmark-icon ${isDark ? 'inverted-icon' : ''}">`;
        
        a.addEventListener('mouseenter', () => {
            const rect = a.getBoundingClientRect();
            globalHoverMenu.innerHTML = `
                <p><strong>${b.name}</strong></p>
                <p>${b.url}</p>
                <p>${b.description || 'No description available.'}</p>
            `;
            globalHoverMenu.style.display = 'block';
            
            let top = rect.top - globalHoverMenu.offsetHeight - 10;
            let left = rect.left + (rect.width / 2) - (globalHoverMenu.offsetWidth / 2);
            
            if (left < 10) left = 10;
            if (left + globalHoverMenu.offsetWidth > window.innerWidth) {
                left = window.innerWidth - globalHoverMenu.offsetWidth - 10;
            }
            if (top < 10) {
                top = rect.bottom + 10;
            }

            globalHoverMenu.style.top = `${top}px`;
            globalHoverMenu.style.left = `${left}px`;
        });

        a.addEventListener('mouseleave', () => {
            globalHoverMenu.style.display = 'none';
        });

        li.appendChild(a);
        bookmarksList.appendChild(li);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadBookmarks();
    renderBookmarks();
});
