document.addEventListener('DOMContentLoaded', () => {
  // Global variable to store the currently selected clip button.
  let selectedClipButton = null;

  // Define play modes:
  const playModes = [
    { color: '#0000ff', label: 'Play Once', description: 'Plays from the beginning.' },
    { color: '#00ff00', label: 'Loop', description: 'Continuously loops the clip.' },
    { color: '#ffa500', label: 'High Pitch/Fast', description: 'Plays faster for a high-pitched sound.' },
    { color: '#ff7f00', label: 'Fast', description: 'Fast playback speed.' },
    { color: '#ff4500', label: 'Extra Fast', description: 'Even faster playback speed.' },
    { color: '#008080', label: 'Low Pitch/Slow', description: 'Plays slower for a deeper sound.' },
    { color: '#000080', label: 'Extra Slow', description: 'Even slower playback speed.' }
  ];

  let mediaRecorder;
  let audioChunks = [];
  let clipCounter = {};
  let savedClips = JSON.parse(localStorage.getItem('savedClips')) || [];

  // Info Modal functions.
  const infoModal = document.getElementById('infoModal');
  const infoButton = document.getElementById('infoButton');
  const closeModal = document.getElementById('closeModal');
  if (infoButton) {
    infoButton.addEventListener('click', () => { infoModal.style.display = 'block'; });
  }
  if (closeModal) {
    closeModal.addEventListener('click', () => { infoModal.style.display = 'none'; });
  }
  window.onclick = (e) => {
    if (e.target === infoModal) { infoModal.style.display = 'none'; }
  };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && infoModal.style.display === 'block') {
      infoModal.style.display = 'none';
    }
  });

  // Utility functions
  const saveClipsToStorage = () => localStorage.setItem('savedClips', JSON.stringify(savedClips));

  function generateUniqueClipName(baseName) {
    if (clipCounter[baseName] === undefined) {
      clipCounter[baseName] = 1;
      return baseName;
    }
    clipCounter[baseName]++;
    return `${baseName} (${clipCounter[baseName]})`;
  }

  function saveClip(name, dataURL, pos = null, mode = 0) {
    const clip = { name, data: dataURL, mode };
    if (pos) clip.pos = pos;
    savedClips.push(clip);
    saveClipsToStorage();
  }

  function updateClipPosition(name, pos) {
    savedClips = savedClips.map(clip => clip.name === name ? { ...clip, pos } : clip);
    saveClipsToStorage();
  }

  function updateClipMode(name, mode) {
    savedClips = savedClips.map(clip => clip.name === name ? { ...clip, mode } : clip);
    saveClipsToStorage();
  }

  function deleteClip(name, buttonElement) {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      savedClips = savedClips.filter(clip => clip.name !== name);
      saveClipsToStorage();
      if (buttonElement && buttonElement.parentNode) {
        buttonElement.parentNode.removeChild(buttonElement);
      }
      if (selectedClipButton === buttonElement) { selectedClipButton = null; }
    }
  }

  function triggerDownload(name, dataURL) {
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `${name}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Export and import board state.
  document.getElementById('exportButton').addEventListener('click', () => {
    const boardState = JSON.stringify(savedClips);
    const blob = new Blob([boardState], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'board_state.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  document.getElementById('importButton').addEventListener('click', () => {
    document.getElementById('boardFileInput').click();
  });

  document.getElementById('boardFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        savedClips = JSON.parse(event.target.result);
        saveClipsToStorage();
        document.getElementById('buttonsContainer').innerHTML = '';
        loadClips();
      } catch (err) {
        alert('Error loading board file. Please ensure it is valid JSON.');
      }
    };
    reader.readAsText(file);
  });

  // --- Drag-and-Drop: Always active ---
  function addDragAndDrop(button, container, name, dataURL) {
    let startX, startY, initLeft, initTop, isDragging = false;
    button.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      startY = e.clientY;
      const rect = button.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      initLeft = rect.left - containerRect.left;
      initTop = rect.top - containerRect.top;
      isDragging = false;
      button.setPointerCapture(e.pointerId);
      console.log(`Pointer down at (${startX}, ${startY})`);
    });
    button.addEventListener('pointermove', (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        isDragging = true;
        console.log('Dragging started');
      }
      if (isDragging) {
        const containerRect = container.getBoundingClientRect();
        let newLeft = Math.max(0, Math.min(initLeft + dx, containerRect.width - button.offsetWidth));
        let newTop = Math.max(0, Math.min(initTop + dy, containerRect.height - button.offsetHeight));
        button.style.position = 'absolute';
        button.style.left = newLeft + 'px';
        button.style.top = newTop + 'px';
        console.log(`Button moved to (${newLeft}, ${newTop})`);
      }
    });
    button.addEventListener('pointerup', (e) => {
      button.releasePointerCapture(e.pointerId);
      if (isDragging) {
        const containerRect = container.getBoundingClientRect();
        const finalLeft = Math.max(0, Math.min(parseInt(button.style.left), containerRect.width - button.offsetWidth));
        const finalTop = Math.max(0, Math.min(parseInt(button.style.top), containerRect.height - button.offsetHeight));
        button.style.left = `${finalLeft}px`;
        button.style.top = `${finalTop}px`;
        updateClipPosition(name, { left: finalLeft, top: finalTop });
        console.log(`Button dropped at (${finalLeft}, ${finalTop})`);
        // Check if dropped over toolbar zones.
        const deleteZone = document.getElementById('deleteZone').getBoundingClientRect();
        const saveZone = document.getElementById('saveZone').getBoundingClientRect();
        const btnRect = button.getBoundingClientRect();
        const centerX = btnRect.left + btnRect.width / 2;
        const centerY = btnRect.top + btnRect.height / 2;
        if (centerX >= deleteZone.left && centerX <= deleteZone.right &&
            centerY >= deleteZone.top && centerY <= deleteZone.bottom) {
          deleteClip(name, button);
          console.log('Button dropped in delete zone');
          return;
        }
        if (centerX >= saveZone.left && centerX <= saveZone.right &&
            centerY >= saveZone.top && centerY <= saveZone.bottom) {
          triggerDownload(name, dataURL);
          console.log('Button dropped in save zone');
        }
      }
      isDragging = false;
    });
    // Prevent default touch scrolling interference.
    button.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
  }

  // --- Visual Playback Indicator ---
  function startPlayingAnimation() {
    let hue = 0;
    this.playingAnim = setInterval(() => {
      hue = (hue + 5) % 360;
      this.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
    }, 100);
  }

  function stopPlayingAnimation() {
    if (this.playingAnim) {
      clearInterval(this.playingAnim);
      this.playingAnim = null;
      this.style.backgroundColor = playModes[this.modeIndex].color;
    }
  }

  function setAudioProperties(audio, modeIndex) {
    if (modeIndex === 0) { audio.loop = false; audio.playbackRate = 1.0; }
    else if (modeIndex === 1) { audio.loop = true; audio.playbackRate = 1.0; }
    else if (modeIndex === 2) { audio.loop = false; audio.playbackRate = 1.5; }
    else if (modeIndex === 3) { audio.loop = false; audio.playbackRate = 1.25; }
    else if (modeIndex === 4) { audio.loop = false; audio.playbackRate = 2.0; }
    else if (modeIndex === 5) { audio.loop = false; audio.playbackRate = 0.75; }
    else if (modeIndex === 6) { audio.loop = false; audio.playbackRate = 0.5; }
  }

  function addAudioButton(dataURL, name, pos, savedMode = 0) {
    const container = document.getElementById('buttonsContainer');
    const audio = new Audio(dataURL);
    let modeIndex = savedMode;
    setAudioProperties(audio, modeIndex);
    
    const button = document.createElement('button');
    button.className = 'sound-button';
    button.textContent = name;
    button.style.backgroundColor = playModes[modeIndex].color;
    button.dataset.clipName = name;
    button.dataset.dataURL = dataURL;
    button.modeIndex = modeIndex;
    button.audio = audio; // Store the audio instance in the button.
    
    if (pos && pos.left !== undefined && pos.top !== undefined) {
      button.style.position = 'absolute';
      button.style.left = pos.left + 'px';
      button.style.top = pos.top + 'px';
    }
    
    // Click: select and process playback.
    button.addEventListener('click', function(e) {
      if (e.defaultPrevented) return;
      if (selectedClipButton && selectedClipButton !== button) {
        selectedClipButton.style.border = '';
      }
      selectedClipButton = button;
      button.style.border = '2px solid white';
      // Stop any other playing clip.
      stopAllClips();
      // Playback logic.
      if (button.modeIndex === 0) {
        audio.currentTime = 0;
        audio.play();
      } else if (button.modeIndex === 1) {
        if (audio.paused) { audio.currentTime = 0; audio.play(); }
        else { audio.pause(); audio.currentTime = 0; }
      } else if (button.modeIndex === 2 || button.modeIndex === 3 || button.modeIndex === 4 || button.modeIndex === 5 || button.modeIndex === 6) {
        audio.currentTime = 0;
        audio.play();
      }
    });
    
    // Right-click cycles play modes.
    button.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      modeIndex = (modeIndex + 1) % playModes.length;
      button.style.backgroundColor = playModes[modeIndex].color;
      setAudioProperties(audio, modeIndex);
      updateClipMode(name, modeIndex);
      button.modeIndex = modeIndex;
    });
    
    // Enable drag and drop (without holding Shift).
    addDragAndDrop(button, container, name, dataURL);
    
    audio.addEventListener('play', startPlayingAnimation.bind(button));
    audio.addEventListener('pause', stopPlayingAnimation.bind(button));
    audio.addEventListener('ended', stopPlayingAnimation.bind(button));
    
    container.appendChild(button);
  }

  // Stop any other playing clip.
  function stopAllClips() {
    const buttons = document.querySelectorAll('.sound-button');
    buttons.forEach(button => {
      if (button.audio) {
        button.audio.pause();
        button.audio.currentTime = 0;
        stopPlayingAnimation.call(button);
      }
    });
  }

  // Load saved clips
  function loadClips() {
    document.getElementById('buttonsContainer').innerHTML = '';
    savedClips.forEach(clip => {
      addAudioButton(clip.data, clip.name, clip.pos, clip.mode || 0);
    });
  }

  window.onload = loadClips;
});