import { parseStorage } from '../../src/helpers.js';

export function applyTheme() {
    const bg = localStorage.getItem('theme.backgroundImage');
    if (bg) {
        document.body.style.backgroundImage = bg === 'none' ? 'none' : `url('${bg}')`;
    }

    const colors = parseStorage('theme.colors', {});
    for (const [varName, value] of Object.entries(colors)) {
        document.documentElement.style.setProperty(varName, value);
    }
}

export function renderThemingSettings() {
    const bgInput = document.getElementById('bg-image-input');
    const bgSaveBtn = document.getElementById('save-bg-btn');
    const colorsContainer = document.getElementById('theme-colors-container');
    const resetBtn = document.getElementById('reset-colors-btn');

    if (!bgInput) return;

    bgInput.value = localStorage.getItem('theme.backgroundImage') || './img/river.jpg';

    bgSaveBtn.onclick = () => {
        const val = bgInput.value.trim();
        localStorage.setItem('theme.backgroundImage', val);
        applyTheme();
    };

    const colorVars = [
        { var: '--base', label: 'Base' },
        { var: '--surface', label: 'Surface' },
        { var: '--overlay', label: 'Overlay' },
        { var: '--text', label: 'Text' },
        { var: '--love', label: 'Love (Accent)' },
        { var: '--gold', label: 'Gold (Accent)' },
        { var: '--rose', label: 'Rose (Accent)' },
        { var: '--pine', label: 'Pine (Accent)' },
        { var: '--foam', label: 'Foam (Accent)' },
        { var: '--iris', label: 'Iris (Accent)' },
        { var: '--accent', label: 'Custom Accent' }
    ];

    colorsContainer.innerHTML = '';
    const currentColors = parseStorage('theme.colors', {});

    colorVars.forEach(c => {
        const div = document.createElement('div');
        div.className = 'settings-field';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.marginBottom = '8px';

        const label = document.createElement('label');
        label.textContent = c.label;
        div.appendChild(label);

        const input = document.createElement('input');
        input.type = 'color';
        input.className = 'anki-input';
        input.style.width = '50px';
        input.style.padding = '0';
        input.style.border = 'none';

        const computed = getComputedStyle(document.documentElement).getPropertyValue(c.var).trim();
        input.value = currentColors[c.var] || (computed.startsWith('#') ? computed : '#000000');

        input.onchange = () => {
            currentColors[c.var] = input.value;
            localStorage.setItem('theme.colors', JSON.stringify(currentColors));
            applyTheme();
        };

        div.appendChild(input);
        colorsContainer.appendChild(div);
    });

    resetBtn.onclick = () => {
        localStorage.removeItem('theme.colors');
        localStorage.removeItem('theme.backgroundImage');
        applyTheme();
        renderThemingSettings();
    };
}
