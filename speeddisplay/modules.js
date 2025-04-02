// modules.js
export const MODULE_DEFINITIONS = [
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
        if (typeof createSpeedGauge === 'function') createSpeedGauge(0);
      }
    },
    {
      id: "headingGaugeModule",
      title: "Heading (°)",
      defaultVisible: false,
      render(containerEl) {
        containerEl.innerHTML = `<div id="headingGauge" style="width:100%;height:300px;"></div>`;
        if (typeof createHeadingGauge === 'function') createHeadingGauge(0);
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
        if (typeof initMap === 'function') initMap();
      }
    }
  ];
  