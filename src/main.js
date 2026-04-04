import { ModuleManager } from './ModuleManager.js';

const manager = new ModuleManager();

async function initApp() {
    
    manager.registerModule('searchbar', 'components/searchbar', 'A search bar with multiple engines support.', ['topmid-target']);
    manager.registerModule('clock-weather', 'components/clock-weather', 'Displays current time and local weather.', ['topright-target']);
    manager.registerModule('anki', 'components/anki', 'Basic Anki review using AnkiConnect.', ['midleft-target']);
    manager.registerModule('anki-xiehanzi', 'components/anki-xiehanzi', 'Chinese character practice and review using Anki.', ['midleft-target']);
    manager.registerModule('todo', 'components/todo', 'Simple todo list manager.', ['midcenterleft-target']);
    manager.registerModule('tabs', 'components/tabs', 'Categorized bookmarks with JSON sync.', ['midcenterright-target']);
    manager.registerModule('lute', 'components/lute', 'Lute reading integration.', ['midright-target']);
    manager.registerModule('bookmarks', 'components/bookmarks', 'A dock for your favorite bookmarks.', ['bottom-target']);
    
    
    
    await manager.loadModule('modals', 'components/modals', '#modal-target');
    
    
    await manager.loadModule('searchbar', 'components/searchbar', '#topmid-target');
    await manager.loadModule('clock-weather', 'components/clock-weather', '#topright-target');
    await manager.loadModule('anki', 'components/anki', '#midleft-target');
    await manager.loadModule('todo', 'components/todo', '#midcenterleft-target');
    await manager.loadModule('tabs', 'components/tabs', '#midcenterright-target');
    await manager.loadModule('lute', 'components/lute', '#midright-target');
    await manager.loadModule('bookmarks', 'components/bookmarks', '#bottom-target');
    await manager.loadModule('context-menu', 'components/context-menu', '#context-menu-target');

    
    await manager.loadCSS('settings', 'components/settings');
    const settingsModule = await import('../components/settings/settings.js');
    if (settingsModule.init) {
        settingsModule.init(manager);
    }
}

initApp();
