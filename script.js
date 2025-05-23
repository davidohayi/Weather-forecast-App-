// DOM Elements with null checks
const elements = {
  userlocation: document.getElementById("userlocation"),
  converter: document.getElementById("converter"),
  weatherIcon: document.querySelector(".weather-icon"),
  temperature: document.querySelector(".temperature"),
  feelslike: document.querySelector(".feelslike"),
  description: document.querySelector(".description"),
  date: document.querySelector(".date"),
  city: document.getElementById("city"),
  HValue: document.getElementById("HValue"),
  WValue: document.getElementById("WValue"),
  SRValue: document.getElementById("SRValue"),
  SSValue: document.getElementById("SSValue"),
  CValue: document.getElementById("CValue"),
  UVValue: document.getElementById("UVValue"),
  PValue: document.getElementById("PValue"),
  forecast: document.getElementById("forecast"),
  search: document.getElementById("search")
};

const API_KEY = "a5bb4718b30b6f58f58697997567fffa";
let currentWeatherData = null;
let forecastData = null;
let groupedForecast = {};

// Helper Functions
function TempConverter(temp) {
  if (!elements.converter) return `${Math.round(temp)}<span>°C</span>`;
  
  const tempValue = Math.round(temp);
  if (elements.converter.value === "°C") {
    return `${tempValue}<span>°C</span>`;
  } else {
    const fahrenheit = Math.round((tempValue * 9) / 5 + 32);
    return `${fahrenheit}<span>°F</span>`;
  }
}

function formatTime(unixTime) {
  const date = new Date(unixTime * 1000);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function CURRENT_API(city) {
  return `https://api.openweathermap.org/data/2.5/weather?appid=${API_KEY}&units=metric&q=${encodeURIComponent(city)}`;
}

function FORECAST_API(city) {
  return `https://api.openweathermap.org/data/2.5/forecast?appid=${API_KEY}&units=metric&q=${encodeURIComponent(city)}`;
}

function safeSetContent(element, content) {
  if (element) {
    element.innerHTML = content; // Changed to innerHTML for UV coloring
  } else {
    console.warn(`Attempted to set content on null element: ${content}`);
  }
}

function formatUVIndex(value) {
  if (value === null || value === undefined) return "N/A";
  const num = parseFloat(value);
  let cssClass = "uv-very-high";
  
  if (num < 3) cssClass = "uv-low";
  else if (num < 6) cssClass = "uv-moderate";
  else if (num < 8) cssClass = "uv-high";
  
  return `<span class="${cssClass}">${num.toFixed(1)}</span>`;
}

// Weather Data Functions
async function fetchUVIndex(lat, lon) {
  try {
    const uvResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/uvi?appid=${API_KEY}&lat=${lat}&lon=${lon}`
    );
    const uvData = await uvResponse.json();
    safeSetContent(elements.UVValue, formatUVIndex(uvData.value));
  } catch (err) {
    console.error("Failed to fetch UV index:", err);
    safeSetContent(elements.UVValue, formatUVIndex(null));
  }
}

function updateCurrentWeatherUI(data) {
  // Improved city name display
  const cityName = data.name || "Current Location";
  const countryCode = data.sys?.country || "";
  safeSetContent(elements.city, `${cityName}${countryCode ? `, ${countryCode}` : ''}`);
  
  if (elements.weatherIcon) {
    elements.weatherIcon.style.backgroundImage = `url("https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png")`;
  }
  
  if (elements.temperature) {
    elements.temperature.innerHTML = TempConverter(data.main.temp);
  }
  
  if (elements.feelslike) {
    elements.feelslike.innerHTML = `Feels like: ${TempConverter(data.main.feels_like)}`;
  }
  
  safeSetContent(elements.description, data.weather[0].description);
  safeSetContent(elements.date, new Date((data.dt + data.timezone) * 1000).toLocaleString());
  safeSetContent(elements.HValue, `${data.main.humidity}%`);
  safeSetContent(elements.WValue, `${data.wind.speed} km/h`);
  safeSetContent(elements.CValue, `${data.clouds.all}%`);
  safeSetContent(elements.PValue, `${data.main.pressure} hPa`);
  
  // UV Index handling
  safeSetContent(elements.UVValue, "Loading...");
  if (data.coord) {
    fetchUVIndex(data.coord.lat, data.coord.lon);
  } else {
    safeSetContent(elements.UVValue, formatUVIndex(null));
  }
  
  safeSetContent(elements.SRValue, formatTime(data.sys.sunrise + data.timezone));
  safeSetContent(elements.SSValue, formatTime(data.sys.sunset + data.timezone));
}

function processForecastData(data) {
  if (!elements.forecast) return;
  
  elements.forecast.innerHTML = "";
  groupedForecast = {};

  data.list.forEach((item) => {
    const dateStr = item.dt_txt.split(" ")[0];
    if (!groupedForecast[dateStr]) groupedForecast[dateStr] = [];
    groupedForecast[dateStr].push(item);
  });

  let index = 0;
  for (let day in groupedForecast) {
    if (index++ === 0) continue;

    const items = groupedForecast[day];
    const icon = items[0].weather[0].icon;
    const desc = items[0].weather[0].description;
    const temps = items.map((i) => i.main.temp);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);

    const div = document.createElement("div");
    div.className = "forecast-day";
    div.innerHTML = `
      <h4>${formatDate(day)}</h4>
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" />
      <p class="forecast-desc">${desc}</p>
      <span><strong>${TempConverter(minTemp)}</strong> / <strong>${TempConverter(maxTemp)}</strong></span>
    `;
    elements.forecast.appendChild(div);

    if (index === 6) break;
  }
}

function updateTemperatures() {
  if (!currentWeatherData) return;
  
  if (elements.temperature) {
    elements.temperature.innerHTML = TempConverter(currentWeatherData.main.temp);
  }
  
  if (elements.feelslike) {
    elements.feelslike.innerHTML = `Feels like: ${TempConverter(currentWeatherData.main.feels_like)}`;
  }
  
  if (elements.forecast) {
    const forecastItems = elements.forecast.querySelectorAll(".forecast-day");
    forecastItems.forEach((item, index) => {
      const day = Object.keys(groupedForecast)[index + 1];
      if (groupedForecast[day]) {
        const temps = groupedForecast[day].map(i => i.main.temp);
        const minTemp = Math.min(...temps);
        const maxTemp = Math.max(...temps);
        
        const tempSpan = item.querySelector("span");
        if (tempSpan) {
          tempSpan.innerHTML = `<strong>${TempConverter(minTemp)}</strong> / <strong>${TempConverter(maxTemp)}</strong>`;
        }
      }
    });
  }
}

// Main Function
async function findUserLocation() {
  if (!elements.userlocation) {
    alert("Location input element not found");
    return;
  }

  const location = elements.userlocation.value.trim();
  if (!location) {
    alert("Please enter a location.");
    return;
  }

  if (elements.forecast) {
    elements.forecast.innerHTML = "<p>Loading weather data...</p>";
  }

  try {
    // Fetch current weather
    const currentResponse = await fetch(CURRENT_API(location));
    if (!currentResponse.ok) {
      const errorData = await currentResponse.json();
      throw new Error(errorData.message || "Failed to fetch current weather");
    }
    
    currentWeatherData = await currentResponse.json();
    updateCurrentWeatherUI(currentWeatherData);

    // Fetch forecast
    const forecastResponse = await fetch(FORECAST_API(location));
    if (!forecastResponse.ok) {
      const errorData = await forecastResponse.json();
      throw new Error(errorData.message || "Failed to fetch forecast");
    }
    
    forecastData = await forecastResponse.json();
    processForecastData(forecastData);
    
  } catch (err) {
    console.error("Error details:", err);
    if (elements.forecast) {
      elements.forecast.innerHTML = `<p class="error">${err.message}</p>`;
    }
    alert(`Error: ${err.message}. Please check the location and try again.`);
  }
}

// Event Listeners
if (elements.search) {
  elements.search.addEventListener("click", findUserLocation);
}

if (elements.userlocation) {
  elements.userlocation.addEventListener("keydown", (e) => {
    if (e.key === "Enter") findUserLocation();
  });
}

if (elements.converter) {
  elements.converter.addEventListener("change", updateTemperatures);
}