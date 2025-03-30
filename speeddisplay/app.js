/***************************************************************
 * GLOBALS
 ***************************************************************/
let speedGaugeChart = null;   // Plotly gauge for speed
let headingGaugeChart = null; // Plotly gauge for heading
let map = null;               // Leaflet map
let mapMarker = null;
let lastPosition = null;      // For distance checks

const HEADING_TAPE_SCALE = 2; // px per degree
const headingTape = document.getElementById("headingTape");

/***************************************************************
 * CONNECT BUTTON & INIT
 ***************************************************************/
const connectOverlay = document.getElementById("connectOverlay");
const connectBtn = document.getElementById("connectBtn");
const appContainer = document.getElementById("appContainer");

connectBtn.addEventListener("click", () => {
  connectOverlay.style.display = "none";
  appContainer.style.display = "block";

  // Create gauges
  createSpeedGauge(0);
  createHeadingGauge(0);

  // Initialize map
  initMap();

  // Start geolocation
  if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 60000
    });
  } else {
    alert("Geolocation not supported by this browser!");
  }

  // Start clock
  updateTimeDisplay();
});

/***************************************************************
 * POSITION UPDATES
 ***************************************************************/
function handlePosition(pos) {
  const { latitude, longitude, altitude, speed, heading } = pos.coords;

  // Location
  document.getElementById("latDisplay").textContent = latitude.toFixed(5);
  document.getElementById("lonDisplay").textContent = longitude.toFixed(5);
  if (altitude !== null && !isNaN(altitude)) {
    document.getElementById("altDisplay").textContent = altitude.toFixed(1);
  } else {
    document.getElementById("altDisplay").textContent = "--";
  }

  // Speed gauge
  let mph = 0;
  if (speed !== null && !isNaN(speed)) {
    mph = speed * 2.23694; // m/s -> mph
  }
  updateSpeedGauge(mph);

  // Heading gauge & tape
  if (heading !== null && !isNaN(heading)) {
    updateHeadingGauge(heading);
    updateHeadingTape(heading);
  } else {
    updateHeadingGauge(0);
    updateHeadingTape(0);
  }

  // Weather if moved enough
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
 * TIME
 ***************************************************************/
function updateTimeDisplay() {
  const timeEl = document.getElementById("timeDisplay");
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  timeEl.textContent = `${hh}:${mm}:${ss} ${ampm}`;
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
  headingTape.style.transform = `translateX(-${deg * HEADING_TAPE_SCALE}px)`;
}

/***************************************************************
 * MAP (LEAFLET)
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
  // Replace with your real API key
  const apiKey = "2c523879d607be23b14fabb202cce5bc";
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather API response not OK.");
    const data = await response.json();
    document.getElementById("weatherDesc").textContent = data.weather[0].description;
    document.getElementById("weatherTemp").textContent = data.main.temp.toFixed(1);
  } catch (err) {
    console.error("Error fetching weather:", err);
    document.getElementById("weatherDesc").textContent = "N/A";
    document.getElementById("weatherTemp").textContent = "--";
  }
}

/***************************************************************
 * OPTIONS MENU & DARK MODE
 ***************************************************************/
const optionsBtn = document.getElementById("optionsBtn");
const optionsMenu = document.getElementById("optionsMenu");

const darkModeToggle    = document.getElementById("darkModeToggle");
const timeToggle        = document.getElementById("timeToggle");
const locationToggle    = document.getElementById("locationToggle");
const weatherToggle     = document.getElementById("weatherToggle");
const speedGaugeToggle  = document.getElementById("speedGaugeToggle");
const headingGaugeToggle= document.getElementById("headingGaugeToggle");
const headingTapeToggle = document.getElementById("headingTapeToggle");
const mapToggle         = document.getElementById("mapToggle");

const timeContainer      = document.getElementById("timeContainer");
const locationContainer  = document.getElementById("locationContainer");
const weatherContainer   = document.getElementById("weatherContainer");
const speedGaugeContainer   = document.getElementById("speedGaugeContainer");
const headingGaugeContainer = document.getElementById("headingGaugeContainer");
const headingTapeContainer  = document.getElementById("headingTapeContainer");
const mapContainer          = document.getElementById("mapContainer");

// Toggle Options menu visibility
optionsBtn.addEventListener("click", () => {
  if (!optionsMenu.style.display || optionsMenu.style.display === "none") {
    optionsMenu.style.display = "block";
  } else {
    optionsMenu.style.display = "none";
  }
});

// Dark / Light Mode
darkModeToggle.addEventListener("change", (e) => {
  if (e.target.checked) {
    document.body.classList.remove("light-mode");
  } else {
    document.body.classList.add("light-mode");
  }
});

// Time Toggle
timeToggle.addEventListener("change", (e) => {
  timeContainer.style.display = e.target.checked ? "block" : "none";
});

// Location Toggle
locationToggle.addEventListener("change", (e) => {
  locationContainer.style.display = e.target.checked ? "block" : "none";
});

// Weather Toggle
weatherToggle.addEventListener("change", (e) => {
  weatherContainer.style.display = e.target.checked ? "block" : "none";
});

// Speed Gauge Toggle
speedGaugeToggle.addEventListener("change", (e) => {
  speedGaugeContainer.style.display = e.target.checked ? "block" : "none";
});

// Heading Gauge Toggle
headingGaugeToggle.addEventListener("change", (e) => {
  headingGaugeContainer.style.display = e.target.checked ? "block" : "none";
  if (e.target.checked && headingGaugeChart) {
    // Re-draw the Plotly gauge if it was previously hidden
    setTimeout(() => { Plotly.Plots.resize(headingGaugeChart); }, 100);
  }
});

// Heading Tape Toggle
headingTapeToggle.addEventListener("change", (e) => {
  headingTapeContainer.style.display = e.target.checked ? "block" : "none";
});

// Map Toggle
mapToggle.addEventListener("change", (e) => {
  mapContainer.style.display = e.target.checked ? "block" : "none";
  if (e.target.checked && map) {
    setTimeout(() => { map.invalidateSize(); }, 100);
  }
});

/***************************************************************
 * DISTANCE HELPER
 ***************************************************************/
function distanceBetween(coordsA, coordsB) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(coordsB.latitude - coordsA.latitude);
  const dLon = toRad(coordsB.longitude - coordsA.longitude);
  const lat1 = toRad(coordsA.latitude);
  const lat2 = toRad(coordsB.latitude);

  const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(lat1)*Math.cos(lat2)*
            Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function toRad(value) {
  return value * Math.PI / 180;
}

/***************************************************************
 * MOVE UP / MOVE DOWN LOGIC
 ***************************************************************/
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
