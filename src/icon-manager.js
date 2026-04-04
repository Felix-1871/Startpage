import { showSelectionModal } from '../components/modals/modals.js';

let simpleIcons = [];
let simpleIconsPromise = null;
let iconList = [];
let iconListPromise = null;
const iconCache = {};

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

export async function getIconList() {
    if (iconListPromise) return iconListPromise;

    iconListPromise = (async () => {
        try {
            const response = await fetch('./icons.json');
            if (response.ok) {
                iconList = await response.json();
            } else {
                console.warn('icons.json not found, falling back to empty list. Run updateIconList.sh to generate it.');
            }
        } catch (e) {
            console.error('Failed to load icons.json', e);
        }
        return iconList;
    })();
    return iconListPromise;
}

export function getLuminance(hex) {
    const rgb = (hex || '#cccccc').replace('#', '');
    const r = parseInt(rgb.substr(0, 2), 16);
    const g = parseInt(rgb.substr(2, 2), 16);
    const b = parseInt(rgb.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export async function findBestIcon(url, currentIcon = null, currentColor = null) {
    if (currentIcon && !currentIcon.includes('default-link.svg') && currentIcon !== '') {
        return { icon: currentIcon, color: currentColor || '#cccccc' };
    }

    await loadSimpleIcons();
    const currentIconList = await getIconList();

    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
        
        if (iconCache[hostname]) return iconCache[hostname];

        const hostnameWithDot = hostname.replace(/\./g, 'dot');
        const parts = hostname.split('.').filter(p => p !== 'com' && p !== 'org' && p !== 'net' && p !== 'io' && p !== 'pl');
        
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

        // Handle google-like sites (e.g. calendar.google -> googlecalendar)
        if (parts.includes('google')) {
            parts.forEach(p => {
                if (p !== 'google') {
                    exactTerms.add(`google${p}`);
                    exactTerms.add(`${p}google`);
                }
            });
        }

        const exactMatches = [];
        const partialMatches = [];

        // Priority 1: Very exact matches (hostname or hostnamewithdot)
        currentIconList.forEach(iconFile => {
            const iconName = iconFile.toLowerCase().replace('.svg', '');
            if (iconName === hostname || iconName === hostnameWithDot) {
                exactMatches.push(iconFile);
            }
        });

        // Only if no very exact matches, check exactTerms and parts
        if (exactMatches.length === 0) {
            currentIconList.forEach(iconFile => {
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
                if (iconName.length > 3 && hostname.includes(iconName)) {
                    partialMatches.push(iconFile);
                }
            });
        }

        let iconResult = './img/icons/default-link.svg';
        let colorResult = '#cccccc';

        // Use exact matches if they exist, otherwise fallback to partial
        const matchesToConsider = exactMatches.length > 0 ? exactMatches : partialMatches;

        if (matchesToConsider.length === 1) {
            iconResult = `./img/icons/${matchesToConsider[0]}`;
        } else if (matchesToConsider.length > 1) {
            const message = exactMatches.length > 0
                ? `Found multiple relevant icons for "${hostname}". Please select one:`
                : `No exact match for "${hostname}", but found similar icons. Select one:`;
            
            const selected = await showSelectionModal(message, matchesToConsider);
            iconResult = selected ? `./img/icons/${selected}` : './img/icons/default-link.svg';
        }

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
