import { createLinkElement, setupHoverMenu } from '../../src/link-manager.js';
import { parseStorage } from '../../src/helpers.js';

export const bookmarks = [];

let bookmarksList;
let globalHoverMenu;

export function saveBookmarks() {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

export function loadBookmarks() {
    const stored = parseStorage('bookmarks', null);
    if (stored) {
        bookmarks.length = 0;
        stored.forEach(b => bookmarks.push(b));
    }
}

export function renderBookmarks() {
    if (!bookmarksList) return;
    bookmarksList.innerHTML = '';
    
    bookmarks.forEach((b, index) => {
        const li = document.createElement('li');
        const a = createLinkElement(b, index, 'bookmark', globalHoverMenu);
        li.appendChild(a);
        bookmarksList.appendChild(li);
    });
}

export function init() {
    bookmarksList = document.getElementById('bookmarks-list');
    globalHoverMenu = setupHoverMenu();
    loadBookmarks();
    renderBookmarks();
}
