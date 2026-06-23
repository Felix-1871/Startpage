export function renderWireframe(moduleManager, { wireframeSlots, moduleSelectorPanel, availableModulesList, selectedSlotName, closeModuleSelector, checkTabsVisibility }) {
    function updateWireframe() {
        wireframeSlots.forEach(slot => {
            const slotId = slot.dataset.slot;
            const activeModule = moduleManager.getActiveModuleInSlot(slotId);
            if (activeModule) {
                slot.classList.add('active-module');
                slot.textContent = activeModule.charAt(0).toUpperCase() + activeModule.slice(1);
            } else {
                slot.classList.remove('active-module');
                slot.textContent = slot.getAttribute('title');
            }
        });
    }

    function showModuleSelector(slotId) {
        selectedSlotName.textContent = `Configure Slot: ${slotId}`;
        moduleSelectorPanel.classList.remove('hidden');
        availableModulesList.innerHTML = '';

        const available = moduleManager.getModulesForSlot(slotId);
        const activeInSlot = moduleManager.getActiveModuleInSlot(slotId);

        const noneItem = document.createElement('li');
        noneItem.className = `module-item ${!activeInSlot ? 'active' : ''}`;
        noneItem.innerHTML = `
            <div class="module-info">
                <h5>Empty</h5>
                <p>No module assigned to this slot.</p>
            </div>
        `;
        noneItem.onclick = async () => {
            if (activeInSlot) {
                await moduleManager.unloadModule(activeInSlot);
                updateWireframe();
                checkTabsVisibility();
            }
            moduleSelectorPanel.classList.add('hidden');
        };
        availableModulesList.appendChild(noneItem);

        available.forEach(mod => {
            const isCurrent = activeInSlot === mod.name;
            const li = document.createElement('li');
            li.className = `module-item ${isCurrent ? 'active' : ''}`;
            li.innerHTML = `
                <div class="module-info">
                    <h5>${mod.name.charAt(0).toUpperCase() + mod.name.slice(1)}</h5>
                    <p>${mod.description}</p>
                </div>
                ${isCurrent ? '<span class="status-badge">Active</span>' : ''}
            `;
            li.onclick = async () => {
                if (activeInSlot && activeInSlot !== mod.name) {
                    await moduleManager.unloadModule(activeInSlot);
                }
                if (!isCurrent) {
                    await moduleManager.loadModule(mod.name, mod.path, `#${slotId}`);
                    updateWireframe();
                    checkTabsVisibility();
                }
                moduleSelectorPanel.classList.add('hidden');
            };
            availableModulesList.appendChild(li);
        });
    }

    wireframeSlots.forEach(slot => {
        slot.addEventListener('click', () => {
            showModuleSelector(slot.dataset.slot);
        });
    });

    closeModuleSelector.addEventListener('click', () => {
        moduleSelectorPanel.classList.add('hidden');
    });

    updateWireframe();
}

export function renderClockWeatherSettings(moduleManager) {
    const cityInput = document.getElementById('weather-city-input');
    const cityStatus = document.getElementById('weather-city-status');
    const citySaveBtn = document.getElementById('save-weather-city-btn');
    const unitsSelector = document.getElementById('weather-units-selector');

    const clockFormatSelector = document.getElementById('clock-format-selector');
    const dateFormatSelector = document.getElementById('date-format-selector');
    const clockTimezoneInput = document.getElementById('clock-timezone-input');
    const clockSaveBtn = document.getElementById('save-clock-settings-btn');

    if (!cityInput) return;

    const savedCity = localStorage.getItem('weather.city') || 'Berlin';
    const savedUnits = localStorage.getItem('weather.units') || 'metric';
    const savedClockFormat = localStorage.getItem('clock.format') || 'HH:mm';
    const savedDateFormat = localStorage.getItem('date.format') || 'DD/MM/YY';
    const savedClockTimezone = localStorage.getItem('clock.timezone') || '';

    cityInput.value = savedCity;
    unitsSelector.value = savedUnits;
    clockFormatSelector.value = savedClockFormat;
    dateFormatSelector.value = savedDateFormat;
    clockTimezoneInput.value = savedClockTimezone;

    citySaveBtn.onclick = async () => {
        const city = cityInput.value.trim();
        if (!city) return;

        cityStatus.textContent = 'Searching...';
        cityStatus.style.color = 'var(--iris)';

        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
            if (!geoRes.ok) throw new Error('Geocoding request failed');
            const geoData = await geoRes.json();

            if (geoData.results && geoData.results.length > 0) {
                const result = geoData.results[0];
                localStorage.setItem('weather.city', result.name);
                localStorage.setItem('weather.lat', result.latitude);
                localStorage.setItem('weather.lon', result.longitude);
                localStorage.setItem('weather.timezone', result.timezone);

                cityStatus.textContent = `Saved: ${result.name} (${result.latitude.toFixed(2)}, ${result.longitude.toFixed(2)})`;
                cityStatus.style.color = 'var(--foam)';

                if (moduleManager.activeModules.has('clock-weather')) {
                    import('../clock-weather/clock-weather.js').then(m => m.init());
                }
            } else {
                cityStatus.textContent = 'City not found.';
                cityStatus.style.color = 'var(--love)';
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            cityStatus.textContent = 'Error searching city.';
            cityStatus.style.color = 'var(--love)';
        }
    };

    unitsSelector.onchange = () => {
        localStorage.setItem('weather.units', unitsSelector.value);
        if (moduleManager.activeModules.has('clock-weather')) {
            import('../clock-weather/clock-weather.js').then(m => m.init());
        }
    };

    clockSaveBtn.onclick = () => {
        localStorage.setItem('clock.format', clockFormatSelector.value);
        localStorage.setItem('date.format', dateFormatSelector.value);
        localStorage.setItem('clock.timezone', clockTimezoneInput.value.trim());

        if (moduleManager.activeModules.has('clock-weather')) {
            import('../clock-weather/clock-weather.js').then(m => m.init());
        }
    };
}
