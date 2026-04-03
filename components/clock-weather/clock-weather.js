let timeInterval;
let weatherInterval;

export function init() {
    const currentTimeElement = document.getElementById('current-time');
    const currentWeatherElement = document.getElementById('current-weather');

    if (timeInterval) clearInterval(timeInterval);
    if (weatherInterval) clearInterval(weatherInterval);

    function updateTime() {
        const timeFormat = localStorage.getItem('clock.format') || 'HH:mm';
        const dateFormat = localStorage.getItem('date.format') || 'DD/MM/YY';
        const timezone = localStorage.getItem('clock.timezone') || undefined;
        const now = new Date();
        
        try {
            const timeOptions = {
                hour: '2-digit',
                minute: '2-digit',
                second: timeFormat.includes('ss') ? '2-digit' : undefined,
                hour12: timeFormat.includes('A'),
                timeZone: timezone || undefined 
            };
            
            const timeFormatter = new Intl.DateTimeFormat('en-GB', timeOptions);
            const formattedTime = timeFormatter.format(now);

            let formattedDate = '';
            const dateOptions = { timeZone: timezone || undefined };

            if (dateFormat === 'MMM D, YYYY') {
                dateOptions.month = 'short';
                dateOptions.day = 'numeric';
                dateOptions.year = 'numeric';
                formattedDate = new Intl.DateTimeFormat('en-US', dateOptions).format(now);
            } else {
                dateOptions.day = '2-digit';
                dateOptions.month = '2-digit';
                dateOptions.year = '2-digit';
                
                const d = new Intl.DateTimeFormat('en-GB', dateOptions).formatToParts(now);
                const part = (type) => d.find(p => p.type === type).value;
                
                if (dateFormat === 'MM/DD/YY') {
                    formattedDate = `${part('month')}/${part('day')}/${part('year')}`;
                } else if (dateFormat === 'YY-MM-DD') {
                    formattedDate = `${part('year')}-${part('month')}-${part('day')}`;
                } else if (dateFormat === 'DD.MM.YYYY') {
                    dateOptions.year = 'numeric';
                    const dLong = new Intl.DateTimeFormat('en-GB', dateOptions).formatToParts(now);
                    const partLong = (type) => dLong.find(p => p.type === type).value;
                    formattedDate = `${partLong('day')}.${partLong('month')}.${partLong('year')}`;
                } else {
                    
                    formattedDate = `${part('day')}/${part('month')}/${part('year')}`;
                }
            }

            if (currentTimeElement) {
                currentTimeElement.textContent = `${formattedTime} ${formattedDate}`;
            }
        } catch (e) {
            console.error('Time format error:', e);
            if (currentTimeElement) currentTimeElement.textContent = now.toLocaleString();
        }
    }

    async function fetchWeather() {
        if (!currentWeatherElement) {
            console.error('Weather element not found');
            return;
        }

        const lat = localStorage.getItem('weather.lat') || '52.52';
        const lon = localStorage.getItem('weather.lon') || '13.41';
        const units = localStorage.getItem('weather.units') || 'metric';
        const timezone = localStorage.getItem('weather.timezone') || 'auto';

        const tempUnit = units === 'imperial' ? 'fahrenheit' : 'celsius';
        const windUnit = units === 'imperial' ? 'mph' : 'ms';

        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=${tempUnit}&windspeed_unit=${windUnit}&timezone=${timezone}`);
            if (!response.ok) {
                throw new Error(`Weather API error: ${response.statusText}`);
            }
            const data = await response.json();
            const current = data.current_weather;

            const temperature = Math.round(current.temperature);
            const weatherCode = current.weathercode;
            const unitSymbol = tempUnit === 'celsius' ? '°C' : '°F';
            
            const weatherIcons = {
                0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
                45: '🌫️', 48: '🌫️',
                51: '🌧️', 53: '🌧️', 55: '🌧️',
                61: '🌧️', 63: '🌧️', 65: '🌧️',
                71: '❄️', 73: '❄️', 75: '❄️', 77: '❄️',
                80: '🌧️', 81: '🌧️', 82: '🌧️',
                85: '❄️', 86: '❄️',
                95: '⛈️', 96: '⛈️', 99: '⛈️'
            };

            const icon = weatherIcons[weatherCode] || '🌡️';
            currentWeatherElement.innerHTML = `${temperature}${unitSymbol} <span style="font-size: 1.2em;">${icon}</span>`;
        } catch (error) {
            console.error('Failed to fetch weather data:', error);
            currentWeatherElement.textContent = 'Weather: Error';
        }
    }

    const timeFormat = localStorage.getItem('clock.format') || 'HH:mm';
    const timeStep = timeFormat.includes('ss') ? 1000 : 60000;
    
    timeInterval = setInterval(updateTime, timeStep);
    updateTime(); 

    weatherInterval = setInterval(fetchWeather, 3600000);
    fetchWeather(); 
}
