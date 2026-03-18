export class ModuleSwitcher {
    constructor() {
        this.activeModules = new Set();
    }

    async loadModule(name, path, targetSelector) {
        if (this.activeModules.has(name)) return;

        try {
            // Load CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `${path}/${name}.css`;
            link.id = `style-${name}`;
            document.head.appendChild(link);

            // Load HTML
            const response = await fetch(`${path}/${name}.html`);
            const html = await response.text();
            
            const target = document.querySelector(targetSelector);
            if (target) {
                target.innerHTML = html;
            } else {
                console.warn(`Target container ${targetSelector} not found for module ${name}`);
            }

            // Load JS
            const module = await import(`../${path}/${name}.js`);
            if (module.init) {
                module.init();
            }

            this.activeModules.add(name);
        } catch (error) {
            console.error(`Failed to load module ${name}:`, error);
        }
    }
}
