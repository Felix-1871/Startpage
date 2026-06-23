export const defaultSearchEngines = {
    'General': [
        { value: 'ecosia', label: 'Ecosia', url: 'https://www.ecosia.org/search?q=', icon: 'ecosia.svg' },
        { value: 'google', label: 'Google', url: 'https://www.google.com/search?q=', icon: 'google.svg' },
        { value: 'duckduckgo', label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', icon: 'duckduckgo.svg' },
    ],
    'Dev': [
        { value: 'arch_wiki', label: 'Arch', url: 'https://wiki.archlinux.org/index.php?title=Special%253ASearch&fulltext=1&search=', icon: 'archlinux.svg' },
        { value: 'github', label: 'GitHub', url: 'https://github.com/search?q=', icon: 'github.svg' },
        { value: 'stackoverflow', label: 'Stack Overflow', url: 'https://stackoverflow.com/search?q=', icon: 'stackoverflow.svg' },
        { value: 'aur', label: 'AUR', url: 'https://aur.archlinux.org/packages?O=0&K=', icon: 'archlinux.svg' },
    ],
    'Media': [
        { value: 'yt', label: 'Youtube', url: 'https://www.youtube.com/results?search_query=', icon: 'youtube.svg' },
        { value: 'twitch', label: 'Twitch', url: 'https://www.twitch.tv/search?term=', icon: 'twitch.svg' },
        { value: 'reddit', label: 'Reddit', url: 'https://www.reddit.com/search/?q=', icon: 'reddit.svg' },
    ],
    'Social': [
        { value: 'discord_webhook', label: 'Discord', url: '', icon: 'discord.svg', isWebhook: true },
    ]
};

export const defaultContextMenuConfig = {
    'global': [
        { title: 'System Actions', items: [
            { id: 'settings', label: 'Settings', enabled: true },
            { id: 'update-anki', label: 'Update Anki', enabled: true },
            { id: 'update-lute', label: 'Update Lute', enabled: true }
        ]},
        { title: 'Sync Actions', items: [
            { id: 'full-sync', label: 'Full Sync', enabled: true },
            { id: 'interactive-sync', label: 'Interactive Sync', enabled: true }
        ]},
        { title: 'Add Actions', items: [
            { id: 'add-category', label: 'Add New Category', enabled: true },
            { id: 'add-link', label: 'Add New Link', enabled: true },
            { id: 'add-bookmark', label: 'Add New Bookmark', enabled: true }
        ]}
    ],
    'category': [
        { title: 'Category Actions', items: [
            { id: 'edit-category', label: 'Edit Category', enabled: true },
            { id: 'remove-category', label: 'Remove Category', enabled: true }
        ]}
    ],
    'link': [
        { title: 'Link Actions', items: [
            { id: 'edit-link', label: 'Edit Link', enabled: true },
            { id: 'remove-link', label: 'Remove Link', enabled: true }
        ]}
    ],
    'bookmark': [
        { title: 'Bookmark Actions', items: [
            { id: 'edit-bookmark', label: 'Edit Bookmark', enabled: true },
            { id: 'remove-bookmark', label: 'Remove Bookmark', enabled: true }
        ]}
    ]
};

export const ANKI_DECK_KEYS = {
    'anki': 'anki-basic.selectedDeck',
    'anki-xiehanzi': 'anki-xiehanzi.selectedDeck',
};

export function getAnkiDeckStorageKey(moduleName) {
    return ANKI_DECK_KEYS[moduleName] || 'anki-basic.selectedDeck';
}
