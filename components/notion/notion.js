const DEFAULT_PROXY_URL = 'http://localhost:3001';
const DEFAULT_REFRESH_INTERVAL = 3600000;

let notionRoot;
let categoriesEl, pagesListEl, statusDot;
let viewerIframe, viewerEmpty, viewerFallback;
let fallbackTitle, fallbackLink, openTabBtn, refreshBtn;
let pageData = [];
let groupedPages = {};
let activeCategory = 'All';
let activePage = null;
let refreshTimer = null;
let isCompactLayout = false;

function getSettings() {
    return {
        token: localStorage.getItem('notion.token') || '',
        proxyUrl: localStorage.getItem('notion.proxyUrl') || DEFAULT_PROXY_URL,
        autoRefresh: localStorage.getItem('notion.autoRefresh') !== 'false',
        refreshInterval: parseInt(localStorage.getItem('notion.refreshInterval') || String(DEFAULT_REFRESH_INTERVAL), 10),
        expandFullCenter: localStorage.getItem('notion.expandFullCenter') === 'true',
    };
}

function savePagesCache(pages) {
    localStorage.setItem('notionPages', JSON.stringify(pages));
}

function loadPagesCache() {
    try {
        const cached = localStorage.getItem('notionPages');
        return cached ? JSON.parse(cached) : [];
    } catch {
        return [];
    }
}

function extractPageTitle(page) {
    const props = page.properties || {};
    for (const prop of Object.values(props)) {
        if (prop.type === 'title' && prop.title?.length) {
            return prop.title.map(t => t.plain_text).join('');
        }
    }
    return 'Untitled';
}

function extractPageIcon(page) {
    const icon = page.icon;
    if (!icon) return '📄';
    if (icon.type === 'emoji') return icon.emoji;
    if (icon.type === 'external') return `<img src="${icon.external.url}" alt="" width="16" height="16">`;
    if (icon.type === 'file') return `<img src="${icon.file.url}" alt="" width="16" height="16">`;
    return '📄';
}

function getParentKey(page) {
    const parent = page.parent || {};
    if (parent.type === 'database_id') return `db:${parent.database_id}`;
    if (parent.type === 'page_id') return `page:${parent.page_id}`;
    if (parent.type === 'workspace') return 'workspace:root';
    return 'uncategorized';
}

function getParentLabel(key, pageTitleMap) {
    if (key === 'workspace:root') return 'Workspace';
    if (key === 'uncategorized') return 'Uncategorized';
    if (key.startsWith('page:')) {
        const id = key.slice(5);
        return pageTitleMap.get(id) || 'Pages';
    }
    if (key.startsWith('db:')) return 'Database';
    return key;
}

function groupPages(pages) {
    const titleMap = new Map(pages.map(p => [p.id, extractPageTitle(p)]));
    const groups = { All: pages };

    for (const page of pages) {
        const key = getParentKey(page);
        if (!groups[key]) groups[key] = [];
        groups[key].push(page);
    }

    const labels = { All: 'All' };
    for (const key of Object.keys(groups)) {
        if (key !== 'All') labels[key] = getParentLabel(key, titleMap);
    }

    return { groups, labels };
}

async function fetchAllPages() {
    const { token, proxyUrl } = getSettings();
    if (!token) throw new Error('Notion integration token not configured');

    const allResults = [];
    let startCursor = undefined;

    do {
        const body = {
            filter: { property: 'object', value: 'page' },
            page_size: 100,
        };
        if (startCursor) body.start_cursor = startCursor;

        const response = await fetch(`${proxyUrl}/notion/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || err.error || `API error ${response.status}`);
        }

        const data = await response.json();
        const pages = (data.results || []).filter(r => r.object === 'page');
        allResults.push(...pages);
        startCursor = data.has_more ? data.next_cursor : undefined;
    } while (startCursor);

    return allResults;
}

async function checkProxyHealth() {
    const { proxyUrl } = getSettings();
    try {
        const res = await fetch(`${proxyUrl}/health`, { signal: AbortSignal.timeout(3000) });
        return res.ok;
    } catch {
        return false;
    }
}

function setStatus(online) {
    if (!statusDot) return;
    statusDot.classList.toggle('online', online);
    statusDot.classList.toggle('offline', !online);
    statusDot.title = online ? 'Proxy online' : 'Proxy offline — start scripts/notion-proxy.py';
}

function renderCategories() {
    if (!categoriesEl) return;
    categoriesEl.innerHTML = '';

    const keys = Object.keys(groupedPages.groups).sort((a, b) => {
        if (a === 'All') return -1;
        if (b === 'All') return 1;
        return (groupedPages.labels[a] || a).localeCompare(groupedPages.labels[b] || b);
    });

    for (const key of keys) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `notion-category-btn${key === activeCategory ? ' active' : ''}`;
        btn.textContent = groupedPages.labels[key] || key;
        btn.dataset.category = key;
        btn.addEventListener('click', () => {
            activeCategory = key;
            renderCategories();
            renderPages();
        });
        categoriesEl.appendChild(btn);
    }
}

function renderPages() {
    if (!pagesListEl) return;
    pagesListEl.innerHTML = '';

    const pages = groupedPages.groups[activeCategory] || [];
    if (!pages.length) {
        pagesListEl.innerHTML = '<p class="notion-viewer-hint" style="padding:8px">No pages found. Share pages with your integration.</p>';
        return;
    }

    pages.sort((a, b) => extractPageTitle(a).localeCompare(extractPageTitle(b)));

    for (const page of pages) {
        const item = document.createElement('div');
        item.className = `notion-page-item${activePage?.id === page.id ? ' active' : ''}`;
        item.dataset.pageId = page.id;
        item.innerHTML = `
            <span class="notion-page-icon">${extractPageIcon(page)}</span>
            <span class="notion-page-title">${extractPageTitle(page)}</span>
        `;
        item.addEventListener('click', () => selectPage(page));
        pagesListEl.appendChild(item);
    }
}

function showViewerState(state) {
    viewerEmpty?.classList.toggle('hidden', state !== 'empty');
    viewerIframe?.classList.toggle('hidden', state !== 'iframe');
    viewerFallback?.classList.toggle('hidden', state !== 'fallback');
}

function selectPage(page) {
    activePage = page;
    renderPages();

    const title = extractPageTitle(page);
    const url = page.url;
    const publicUrl = page.public_url;

    openTabBtn.disabled = !url;
    openTabBtn.onclick = () => { if (url) window.open(url, '_blank'); };

    if (publicUrl) {
        showViewerState('iframe');
        viewerIframe.src = publicUrl;
        fallbackTitle.textContent = title;
        fallbackLink.href = url || publicUrl;
        return;
    }

    showViewerState('fallback');
    fallbackTitle.textContent = title;
    fallbackLink.href = url || '#';
    viewerIframe.src = 'about:blank';
}

async function refreshPages() {
    setStatus(await checkProxyHealth());

    try {
        pageData = await fetchAllPages();
        savePagesCache(pageData);
        groupedPages = groupPages(pageData);
        renderCategories();
        renderPages();
        setStatus(true);
    } catch (err) {
        console.error('Notion refresh error:', err);
        setStatus(false);

        if (!pageData.length) {
            pageData = loadPagesCache();
            if (pageData.length) {
                groupedPages = groupPages(pageData);
                renderCategories();
                renderPages();
            }
        }
    }
}

function applyLayoutVariant() {
    if (!notionRoot) return;
    const slotId = notionRoot.parentElement?.id;
    isCompactLayout = slotId === 'midcenterleft-target';
    notionRoot.classList.toggle('layout-compact', isCompactLayout);
    applyExpandFullCenter();
}

function applyExpandFullCenter() {
    const glassBox = document.querySelector('.glass-box');
    if (!glassBox) return;

    const { expandFullCenter } = getSettings();
    const slotId = notionRoot?.parentElement?.id;
    const shouldExpand = expandFullCenter && slotId === 'midcenterright-target';
    glassBox.classList.toggle('glass-box-expanded', shouldExpand);
}

export function updateNotionLayout() {
    applyExpandFullCenter();
}

export function init() {
    notionRoot = document.querySelector('.notion-root');
    categoriesEl = document.getElementById('notion-categories');
    pagesListEl = document.getElementById('notion-pages-list');
    statusDot = document.getElementById('notion-status-dot');
    viewerIframe = document.getElementById('notion-viewer-iframe');
    viewerEmpty = document.getElementById('notion-viewer-empty');
    viewerFallback = document.getElementById('notion-viewer-fallback');
    fallbackTitle = document.getElementById('notion-fallback-title');
    fallbackLink = document.getElementById('notion-fallback-link');
    openTabBtn = document.getElementById('notion-open-tab-btn');
    refreshBtn = document.getElementById('notion-refresh-btn');

    applyLayoutVariant();
    showViewerState('empty');

    pageData = loadPagesCache();
    if (pageData.length) {
        groupedPages = groupPages(pageData);
        renderCategories();
        renderPages();
    }

    refreshBtn?.addEventListener('click', refreshPages);
    refreshPages();
    restartRefreshTimer();
}

export function restartRefreshTimer() {
    if (refreshTimer) clearInterval(refreshTimer);
    const { autoRefresh, refreshInterval } = getSettings();
    if (autoRefresh) {
        refreshTimer = setInterval(refreshPages, refreshInterval);
    }
}

export { refreshPages, getSettings };
