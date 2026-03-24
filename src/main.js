import { ModuleManager } from './ModuleManager.js';

const manager = new ModuleManager();

async function initApp() {
    // Load components
    // Modals first as others might depend on it (though usually they import it)
    await manager.loadModule('modals', 'components/modals', '#modal-target');
    
    // Core layout modules
    await manager.loadModule('searchbar', 'components/searchbar', '#topmid-target');
    await manager.loadModule('clock-weather', 'components/clock-weather', '#topright-target');
    await manager.loadModule('todo', 'components/todo', '#midcenterleft-target');
    await manager.loadModule('tabs', 'components/tabs', '#midcenterright-target');
    await manager.loadModule('anki', 'components/anki', '#midleft-target');
    await manager.loadModule('lute', 'components/lute', '#midright-target');
    await manager.loadModule('bookmarks', 'components/bookmarks', '#bottom-target');
    await manager.loadModule('context-menu', 'components/context-menu', '#context-menu-target');
}

initApp();
