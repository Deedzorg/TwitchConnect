/***************************************************************
 * GLOBAL STATE
 ***************************************************************/
let speedGaugeChart = null;    // For speed gauge
let lastPosition = null;
let distanceTraveled = 0;      // in km internally
let speedReadings = [];        // mph readings for averaging & chart
let maxSpeed = 0;              // track highest mph
let map = null;                // Leaflet map
let mapMarker = null;          // Marker for current position
let speedChartData = null;     // Plotly data for speed over time
let speedChartInitialized = false;

/***************************************************************
 * CONNECT & INIT
 ***************************************************************/
const connectOverlay = document.getElementById("connectOverlay");
const connectBtn = document.getElementById("connectBtn");
const appContainer = document.getElementById("appContainer");

connectBtn.addEventListener("click", () => {
  connectOverlay.style.display = "none";
  appContainer.style.display = "block";

  // Initialize gauge
  createSpeedGauge(0);
  // Start the clock
  updateTimeDisplay();

  // Initialize map
  initMap();

  // Initialize speed chart
  initSpeedChart();

  // Start geolocation
  if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 60000
    });
  } else {
    alert("Geolocation is not supported by this browser!");
  }
});

/***************************************************************
 * GAUGE SETUP (SINGLE GAUGE FOR SPEED)
 ***************************************************************/
function createSpeedGauge(initialValue = 0) {
  const data = [
    {
      type: "indicator",
      mode: "gauge+number",
      value: initialValue,
      title: { text: "mph", font: { size: 16 } },
      gauge: {
        axis: { range: [0, 120], tickwidth: 2, tickcolor: "#0ff" },
        bar: { color: "#0f0", thickness: 0.3 },
        borderwidth: 2,
        bordercolor: "#0ff",
        steps: [
          { range: [0, 40], color: "#034" },
          { range: [40, 80], color: "#067" },
          { range: [80, 120], color: "#0a0" }
        ]
      }
    }
  ];

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { t: 30, b: 0, l: 0, r: 0 }
  };

  Plotly.newPlot("speedGauge", data, layout, { displayModeBar: false, displaylogo: false })
    .then((chart) => {
      speedGaugeChart = chart;
    });
}

function updateSpeedGauge(mph) {
  if (!speedGaugeChart) return;
  Plotly.update("speedGauge", { value: [mph] }, {}, [0]);
}

/***************************************************************
 * HANDLE POSITION UPDATES
 ***************************************************************/
function handlePosition(pos) {
  const {
    latitude,
    longitude,
    speed,
    accuracy,
    altitude,
    altitudeAccuracy,
    heading
  } = pos.coords;

  // Update main display fields
  document.getElementById("latDisplay").textContent = latitude.toFixed(5);
  document.getElementById("lonDisplay").textContent = longitude.toFixed(5);
  document.getElementById("accuracyDisplay").textContent = accuracy?.toFixed(1) ?? "--";

  // Altitude
  if (altitude !== null && !isNaN(altitude)) {
    document.getElementById("altDisplay").textContent = altitude.toFixed(1);
  } else {
    document.getElementById("altDisplay").textContent = "--";
  }
  // Altitude accuracy
  if (altitudeAccuracy !== null && !isNaN(altitudeAccuracy)) {
    document.getElementById("altAccDisplay").textContent = altitudeAccuracy.toFixed(1);
  } else {
    document.getElementById("altAccDisplay").textContent = "--";
  }

  // Speed (m/s -> mph)
  let mph = 0;
  if (speed !== null && !isNaN(speed)) {
    mph = speed * 2.23694;
  }
  updateSpeedGauge(mph);

  // Keep track of speed for stats & chart
  speedReadings.push(mph);
  updateSpeedStats(mph);
  updateSpeedChart();

  // Heading -> cardinal direction text
  let headingText = "--";
  if (heading !== null && !isNaN(heading)) {
    headingText = convertHeadingToCardinal(heading);
  }
  document.getElementById("headingDisplay").textContent = headingText;

  // Distance traveled
  if (lastPosition) {
    const distKm = distanceBetween(lastPosition, pos.coords);
    distanceTraveled += distKm; // in km
    updateDistanceDisplay();
  }
  lastPosition = pos.coords;

  // Update map
  updateMap(latitude, longitude);

  // Optionally fetch weather on a timer or after significant move
  if (!lastPosition || distanceBetween(lastPosition, pos.coords) > 0.01) {
    fetchWeather(latitude, longitude);
  }
}

function handleError(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

/***************************************************************
 * TIME & CLOCK
 ***************************************************************/
function updateTimeDisplay() {
  const timeEl = document.getElementById("timeDisplay");
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();

  // Convert to 12-hour
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
 * WEATHER FETCH (FAHRENHEIT)
 ***************************************************************/
async function fetchWeather(lat, lon) {
  const apiKey = "2c523879d607be23b14fabb202cce5bc"; // Replace with your real key
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather API response was not OK.");

    const data = await response.json();
    const description = data.weather[0].description;
    const tempF = data.main.temp;

    document.getElementById("weatherDesc").textContent = description;
    document.getElementById("weatherTemp").textContent = tempF.toFixed(1);
  } catch (err) {
    console.error("Error fetching weather:", err);
    document.getElementById("weatherDesc").textContent = "N/A";
    document.getElementById("weatherTemp").textContent = "--";
  }
}

/***************************************************************
 * DARK MODE & OPTIONS MENU
 ***************************************************************/
const optionsBtn = document.getElementById("optionsBtn");
const optionsMenu = document.getElementById("optionsMenu");
const darkModeToggle = document.getElementById("darkModeToggle");

// Toggle menu
optionsBtn.addEventListener("click", () => {
  if (optionsMenu.style.display === "none" || !optionsMenu.style.display) {
    optionsMenu.style.display = "block";
  } else {
    optionsMenu.style.display = "none";
  }
});

// Dark / Light mode
darkModeToggle.addEventListener("change", (e) => {
  if (e.target.checked) {
    document.body.classList.remove("light-mode");
  } else {
    document.body.classList.add("light-mode");
  }
});

/***************************************************************
 * DISTANCE, MAX SPEED, AVG SPEED
 ***************************************************************/
function updateDistanceDisplay() {
  // distanceTraveled is in km
  const miles = distanceTraveled * 0.621371;
  document.getElementById("distanceDisplay").textContent = miles.toFixed(2);
}

function updateSpeedStats(currentMph) {
  // Max speed
  if (currentMph > maxSpeed) {
    maxSpeed = currentMph;
    document.getElementById("maxSpeedDisplay").textContent = maxSpeed.toFixed(1);
  }
  // Average speed
  const sum = speedReadings.reduce((acc, val) => acc + val, 0);
  const avg = sum / speedReadings.length;
  document.getElementById("avgSpeedDisplay").textContent = avg.toFixed(1);
}

/***************************************************************
 * MAP (LEAFLET)
 ***************************************************************/
function initMap() {
  map = L.map("map").setView([0, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);
}

function updateMap(lat, lon) {
  if (!map) return;
  map.setView([lat, lon], 16);

  if (!mapMarker) {
    mapMarker = L.marker([lat, lon]).addTo(map);
  } else {
    mapMarker.setLatLng([lat, lon]);
  }
}

/***************************************************************
 * SPEED OVER TIME CHART
 ***************************************************************/
function initSpeedChart() {
  speedChartData = [
    {
      x: [],
      y: [],
      type: "scatter",
      mode: "lines+markers",
      name: "Speed (mph)"
    }
  ];

  const layout = {
    title: "Speed Over Time",
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    xaxis: { title: "Time" },
    yaxis: { title: "mph", range: [0, 120] },
    margin: { t: 40, b: 50, l: 50, r: 20 }
  };

  Plotly.newPlot("speedChart", speedChartData, layout, {
    displayModeBar: false,
    displaylogo: false
  });
  speedChartInitialized = true;
}

function updateSpeedChart() {
  if (!speedChartInitialized) return;
  const latestSpeed = speedReadings[speedReadings.length - 1];
  const now = new Date().toLocaleTimeString();

  speedChartData[0].x.push(now);
  speedChartData[0].y.push(latestSpeed);

  Plotly.update("speedChart", speedChartData);
}

/***************************************************************
 * HELPERS
 ***************************************************************/
function distanceBetween(coordsA, coordsB) {
  // Haversine formula (returns distance in km)
  const R = 6371;
  const dLat = toRad(coordsB.latitude - coordsA.latitude);
  const dLon = toRad(coordsB.longitude - coordsA.longitude);
  const lat1 = toRad(coordsA.latitude);
  const lat2 = toRad(coordsB.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

// Convert heading in degrees to cardinal direction (e.g. "N", "NE", "E", etc.)
function convertHeadingToCardinal(deg) {
  if (deg >= 337.5 || deg < 22.5) return "N";
  if (deg >= 22.5 && deg < 67.5) return "NE";
  if (deg >= 67.5 && deg < 112.5) return "E";
  if (deg >= 112.5 && deg < 157.5) return "SE";
  if (deg >= 157.5 && deg < 202.5) return "S";
  if (deg >= 202.5 && deg < 247.5) return "SW";
  if (deg >= 247.5 && deg < 292.5) return "W";
  if (deg >= 292.5 && deg < 337.5) return "NW";
  return "--";
}
