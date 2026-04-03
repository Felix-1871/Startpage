export class ModuleManager {
    constructor() {
        this.activeModules = new Map(); 
        this.registry = []; 
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
            
            
            return;
        }

        try {
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `${path}/${name}.css`;
            link.id = `style-${name}`;
            document.head.appendChild(link);

            
            const response = await fetch(`${path}/${name}.html`);
            const html = await response.text();
            
            const target = document.querySelector(targetSelector);
            if (target) {
                target.innerHTML = html;
            } else {
                console.warn(`Target container ${targetSelector} not found for module ${name}`);
            }

            
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

        
        const link = document.getElementById(`style-${name}`);
        if (link) link.remove();

        
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
