import { ModuleSwitcher } from './ModuleSwitcher.js';

const switcher = new ModuleSwitcher();

async function initApp() {
    // Load components
    // Modals first as others might depend on it (though usually they import it)
    await switcher.loadModule('modals', 'components/modals', '#modal-target');
    
    // Core layout modules
    await switcher.loadModule('searchbar', 'components/searchbar', '#searchbar-target');
    await switcher.loadModule('clock-weather', 'components/clock-weather', '#clock-weather-target');
    await switcher.loadModule('todo', 'components/todo', '#todo-target');
    await switcher.loadModule('tabs', 'components/tabs', '#tabs-target');
    await switcher.loadModule('anki', 'components/anki', '#anki-target');
    await switcher.loadModule('lute', 'components/lute', '#lute-target');
    await switcher.loadModule('bookmarks', 'components/bookmarks', '#bookmarks-target');
    await switcher.loadModule('context-menu', 'components/context-menu', '#context-menu-target');
}

initApp();
