
import { OPENWEATHER_API_KEY } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const currentTimeElement = document.getElementById('current-time');
    const currentWeatherElement = document.getElementById('current-weather');

    function updateTime() {
        const now = new Date();
        
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            timeZone: 'Europe/Berlin' 
        };
        const formattedDateTime = new Intl.DateTimeFormat('en-GB', options).format(now); 
        const [datePart, timePart] = formattedDateTime.split(', '); 
        const [day, month, year] = datePart.split('/');
        const formattedDate = `${day}/${month}/${year}`; 

        if (currentTimeElement) {
            currentTimeElement.textContent = `${timePart} ${formattedDate}`;
        }
    }

    const WEATHER_CITY = 'Gdansk';
    const WEATHER_UNITS = 'metric'; 

    async function fetchWeather() {
        if (!currentWeatherElement) {
            console.error('Weather element not found');
            return;
        }

        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${WEATHER_CITY}&units=${WEATHER_UNITS}&appid=${OPENWEATHER_API_KEY}`);
            if (!response.ok) {
                throw new Error(`Weather API error: ${response.statusText}`);
            }
            const data = await response.json();

            const temperature = Math.round(data.main.temp);
            const iconCode = data.weather[0].icon;
            const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
            currentWeatherElement.innerHTML = `${temperature}°C <img src="${iconUrl}" alt="Weather icon"> `;
        } catch (error) {
            console.error('Failed to fetch weather data:', error);
            currentWeatherElement.textContent = 'Weather: Error';
        }
    }

    
    setInterval(updateTime, 60000);
    updateTime(); 

    
    setInterval(fetchWeather, 3600000);
    fetchWeather(); 
});
