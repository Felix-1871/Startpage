import { ModuleManager } from './ModuleManager.js';

const manager = new ModuleManager();

async function initApp() {
    // Register modules
    manager.registerModule('searchbar', 'components/searchbar', 'A search bar with multiple engines support.', ['topmid-target']);
    manager.registerModule('clock-weather', 'components/clock-weather', 'Displays current time and local weather.', ['topright-target']);
    manager.registerModule('anki', 'components/anki', 'Chinese character practice and review using Anki.', ['midleft-target']);
    manager.registerModule('todo', 'components/todo', 'Simple todo list manager.', ['midcenterleft-target']);
    manager.registerModule('tabs', 'components/tabs', 'Categorized bookmarks with JSON sync.', ['midcenterright-target']);
    manager.registerModule('lute', 'components/lute', 'Lute reading integration.', ['midright-target']);
    manager.registerModule('bookmarks', 'components/bookmarks', 'A dock for your favorite bookmarks.', ['bottom-target']);
    
    // Load components
    // Modals first as others might depend on it
    await manager.loadModule('modals', 'components/modals', '#modal-target');
    
    // Core layout modules (default load)
    await manager.loadModule('searchbar', 'components/searchbar', '#topmid-target');
    await manager.loadModule('clock-weather', 'components/clock-weather', '#topright-target');
    await manager.loadModule('anki', 'components/anki', '#midleft-target');
    await manager.loadModule('todo', 'components/todo', '#midcenterleft-target');
    await manager.loadModule('tabs', 'components/tabs', '#midcenterright-target');
    await manager.loadModule('lute', 'components/lute', '#midright-target');
    await manager.loadModule('bookmarks', 'components/bookmarks', '#bottom-target');
    await manager.loadModule('context-menu', 'components/context-menu', '#context-menu-target');

    // Initialize settings (load CSS and JS only, HTML is loaded on demand)
    await manager.loadCSS('settings', 'components/settings');
    const settingsModule = await import('../components/settings/settings.js');
    if (settingsModule.init) {
        settingsModule.init(manager);
    }
}

initApp();
