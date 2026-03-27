export class ModuleManager {
    constructor() {
        this.activeModules = new Map(); // name -> { path, targetSelector }
        this.registry = []; // Array of { name, path, description, slots }
    }

    registerModule(name, path, description, slots) {
        this.registry.push({ name, path, description, slots });
    }

    async loadCSS(name, path) {
        if (document.getElementById(`style-${name}`)) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${path}/${name}.css`;
        link.id = `style-${name}`;
        document.head.appendChild(link);
    }

    async loadModule(name, path, targetSelector) {
        if (this.activeModules.has(name)) {
            // If already loaded but in a different slot, we might want to move it?
            // For now, just return if already active.
            return;
        }

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

            this.activeModules.set(name, { path, targetSelector });
        } catch (error) {
            console.error(`Failed to load module ${name}:`, error);
        }
    }

    async unloadModule(name) {
        const info = this.activeModules.get(name);
        if (!info) return;

        // Remove CSS
        const link = document.getElementById(`style-${name}`);
        if (link) link.remove();

        // Clear HTML
        const target = document.querySelector(info.targetSelector);
        if (target) target.innerHTML = '';

        this.activeModules.delete(name);
    }

    getModulesForSlot(slot) {
        return this.registry.filter(m => m.slots.includes(slot));
    }

    getActiveModuleInSlot(slot) {
        for (const [name, info] of this.activeModules) {
            if (info.targetSelector === (slot.startsWith('#') ? slot : `#${slot}`)) {
                return name;
            }
        }
        return null;
    }
}
