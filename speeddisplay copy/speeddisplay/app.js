/***************************************************************
 * GLOBALS
 ***************************************************************/
let speedGaugeChart = null;   // Plotly gauge for speed
let headingGaugeChart = null; // Plotly gauge for heading
let map = null;               // Leaflet map
let mapMarker = null;
let lastPosition = null;      // For distance checks

const HEADING_TAPE_SCALE = 2; // px per degree

/***************************************************************
 * MODULE DEFINITIONS (for dynamic module creation)
 ***************************************************************/
const MODULE_DEFINITIONS = [
  {
    id: "timeModule",
    title: "Current Time",
    defaultVisible: true,
    render(containerEl) {
      containerEl.innerHTML = `<p class="time-display"><span id="timeDisplay">--:--:-- --</span></p>`;
    }
  },
  {
    id: "locationModule",
    title: "Location",
    defaultVisible: true,
    render(containerEl) {
      containerEl.innerHTML = `
        <p><strong>Latitude:</strong> <span id="latDisplay">--</span></p>
        <p><strong>Longitude:</strong> <span id="lonDisplay">--</span></p>
        <p><strong>Altitude (m):</strong> <span id="altDisplay">--</span></p>
      `;
    }
  },
  {
    id: "weatherModule",
    title: "Weather Summary",
    defaultVisible: true,
    render(containerEl) {
      containerEl.innerHTML = `
        <div class="weather-box">
          <p><span class="label">Description:</span> <span id="weatherDesc">N/A</span></p>
          <p><span class="label">Temperature:</span> <span id="weatherTemp">--</span>°F</p>
        </div>
      `;
    }
  },
  {
    id: "detailedWeatherModule",
    title: "Detailed Weather",
    defaultVisible: false,
    render(containerEl) {
      containerEl.innerHTML = `
        <div class="weather-details">
          <p><strong>Temperature:</strong> <span id="detailedTemp">--</span>°F</p>
          <p><strong>Feels Like:</strong> <span id="feelsLike">--</span>°F</p>
          <p><strong>Min:</strong> <span id="tempMin">--</span>°F</p>
          <p><strong>Max:</strong> <span id="tempMax">--</span>°F</p>
          <p><strong>Pressure:</strong> <span id="pressure">--</span> hPa</p>
          <p><strong>Humidity:</strong> <span id="humidity">--</span>%</p>
          <p><strong>Visibility:</strong> <span id="visibility">--</span> m</p>
        </div>
      `;
    }
  },
  {
    id: "windModule",
    title: "Wind",
    defaultVisible: false,
    render(containerEl) {
      containerEl.innerHTML = `
        <div class="wind-box">
          <p><strong>Speed:</strong> <span id="windSpeed">--</span> m/s</p>
          <p><strong>Direction:</strong> <span id="windDirection">--</span>°</p>
        </div>
      `;
    }
  },
  {
    id: "sunModule",
    title: "Sunrise / Sunset",
    defaultVisible: false,
    render(containerEl) {
      containerEl.innerHTML = `
        <div class="sun-box">
          <p><strong>Sunrise:</strong> <span id="sunriseTime">--</span></p>
          <p><strong>Sunset:</strong> <span id="sunsetTime">--</span></p>
        </div>
      `;
    }
  },
  {
    id: "speedGaugeModule",
    title: "Speed (mph)",
    defaultVisible: true,
    render(containerEl) {
      containerEl.innerHTML = `<div id="speedGauge" style="width:100%;height:300px;"></div>`;
      createSpeedGauge(0);
    }
  },
  {
    id: "headingGaugeModule",
    title: "Heading (°)",
    defaultVisible: false,
    render(containerEl) {
      containerEl.innerHTML = `<div id="headingGauge" style="width:100%;height:300px;"></div>`;
      createHeadingGauge(0);
    }
  },
  {
    id: "headingTapeModule",
    title: "Aviation-Style Heading Tape",
    defaultVisible: false,
    render(containerEl) {
      containerEl.innerHTML = `
        <div id="headingTapeWindow" style="width:360px;height:60px;position:relative;overflow:hidden;">
          <div id="headingTape" style="position:absolute;top:0;left:0;width:2000px;height:60px;
            background: repeating-linear-gradient(to right, #333 0px, #333 9px, #0ff 10px,
            #333 11px, #333 19px, #0ff 20px, #333 21px, #333 29px, #0ff 30px);"></div>
          <div class="tape-marker" style="position:absolute;left:50%;top:0;width:2px;height:60px;background:red;"></div>
        </div>
      `;
    }
  },
  {
    id: "mapModule",
    title: "Map",
    defaultVisible: false,
    render(containerEl) {
      containerEl.innerHTML = `<div id="map" style="width:100%;height:400px;"></div>`;
      initMap();
    }
  },
  {
    id: "hourlyForecastModule",
    title: "Hourly Forecast",
    defaultVisible: false,
    render(containerEl) {
      containerEl.innerHTML = `<div id="hourlyForecast" class="forecast-container"></div>`;
    }
  },
  {
    id: "dailyForecastModule",
    title: "7-Day Forecast",
    defaultVisible: false,
    render(containerEl) {
      containerEl.innerHTML = `<div id="dailyForecast" class="forecast-container"></div>`;
    }
  }
];

/*
const MODULE_DEFINITIONS = [
  {
    id: "timeModule",
    title: "Current Time",
    defaultVisible: true,
    render(containerEl) {
      containerEl.innerHTML = `<p class="time-display"><span id="timeDisplay">--:--:-- --</span></p>`;
    }
  },
  {
    id: "locationModule",
    title: "Location",
    defaultVisible: true,
    render(containerEl) {
      containerEl.innerHTML = `
        <p><strong>Latitude:</strong> <span id="latDisplay">--</span></p>
        <p><strong>Longitude:</strong> <span id="lonDisplay">--</span></p>
        <p><strong>Altitude (m):</strong> <span id="altDisplay">--</span></p>
      `;
    }
  },
  {
    id: "weatherModule",
    title: "Weather",
    defaultVisible: true,
    render(containerEl) {
      containerEl.innerHTML = `
        <div class="weather-box">
          <p><span class="label">Description:</span> <span id="weatherDesc">N/A</span></p>
          <p><span class="label">Temperature:</span> <span id="weatherTemp">--</span>°F</p>
        </div>
      `;
    }
  },
  {
    id: "speedGaugeModule",
    title: "Speed (mph)",
    defaultVisible: true,
    render(containerEl) {
      containerEl.innerHTML = `<div id="speedGauge" style="width:100%;height:300px;"></div>`;
      createSpeedGauge(0);
    }
  },
  {
    id: "headingGaugeModule",
    title: "Heading (°)",
    defaultVisible: false,
    render(containerEl) {
      containerEl.innerHTML = `<div id="headingGauge" style="width:100%;height:300px;"></div>`;
      createHeadingGauge(0);
    }
  },
  {
    id: "headingTapeModule",
    title: "Aviation-Style Heading Tape",
    defaultVisible: false,
    render(containerEl) {
      containerEl.innerHTML = `
        <div id="headingTapeWindow" style="width:360px;height:60px;position:relative;overflow:hidden;">
          <div id="headingTape" style="position:absolute;top:0;left:0;width:2000px;height:60px;
            background: repeating-linear-gradient(to right, #333 0px, #333 9px, #0ff 10px,
            #333 11px, #333 19px, #0ff 20px, #333 21px, #333 29px, #0ff 30px);"></div>
          <div class="tape-marker" style="position:absolute;left:50%;top:0;width:2px;height:60px;background:red;"></div>
        </div>
      `;
    }
  },
  {
    id: "mapModule",
    title: "Map",
    defaultVisible: false,
    render(containerEl) {
      containerEl.innerHTML = `<div id="map" style="width:100%;height:400px;"></div>`;
      initMap();
    }
  }
];
*/

/***************************************************************
 * INITIALIZE MODULES
 ***************************************************************/
function initializeModules() {
  const optionsMenu = document.getElementById("optionsMenu");
  const modulesContainer = document.getElementById("modulesContainer");

  // Ensure dark mode toggle exists and attach its listener immediately
  let darkToggle = document.getElementById("darkModeToggle");
  if (!darkToggle) {
    const darkLabel = document.createElement("label");
    darkLabel.innerHTML = `<input type="checkbox" id="darkModeToggle" checked> Dark Mode`;
    optionsMenu.appendChild(darkLabel);
    darkToggle = document.getElementById("darkModeToggle");
    darkToggle.addEventListener("change", (e) => {
      if (e.target.checked) {
        document.body.classList.remove("light-mode");
      } else {
        document.body.classList.add("light-mode");
      }
    });
  }

  // Process the rest of your module definitions…
  MODULE_DEFINITIONS.forEach((def) => {
    // Create the toggle for each module
    const toggleLabel = document.createElement("label");
    toggleLabel.innerHTML = `<input type="checkbox" id="${def.id}Toggle"> ${def.title}`;
    optionsMenu.appendChild(toggleLabel);

    // Create the module container
    const container = document.createElement("div");
    container.classList.add("feature-container");
    container.setAttribute("id", def.id + "Container");
    container.setAttribute("data-toggle-id", def.id + "Toggle");

    container.innerHTML = `
      <div class="feature-header">
        <div class="side-controls">
          <button class="move-up">▲</button>
          <button class="move-down">▼</button>
        </div>
        <h2>${def.title}</h2>
        <div class="header-controls">
          <button class="close-module">X</button>
        </div>
      </div>
      <div class="module-body"></div>
    `;
    modulesContainer.appendChild(container);

    // Render module content
    const bodyEl = container.querySelector(".module-body");
    if (def.render) {
      def.render(bodyEl);
    }

    // Set initial visibility
    const toggle = document.getElementById(def.id + "Toggle");
    toggle.checked = def.defaultVisible;
    container.style.display = def.defaultVisible ? "block" : "none";

    // Wire up toggle change
    toggle.addEventListener("change", (e) => {
      container.style.display = e.target.checked ? "block" : "none";
    });

    // Setup move up, move down, and close buttons
    const moveUpBtn = container.querySelector(".move-up");
    const moveDownBtn = container.querySelector(".move-down");
    const closeBtn = container.querySelector(".close-module");

    moveUpBtn.addEventListener("click", () => {
      const prev = container.previousElementSibling;
      if (prev) {
        container.parentNode.insertBefore(container, prev);
      }
    });
    moveDownBtn.addEventListener("click", () => {
      const next = container.nextElementSibling;
      if (next) {
        container.parentNode.insertBefore(next, container);
      }
    });
    closeBtn.addEventListener("click", () => {
      container.style.display = "none";
      toggle.checked = false;
    });
  });
}


/***************************************************************
 * CONNECT & INIT
 ***************************************************************/
const connectOverlay = document.getElementById("connectOverlay");
const connectBtn = document.getElementById("connectBtn");
const appContainer = document.getElementById("appContainer");

connectBtn.addEventListener("click", () => {
  connectOverlay.style.display = "none";
  appContainer.style.display = "block";

  // Initialize modules (creates dark mode toggle among others)
  initializeModules();

  // Now attach the dark mode listener immediately:
  const darkModeToggle = document.getElementById("darkModeToggle");
  if (darkModeToggle) {
    darkModeToggle.addEventListener("change", (e) => {
      if (e.target.checked) {
        document.body.classList.remove("light-mode");
      } else {
        document.body.classList.add("light-mode");
      }
    });
  }

  // Start geolocation, time updates, etc.
  if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 60000
    });
  } else {
    alert("Geolocation not supported by this browser!");
  }
  updateTimeDisplay();
});

/***************************************************************
 * POSITION UPDATES
 ***************************************************************/
function handlePosition(pos) {
  const { latitude, longitude, altitude, speed, heading } = pos.coords;

  // Update location fields
  const latEl = document.getElementById("latDisplay");
  const lonEl = document.getElementById("lonDisplay");
  const altEl = document.getElementById("altDisplay");
  if (latEl) latEl.textContent = latitude.toFixed(5);
  if (lonEl) lonEl.textContent = longitude.toFixed(5);
  if (altEl) {
    altEl.textContent = (altitude !== null && !isNaN(altitude)) ? altitude.toFixed(1) : "--";
  }

  // Update speed gauge (m/s -> mph)
  let mph = 0;
  if (speed !== null && !isNaN(speed)) {
    mph = speed * 2.23694;
  }
  updateSpeedGauge(mph);

  // Update heading gauge and tape
  if (heading !== null && !isNaN(heading)) {
    updateHeadingGauge(heading);
    updateHeadingTape(heading);
  } else {
    updateHeadingGauge(0);
    updateHeadingTape(0);
  }

  // Update weather if moved enough
  if (!lastPosition || distanceBetween(lastPosition, pos.coords) > 0.01) {
    fetchWeather(latitude, longitude);
  }
  lastPosition = pos.coords;

  // Update map
  updateMap(latitude, longitude);
}

function handleError(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

/***************************************************************
 * TIME UPDATE
 ***************************************************************/
function updateTimeDisplay() {
  const timeEl = document.getElementById("timeDisplay");
  if (!timeEl) return;
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  timeEl.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} ${ampm}`;
}
setInterval(updateTimeDisplay, 1000);

/***************************************************************
 * SPEED GAUGE (Plotly)
 ***************************************************************/
function createSpeedGauge(initialValue) {
  const data = [
    {
      type: "indicator",
      mode: "gauge+number",
      value: initialValue,
      gauge: {
        axis: { range: [0, 120], tickwidth: 2, tickcolor: "#0ff" },
        bar: { color: "#0f0", thickness: 0.25 },
        borderwidth: 2,
        bordercolor: "#0ff",
        steps: [
          { range: [0, 40], color: "#034" },
          { range: [40, 80], color: "#067" },
          { range: [80, 120], color: "#0a0" }
        ]
      },
      title: { text: "mph" }
    }
  ];
  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { t: 50, b: 0, l: 10, r: 10 }
  };
  Plotly.newPlot("speedGauge", data, layout, { displayModeBar: false })
    .then((chart) => {
      speedGaugeChart = chart;
    });
}
function updateSpeedGauge(mph) {
  if (!speedGaugeChart) return;
  Plotly.update("speedGauge", { value: [mph] }, {}, [0]);
}

/***************************************************************
 * HEADING GAUGE (Plotly)
 ***************************************************************/
function createHeadingGauge(initialValue) {
  const data = [
    {
      type: "indicator",
      mode: "gauge+number",
      value: initialValue,
      gauge: {
        axis: { range: [0, 360], tickwidth: 2, tickcolor: "#0ff" },
        bar: { color: "#0f0", thickness: 0.25 },
        borderwidth: 2,
        bordercolor: "#0ff",
        steps: [
          { range: [0, 120], color: "#055" },
          { range: [120, 240], color: "#077" },
          { range: [240, 360], color: "#0a0" }
        ]
      },
      title: { text: "Heading (°)" }
    }
  ];
  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { t: 50, b: 0, l: 10, r: 10 }
  };
  Plotly.newPlot("headingGauge", data, layout, { displayModeBar: false })
    .then((chart) => {
      headingGaugeChart = chart;
    });
}
function updateHeadingGauge(deg) {
  if (!headingGaugeChart) return;
  Plotly.update("headingGauge", { value: [deg] }, {}, [0]);
}

/***************************************************************
 * HEADING TAPE
 ***************************************************************/
function updateHeadingTape(deg) {
  const tapeEl = document.getElementById("headingTape");
  if (!tapeEl) return;
  tapeEl.style.transform = `translateX(-${deg * HEADING_TAPE_SCALE}px)`;
}

/***************************************************************
 * MAP (Leaflet)
 ***************************************************************/
function initMap() {
  map = L.map("map").setView([0, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
}
function updateMap(lat, lon) {
  if (!map) return;
  map.setView([lat, lon], 14);
  if (!mapMarker) {
    mapMarker = L.marker([lat, lon]).addTo(map);
  } else {
    mapMarker.setLatLng([lat, lon]);
  }
}

/***************************************************************
 * WEATHER FETCH
 ***************************************************************/
async function fetchWeather(lat, lon) {
  const apiKey = "2c523879d607be23b14fabb202cce5bc";
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather API response not OK.");
    const data = await response.json();

    // Update Weather Summary Module
    document.getElementById("weatherDesc").textContent = data.weather[0].description;
    document.getElementById("weatherTemp").textContent = data.main.temp.toFixed(1);

    // Update Detailed Weather Module
    if (document.getElementById("detailedTemp"))
      document.getElementById("detailedTemp").textContent = data.main.temp.toFixed(1);
    if (document.getElementById("feelsLike"))
      document.getElementById("feelsLike").textContent = data.main.feels_like.toFixed(1);
    if (document.getElementById("tempMin"))
      document.getElementById("tempMin").textContent = data.main.temp_min.toFixed(1);
    if (document.getElementById("tempMax"))
      document.getElementById("tempMax").textContent = data.main.temp_max.toFixed(1);
    if (document.getElementById("pressure"))
      document.getElementById("pressure").textContent = data.main.pressure;
    if (document.getElementById("humidity"))
      document.getElementById("humidity").textContent = data.main.humidity;
    if (document.getElementById("visibility"))
      document.getElementById("visibility").textContent = data.visibility;

    // Update Wind Module
    if (document.getElementById("windSpeed"))
      document.getElementById("windSpeed").textContent = data.wind.speed;
    if (document.getElementById("windDirection"))
      document.getElementById("windDirection").textContent = data.wind.deg;

    // Update Sunrise/Sunset Module (convert UNIX timestamps to local time)
    if (document.getElementById("sunriseTime"))
      document.getElementById("sunriseTime").textContent = convertTimestamp(data.sys.sunrise);
    if (document.getElementById("sunsetTime"))
      document.getElementById("sunsetTime").textContent = convertTimestamp(data.sys.sunset);
      
  } catch (err) {
    console.error("Error fetching weather:", err);
    // Set default values in case of error
    if (document.getElementById("weatherDesc")) document.getElementById("weatherDesc").textContent = "N/A";
    if (document.getElementById("weatherTemp")) document.getElementById("weatherTemp").textContent = "--";
  }
}

// Helper function to convert UNIX timestamp to a local time string
function convertTimestamp(ts) {
  const date = new Date(ts * 1000);
  return date.toLocaleTimeString();
}


/***************************************************************
 * DISTANCE HELPER
 ***************************************************************/
function distanceBetween(coordsA, coordsB) {
  const R = 6371; // km
  const dLat = toRad(coordsB.latitude - coordsA.latitude);
  const dLon = toRad(coordsB.longitude - coordsA.longitude);
  const lat1 = toRad(coordsA.latitude);
  const lat2 = toRad(coordsB.latitude);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function toRad(value) {
  return value * Math.PI / 180;
}

/***************************************************************
 * OPTIONS MENU & DARK/LIGHT MODE
 ***************************************************************/
const optionsBtn = document.getElementById("optionsBtn");
const optionsMenu = document.getElementById("optionsMenu");

optionsBtn.addEventListener("click", () => {
  optionsMenu.classList.toggle("open");
});

// Dark/Light mode toggle
const darkModeToggle = document.getElementById("darkModeToggle");
if (darkModeToggle) {
  darkModeToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.body.classList.remove("light-mode");
    } else {
      document.body.classList.add("light-mode");
    }
  });
}

/***************************************************************
 * OPTIONS MENU - Dynamic Toggle Handling
 ***************************************************************/
function setupOptionsToggles() {
  MODULE_DEFINITIONS.forEach((def) => {
    const toggle = document.getElementById(def.id + "Toggle");
    const container = document.getElementById(def.id + "Container");
    if (toggle && container) {
      toggle.addEventListener("change", (e) => {
        container.style.display = e.target.checked ? "block" : "none";
      });
    }
  });
}

/***************************************************************
 * MODULE REORDER & CLOSE BUTTONS
 ***************************************************************/
function setupModuleControls() {
  document.querySelectorAll(".move-up").forEach((btn) => {
    btn.addEventListener("click", () => {
      const feature = btn.closest(".feature-container");
      if (!feature) return;
      const prev = feature.previousElementSibling;
      if (prev) {
        feature.parentNode.insertBefore(feature, prev);
      }
    });
  });
  document.querySelectorAll(".move-down").forEach((btn) => {
    btn.addEventListener("click", () => {
      const feature = btn.closest(".feature-container");
      if (!feature) return;
      const next = feature.nextElementSibling;
      if (next) {
        feature.parentNode.insertBefore(next, feature);
      }
    });
  });
  document.querySelectorAll(".close-module").forEach((btn) => {
    btn.addEventListener("click", () => {
      const feature = btn.closest(".feature-container");
      if (!feature) return;
      feature.style.display = "none";
      const toggleId = feature.getAttribute("data-toggle-id");
      if (toggleId) {
        const toggleEl = document.getElementById(toggleId);
        if (toggleEl) {
          toggleEl.checked = false;
        }
      }
    });
  });
}

/***************************************************************
 * INITIALIZATION AFTER DOM LOADED
 ***************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  setupModuleControls();
  setupOptionsToggles();
});
