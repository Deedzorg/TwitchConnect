document.addEventListener('DOMContentLoaded', () => {
  // --------------------------
  // Global Variables & State
  // --------------------------
  let selectedClipButton = null;
  let mediaRecorder = null;
  let audioChunks = [];
  const clipCounter = {};
  let savedClips = JSON.parse(localStorage.getItem('savedClips')) || [];

  // Define play modes with colors, labels, and behavior settings.
  const playModes = [
    { color: '#0000ff', label: 'Play Once', description: 'Plays the clip from the beginning.', settings: { loop: false, playbackRate: 1.0 } },
    { color: '#00ff00', label: 'Loop', description: 'Continuously loops the clip.', settings: { loop: true, playbackRate: 1.0 } },
    { color: '#ffa500', label: 'High Pitch/Fast', description: '1.5x speed for a high-pitched sound.', settings: { loop: false, playbackRate: 1.5 } },
    { color: '#ff7f00', label: 'Fast', description: 'Fast playback speed (1.25x).', settings: { loop: false, playbackRate: 1.25 } },
    { color: '#ff4500', label: 'Extra Fast', description: 'Even faster playback (2x).', settings: { loop: false, playbackRate: 2.0 } },
    { color: '#008080', label: 'Low Pitch/Slow', description: 'Plays slower for a deeper sound (0.75x).', settings: { loop: false, playbackRate: 0.75 } },
    { color: '#000080', label: 'Extra Slow', description: 'Even slower playback (0.5x).', settings: { loop: false, playbackRate: 0.5 } }
  ];

  // --------------------------
  // Modal & Toolbar Setup
  // --------------------------
  const infoModal = document.getElementById('infoModal');
  document.getElementById('infoButton').addEventListener('click', () => infoModal.style.display = 'block');
  document.getElementById('closeModal').addEventListener('click', () => infoModal.style.display = 'none');
  window.onclick = event => { if (event.target === infoModal) infoModal.style.display = 'none'; };

  // --------------------------
  // Utility Functions
  // --------------------------
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

  function updateClip(name, newData) {
    savedClips = savedClips.map(clip => clip.name === name ? { ...clip, data: newData } : clip);
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
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    savedClips = savedClips.filter(clip => clip.name !== name);
    saveClipsToStorage();
    if (buttonElement?.parentNode) buttonElement.parentNode.removeChild(buttonElement);
    if (selectedClipButton === buttonElement) selectedClipButton = null;
  }

  function triggerDownload(name, dataURL) {
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `${name}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // --------------------------
  // Recording & File Upload
  // --------------------------
  function startRecording(button) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            let baseName = document.getElementById('clipName').value || 'Recorded Clip';
            const name = generateUniqueClipName(baseName);
            saveClip(name, reader.result);
            addAudioButton(reader.result, name);
          };
        };
        mediaRecorder.start();
        button.textContent = 'Stop Recording';
        button.classList.add('recording');
      })
      .catch(err => alert('Error accessing microphone: ' + err.message));
  }

  document.getElementById('recordButton').addEventListener('click', function () {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      startRecording(this);
    } else {
      mediaRecorder.stop();
      this.textContent = 'Start Recording';
      this.classList.remove('recording');
    }
  });

  document.getElementById('fileInput').addEventListener('change', function (event) {
    Array.from(event.target.files).forEach(file => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const name = generateUniqueClipName(file.name);
        saveClip(name, reader.result);
        addAudioButton(reader.result, name);
      };
    });
  });

  // --------------------------
  // Export/Import Board State
  // --------------------------
  document.getElementById('exportButton').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(savedClips)], { type: 'application/json' });
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
        document.getElementById('buttonsContainer').innerHTML = document.getElementById('toolbar').outerHTML;
        loadClips();
      } catch (err) {
        alert('Error loading board file. Please make sure it is valid JSON.');
      }
    };
    reader.readAsText(file);
  });

  // --------------------------
  // Audio Button & Playback
  // --------------------------
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
    });
    button.addEventListener('pointermove', (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        isDragging = true;
      }
      if (isDragging) {
        const containerRect = container.getBoundingClientRect();
        let newLeft = Math.max(0, Math.min(initLeft + dx, containerRect.width - button.offsetWidth));
        let newTop = Math.max(0, Math.min(initTop + dy, containerRect.height - button.offsetHeight));
        button.style.position = 'absolute';
        button.style.left = newLeft + 'px';
        button.style.top = newTop + 'px';
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
        // Check if dropped over toolbar zones.
        const deleteZone = document.getElementById('deleteZone').getBoundingClientRect();
        const saveZone = document.getElementById('saveZone').getBoundingClientRect();
        const btnRect = button.getBoundingClientRect();
        const centerX = btnRect.left + btnRect.width / 2;
        const centerY = btnRect.top + btnRect.height / 2;
        if (centerX >= deleteZone.left && centerX <= deleteZone.right &&
            centerY >= deleteZone.top && centerY <= deleteZone.bottom) {
          deleteClip(name, button);
          return;
        }
        if (centerX >= saveZone.left && centerX <= saveZone.right &&
            centerY >= saveZone.top && centerY <= saveZone.bottom) {
          triggerDownload(name, dataURL);
        }
      }
      isDragging = false;
    });
    // Prevent default touch scrolling interference.
    button.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
  }

  function startPlayingAnimation(button) {
    let hue = 0;
    button.playingAnim = setInterval(() => {
      hue = (hue + 5) % 360;
      button.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
    }, 100);
  }

  function stopPlayingAnimation(button) {
    if (button.playingAnim) {
      clearInterval(button.playingAnim);
      button.playingAnim = null;
      button.style.backgroundColor = playModes[button.modeIndex].color;
    }
  }

  function addAudioButton(dataURL, name, pos = null, savedMode = 0) {
    const container = document.getElementById('buttonsContainer');
    const audio = new Audio(dataURL);
    let modeIndex = savedMode;
    // Apply mode settings.
    const applyAudioSettings = () => {
      const settings = playModes[modeIndex].settings;
      audio.loop = settings.loop;
      audio.playbackRate = settings.playbackRate;
    };
    applyAudioSettings();

    // Create the button element.
    const button = document.createElement('button');
    button.className = 'sound-button';
    button.dataset.clipName = name;
    button.dataset.dataURL = dataURL;
    button.modeIndex = modeIndex;
    button.audio = audio; // Store the audio instance in the button.
    // Set default background from play mode.
    button.style.backgroundColor = playModes[modeIndex].color;
    // Create a progress bar element inside the button.
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    // Initially hidden.
    progressBar.style.width = '0%';
    progressBar.style.height = '5px';
    progressBar.style.backgroundColor = 'rgba(0,0,0,0.5)';
    progressBar.style.position = 'absolute';
    progressBar.style.bottom = '0';
    progressBar.style.left = '0';
    button.style.position = 'relative';
    button.appendChild(progressBar);

    // Position the button if coordinates provided.
    if (pos && pos.left !== undefined && pos.top !== undefined) {
      button.style.position = 'absolute';
      button.style.left = pos.left + 'px';
      button.style.top = pos.top + 'px';
    }

    // --------------------------
    // Update Progress Bar
    // --------------------------
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = progress + '%';
      }
    });
    audio.addEventListener('ended', () => {
      progressBar.style.width = '0%';
    });

    // --------------------------
    // Click vs. Drag Handling
    // --------------------------
    let isDragging = false;
    let dragThreshold = 5; // pixels
    let startX, startY;

    button.addEventListener('mousedown', e => {
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
    });

    button.addEventListener('click', e => {
      // If a drag occurred, do not trigger playback.
      if (isDragging) return;
      // Clear selection from previous button.
      if (selectedClipButton && selectedClipButton !== button) {
        selectedClipButton.style.outline = '';
      }
      selectedClipButton = button;
      button.style.outline = '2px solid white';

      // Start playback.
      audio.currentTime = 0;
      audio.play();
    });

    // --------------------------
    // Right-Click: Cycle Modes
    // --------------------------
    button.addEventListener('contextmenu', e => {
      e.preventDefault();
      modeIndex = (modeIndex + 1) % playModes.length;
      button.style.backgroundColor = playModes[modeIndex].color;
      applyAudioSettings();
      updateClipMode(name, modeIndex);
    });

    // --------------------------
    // Drag & Drop (No Modifier Required)
    // --------------------------
    button.addEventListener('mousemove', e => {
      // Check if movement exceeds threshold.
      if (Math.abs(e.clientX - startX) > dragThreshold || Math.abs(e.clientY - startY) > dragThreshold) {
        isDragging = true;
      }
    });

    button.addEventListener('dragstart', e => {
      e.preventDefault();
    });

    button.addEventListener('mousedown', e => {
      // Start drag.
      const rect = button.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      button.style.position = 'absolute';
      button.style.left = (rect.left - containerRect.left) + 'px';
      button.style.top = (rect.top - containerRect.top) + 'px';

      const onMouseMove = e2 => {
        let newLeft = e2.clientX - containerRect.left - offsetX;
        let newTop = e2.clientY - containerRect.top - offsetY;
        newLeft = Math.max(0, Math.min(newLeft, containerRect.width - rect.width));
        newTop = Math.max(0, Math.min(newTop, containerRect.height - rect.height));
        button.style.left = newLeft + 'px';
        button.style.top = newTop + 'px';
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // Check for toolbar zones.
        const deleteZone = document.getElementById('deleteZone').getBoundingClientRect();
        const saveZone = document.getElementById('saveZone').getBoundingClientRect();
        const btnRect = button.getBoundingClientRect();
        const centerX = btnRect.left + btnRect.width / 2;
        const centerY = btnRect.top + btnRect.height / 2;
        if (centerX >= deleteZone.left && centerX <= deleteZone.right &&
            centerY >= deleteZone.top && centerY <= deleteZone.bottom) {
          deleteClip(name, button);
          return;
        }
        if (centerX >= saveZone.left && centerX <= saveZone.right &&
            centerY >= saveZone.top && centerY <= saveZone.bottom) {
          triggerDownload(name, dataURL);
        }
        const left = parseInt(button.style.left, 10);
        const top = parseInt(button.style.top, 10);
        updateClipPosition(name, { left, top });
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    addDragAndDrop(button, container, name, dataURL);

    audio.addEventListener('play', () => startPlayingAnimation(button));
    audio.addEventListener('pause', () => stopPlayingAnimation(button));
    audio.addEventListener('ended', () => stopPlayingAnimation(button));

    container.appendChild(button);
  }

  // --------------------------
  // Load Saved Clips
  // --------------------------
  function loadClips() {
    savedClips.forEach(clip => {
      addAudioButton(clip.data, clip.name, clip.pos, clip.mode || 0);
    });
  }

  window.onload = loadClips;
});
