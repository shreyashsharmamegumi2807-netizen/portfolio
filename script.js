console.log("Portfolio JavaScript loaded");

// ==========================================
// 1. PROJECT SEARCH & FILTERING
// ==========================================
const projectSearch = document.getElementById("projectSearch");
const projectItems = document.querySelectorAll("#projectList .project-card");
const projectSearchStatus = document.getElementById("projectSearchStatus");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const filterPills = document.querySelectorAll(".quick-filters .filter-pill");
const projectCountBadge = document.getElementById("projectCountBadge");

function filterProjects(customTerm) {
  const rawTerm = typeof customTerm === "string" ? customTerm : (projectSearch ? projectSearch.value : "");
  const term = rawTerm.trim().toLowerCase();
  let visibleCount = 0;

  projectItems.forEach(function (item) {
    const titleText = item.querySelector("h3") ? item.querySelector("h3").textContent.toLowerCase() : "";
    const descText = item.querySelector("p") ? item.querySelector("p").textContent.toLowerCase() : "";
    const tagsAttr = item.getAttribute("data-tags") ? item.getAttribute("data-tags").toLowerCase() : "";
    const tagElements = item.querySelectorAll(".tag");
    let tagsText = "";
    tagElements.forEach(t => { tagsText += " " + t.textContent.toLowerCase(); });

    const combinedSearchable = titleText + " " + descText + " " + tagsAttr + " " + tagsText;
    const matches = term === "" || combinedSearchable.includes(term);

    item.hidden = !matches;
    item.style.display = matches ? "" : "none";

    if (matches) {
      visibleCount += 1;
    }
  });

  // Toggle clear button
  if (clearSearchBtn) {
    clearSearchBtn.hidden = term === "";
  }

  // Update status message
  if (projectSearchStatus) {
    if (term === "") {
      projectSearchStatus.textContent = "";
    } else if (visibleCount === 0) {
      projectSearchStatus.textContent = `No projects match "${rawTerm.trim()}". Try searching for "Python", "Quiz", or "Book".`;
    } else {
      projectSearchStatus.textContent = `Showing ${visibleCount} of ${projectItems.length} projects matching "${rawTerm.trim()}".`;
    }
  }

  // Update badge count
  if (projectCountBadge) {
    projectCountBadge.textContent = `${visibleCount} of ${projectItems.length} projects`;
  }
}

if (projectSearch) {
  projectSearch.addEventListener("input", function () {
    // Remove active state from pills if custom search typed
    filterPills.forEach(p => p.classList.remove("active"));
    filterProjects();
  });
}

if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", function () {
    if (projectSearch) {
      projectSearch.value = "";
      projectSearch.focus();
    }
    filterPills.forEach(p => {
      p.classList.toggle("active", p.getAttribute("data-filter") === "all");
    });
    filterProjects("");
  });
}

// Quick filter pill clicks (Python, Quiz, Book, All, Machine Learning)
filterPills.forEach(function (pill) {
  pill.addEventListener("click", function () {
    filterPills.forEach(p => p.classList.remove("active"));
    pill.classList.add("active");

    const filterVal = pill.getAttribute("data-filter");
    if (filterVal === "all") {
      if (projectSearch) projectSearch.value = "";
      filterProjects("");
    } else {
      if (projectSearch) projectSearch.value = filterVal;
      filterProjects(filterVal);
    }
  });
});


// ==========================================
// 2. DARK MODE & LIGHT MODE TOGGLE
// ==========================================
// Positioned at the bottom of the interface in the footer
const themeButton = document.getElementById("themeToggle");
const themeIcon = themeButton ? themeButton.querySelector(".theme-icon") : null;
const themeText = themeButton ? themeButton.querySelector(".theme-text") : null;
const THEME_STORAGE_KEY = "shreyash_portfolio_theme";

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);

  const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
  if (metaColorScheme) {
    metaColorScheme.setAttribute("content", isDark ? "dark" : "light");
  }

  if (themeIcon) {
    themeIcon.textContent = isDark ? "☀️" : "🌙";
  }
  if (themeText) {
    themeText.textContent = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
  }
  if (themeButton) {
    themeButton.setAttribute("aria-label", isDark ? "Switch to Light Mode" : "Switch to Dark Mode");
  }
}

// Initialize theme from localStorage or system preference
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
if (savedTheme) {
  applyTheme(savedTheme);
} else {
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(systemPrefersDark ? "dark" : "light");
}

if (themeButton) {
  themeButton.addEventListener("click", function () {
    const isCurrentlyDark = document.body.classList.contains("dark-mode");
    const newTheme = isCurrentlyDark ? "light" : "dark";
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  });
}


// ==========================================
// 3. WEATHER APPLICATION
// ==========================================
const cityInput = document.getElementById("cityInput");
const weatherButton = document.getElementById("weatherButton");
const weatherResult = document.getElementById("weatherResult");
const quickCityBtns = document.querySelectorAll(".quick-city-btn");
const WEATHER_API_KEY = "5c2c70848a1bcfa13745ed78b08d9a01";

async function getWeather(targetCity) {
  const city = (typeof targetCity === "string" ? targetCity : (cityInput ? cityInput.value : "")).trim();

  if (!city) {
    weatherResult.innerHTML = `<p class="weather-error">⚠️ Please enter a city name (e.g., Jaipur, London, Tokyo).</p>`;
    return;
  }

  weatherResult.innerHTML = `
    <div class="weather-loading">
      <span class="loading-spinner"></span>
      <p>Fetching current weather for <strong>${escapeHtml(city)}</strong>...</p>
    </div>
  `;

  if (weatherButton) weatherButton.disabled = true;

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric`;

  try {
    const response = await fetch(url);

    if (response.status === 404) {
      weatherResult.innerHTML = `
        <div class="weather-error">
          <p>❌ City <strong>"${escapeHtml(city)}"</strong> not found.</p>
          <p class="weather-sub">Please check the spelling or try another city like "Jaipur" or "London".</p>
        </div>
      `;
      return;
    }

    if (!response.ok) {
      throw new Error(`Weather service error: ${response.status}`);
    }

    const data = await response.json();
    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const desc = data.weather[0].description;
    const iconCode = data.weather[0].icon;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    const country = data.sys.country || "";

    weatherResult.innerHTML = `
      <div class="weather-card">
        <div class="weather-card-main">
          <div class="weather-card-info">
            <h3 class="weather-city-name">${data.name}${country ? ", " + country : ""}</h3>
            <p class="weather-condition">${capitalizeWords(desc)}</p>
          </div>
          <div class="weather-icon-temp">
            <img
              src="https://openweathermap.org/img/wn/${iconCode}@2x.png"
              alt="${desc}"
              class="weather-icon-img"
              width="64"
              height="64"
            />
            <div class="weather-temp">${temp}<span class="temp-unit">°C</span></div>
          </div>
        </div>
        <div class="weather-metrics">
          <div class="metric-item">
            <span class="metric-label">Feels like</span>
            <span class="metric-value">${feelsLike}°C</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Humidity</span>
            <span class="metric-value">${humidity}%</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Wind</span>
            <span class="metric-value">${windSpeed} m/s</span>
          </div>
        </div>
      </div>
    `;

    if (cityInput) {
      cityInput.value = data.name;
    }
  } catch (error) {
    console.error("Weather fetch failed:", error);
    weatherResult.innerHTML = `
      <div class="weather-error">
        <p>⚠️ Unable to fetch weather data right now.</p>
        <p class="weather-sub">Please verify your internet connection and try again.</p>
      </div>
    `;
  } finally {
    if (weatherButton) weatherButton.disabled = false;
  }
}

// Weather event listeners
if (weatherButton) {
  weatherButton.addEventListener("click", function () {
    getWeather();
  });
}

if (cityInput) {
  cityInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      getWeather();
    }
  });
}

// Quick city buttons
quickCityBtns.forEach(function (btn) {
  btn.addEventListener("click", function () {
    const city = btn.getAttribute("data-city");
    if (cityInput) cityInput.value = city;
    getWeather(city);
  });
});

// Helper functions
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m];
  });
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}