const API_KEY = '7e8642c295fb6b9654e42cd9f386bb06';

window.onload = () => {
  loadClock();
  loadLanguage();
  document.getElementById('city-input').addEventListener('input', fetchSuggestions);

  if (localStorage.getItem('mode') === 'dark') {
    document.body.classList.add('dark');
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      fetchLocationWeather(latitude, longitude);
    });
  }
};

function loadClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
  document.getElementById('date').textContent = new Date().toLocaleDateString();
  setTimeout(loadClock, 1000);
}

function toggleMode() {
  document.body.classList.toggle('dark');
  localStorage.setItem('mode', document.body.classList.contains('dark') ? 'dark' : 'light');
}

function loadLanguage() {
  const sel = document.getElementById('language');
  sel.value = localStorage.getItem('lang') || 'en';
  sel.onchange = () => localStorage.setItem('lang', sel.value);
}

function handleSearch() {
  const city = document.getElementById('city-input').value.trim();
  const lang = document.getElementById('language').value;
  if (city) {
    fetchWeather(city, lang);
  }
}

async function fetchWeather(city, lang) {
  const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=${lang}`);
  if (!res.ok) return alert('City not found');
  const data = await res.json();
  displayAll(data);
}

async function fetchLocationWeather(lat, lon) {
  const lang = document.getElementById('language').value;
  const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=${lang}`);
  const data = await res.json();
  displayAll(data);
}

async function displayAll(data) {
  const [aqiData, forecastData] = await Promise.all([
    fetchAQI(data.coord.lat, data.coord.lon),
    fetchForecast(data.coord.lat, data.coord.lon)
  ]);

  updateWeather(data);
  showAQI(aqiData);
  updateForecast(forecastData);
  drawCanvas(data.weather[0].main);
  updateBackground(data.weather[0].main.toLowerCase());
  showMap(data.coord.lat, data.coord.lon);
  speakWeather(data);
}

function updateWeather(d) {
  const id = s => document.getElementById(s);
  id("weather-info").hidden = false;
  id("city-name").textContent = `${d.name}, ${d.sys.country}`;
  id("temp").textContent = `🌡 ${Math.round(d.main.temp)}°C`;
  id("desc").textContent = d.weather[0].description;
  id("feels").textContent = `Feels like: ${Math.round(d.main.feels_like)}°C`;
  id("humidity").textContent = `💧 ${d.main.humidity}%`;
  id("wind").textContent = `🌬 ${(d.wind.speed * 3.6).toFixed(1)} km/h`;
  id("weather-icon").src = `https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png`;

  // 🌍 Local Time
  const utc = new Date().getTime() + new Date().getTimezoneOffset() * 60000;
const local = new Date(utc + d.timezone * 1000);

  const timeStr = local.toLocaleTimeString('en-US');
  const dateStr = `${local.getDate()}/${local.getMonth() + 1}/${local.getFullYear()}`;

  document.getElementById('local-dt').textContent = `📍 ${dateStr} | ${timeStr}`;
}

function showAQI(aqi) {
  const levels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
  document.getElementById("aqi").textContent = `AQI: ${aqi} (${levels[aqi - 1]})`;
}

async function fetchAQI(lat, lon) {
  const res = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
  const data = await res.json();
  return data.list[0].main.aqi;
}

async function fetchForecast(lat, lon) {
  const lang = document.getElementById('language').value;
  const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=${lang}`);
  const json = await res.json();
  return json.list.filter(item => item.dt_txt.includes("12:00:00"));
}

function updateForecast(forecast) {
  const forecastBox = document.getElementById("forecast");
  forecastBox.innerHTML = "";
  forecast.forEach(day => {
    const date = new Date(day.dt_txt);
    const div = document.createElement("div");
    div.className = "fc-card";
    div.innerHTML = `
      <p>${date.toLocaleDateString()}</p>
      <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png">
      <p>${Math.round(day.main.temp)}°C</p>`;
    forecastBox.appendChild(div);
  });
}

function updateBackground(cond) {
  document.body.className = '';
  if (cond.includes("thunder")) document.body.classList.add("thunder");
  else if (cond.includes("rain")) document.body.classList.add("rainy");
  else if (cond.includes("snow")) document.body.classList.add("snow");
  else if (cond.includes("cloud")) document.body.classList.add("cloudy");
  else if (cond.includes("clear")) document.body.classList.add("clear");
  else if (cond.includes("mist") || cond.includes("fog")) document.body.classList.add("fog");
  else document.body.classList.add("default");
}

function drawCanvas(main) {
  const canvas = document.getElementById("weatherCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (main.toLowerCase().includes("rain")) {
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.strokeStyle = "rgba(174,194,224,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2, y + 10);
      ctx.stroke();
    }
  } else if (main.toLowerCase().includes("snow")) {
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function speakWeather(data) {
  const msg = new SpeechSynthesisUtterance(
    `It's ${Math.round(data.main.temp)}°C with ${data.weather[0].description} in ${data.name}`
  );
  speechSynthesis.speak(msg);
}

function showMap(lat, lon) {
  document.getElementById("map").innerHTML = `
    <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.1}%2C${lat - 0.1}%2C${lon + 0.1}%2C${lat + 0.1}&layer=mapnik&marker=${lat}%2C${lon}"
      width="100%" height="200" style="border:0;"></iframe>`;
}

async function fetchSuggestions() {
  const query = document.getElementById("city-input").value.trim();
  const suggestionsBox = document.getElementById("suggestions");
  suggestionsBox.innerHTML = "";

  if (query.length < 2) {
    suggestionsBox.style.display = "none";
    return;
  }

  try {
    const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`);
    const cities = await res.json();

    if (cities.length === 0) {
      suggestionsBox.style.display = "none";
      return;
    }

    cities.forEach(city => {
      const li = document.createElement("li");
      li.textContent = `${city.name}, ${city.country}`;
      li.onclick = () => {
        document.getElementById("city-input").value = city.name;
        suggestionsBox.innerHTML = "";
        suggestionsBox.style.display = "none";
      };
      suggestionsBox.appendChild(li);
    });

    suggestionsBox.style.display = "block";
  } catch (e) {
    console.error("Autocomplete error:", e);
  }
}






