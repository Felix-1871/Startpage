document.addEventListener('DOMContentLoaded', () => {
    const currentTimeElement = document.getElementById('current-time');
    const currentWeatherElement = document.getElementById('current-weather');

    function updateTime() {
        const now = new Date();
        // Use Intl.DateTimeFormat for robust timezone handling and automatic DST adjustment
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            timeZone: 'Europe/Berlin' // Central European Time / Central European Summer Time
        };
        const formattedDateTime = new Intl.DateTimeFormat('en-GB', options).format(now); // 'en-GB' for dd/mm/yy format
        const [datePart, timePart] = formattedDateTime.split(', '); // Split date and time part
        const [day, month, year] = datePart.split('/');
        const formattedDate = `${day}/${month}/${year}`; // Reformat date to dd:mm:rr

        if (currentTimeElement) {
            currentTimeElement.textContent = `${timePart} ${formattedDate}`;
        }
    }

    // OpenWeatherMap API Key (Replace with your actual key)
    const OPENWEATHER_API_KEY = 'lolno';
    const WEATHER_CITY = 'Berlin';
    const WEATHER_UNITS = 'metric'; // or 'imperial'

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
            const description = data.weather[0].description;
            currentWeatherElement.textContent = `Weather: ${temperature}°C, ${description}`;
        } catch (error) {
            console.error('Failed to fetch weather data:', error);
            currentWeatherElement.textContent = 'Weather: Error';
        }
    }

    // Update time every second
    setInterval(updateTime, 1000);
    updateTime(); // Initial call

    // Fetch weather data every 10 minutes (600000 ms)
    setInterval(fetchWeather, 600000);
    fetchWeather(); // Initial call
});
