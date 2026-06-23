export function escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str ?? '';
    return el.innerHTML;
}

export function safeUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href;
        }
    } catch {
        // invalid URL
    }
    return '#';
}
