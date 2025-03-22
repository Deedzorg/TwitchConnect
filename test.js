document.addEventListener('DOMContentLoaded', () => {
  // ...existing code...

  // Utility functions
  const saveClipsToStorage = () => localStorage.setItem('savedClips', JSON.stringify(savedClips));

  function generateUniqueClipName(baseName) {
    // ...existing code...
  }

  function saveClip(name, dataURL, pos = null, mode = 0) {
    // ...existing code...
  }

  function updateClipPosition(name, pos) {
    // ...existing code...
  }

  function updateClipMode(name, mode) {
    // ...existing code...
  }

  function deleteClip(name, buttonElement) {
    // ...existing code...
  }

  function triggerDownload(name, dataURL) {
    // ...existing code...
  }

  // Export and import board state.
  // ...existing code...

  // --- Drag-and-Drop: Refactored ---
  function addDragAndDrop(button, container, name, dataURL) {
    let startX, startY, initLeft, initTop, isDragging = false;

    const onPointerDown = (e) => {
      startX = e.clientX;
      startY = e.clientY;
      const rect = button.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      initLeft = rect.left - containerRect.left;
      initTop = rect.top - containerRect.top;
      isDragging = false;
      button.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
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
        button.style.left = `${newLeft}px`;
        button.style.top = `${newTop}px`;
      }
    };

    const onPointerUp = (e) => {
      button.releasePointerCapture(e.pointerId);
      if (isDragging) {
        const containerRect = container.getBoundingClientRect();
        const finalLeft = Math.max(0, Math.min(parseInt(button.style.left), containerRect.width - button.offsetWidth));
        const finalTop = Math.max(0, Math.min(parseInt(button.style.top), containerRect.height - button.offsetHeight));
        button.style.left = `${finalLeft}px`;
        button.style.top = `${finalTop}px`;
        updateClipPosition(name, { left: finalLeft, top: finalTop });

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
    };

    button.addEventListener('pointerdown', onPointerDown);
    button.addEventListener('pointermove', onPointerMove);
    button.addEventListener('pointerup', onPointerUp);
    button.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  // --- Visual Playback Indicator ---
  function startPlayingAnimation() {
    // ...existing code...
  }

  function stopPlayingAnimation() {
    // ...existing code...
  }

  function setAudioProperties(audio, modeIndex) {
    // ...existing code...
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
      button.style.left = `${pos.left}px`;
      button.style.top = `${pos.top}px`;
    }
    
    // Click: select and process playback.
    button.addEventListener('click', function(e) {
      if (e.defaultPrevented) return;
      if (selectedClipButton && selectedClipButton !== button) {
        selectedClipButton.style.border = '';
      }
      selectedClipButton = button;
      button.style.border = '2px solid white';
      stopAllClips();
      if (button.modeIndex === 0) {
        audio.currentTime = 0;
        audio.play();
      } else if (button.modeIndex === 1) {
        if (audio.paused) { audio.currentTime = 0; audio.play(); }
        else { audio.pause(); audio.currentTime = 0; }
      } else {
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
    
    addDragAndDrop(button, container, name, dataURL);
    
    audio.addEventListener('play', startPlayingAnimation.bind(button));
    audio.addEventListener('pause', stopPlayingAnimation.bind(button));
    audio.addEventListener('ended', stopPlayingAnimation.bind(button));
    
    container.appendChild(button);
  }

  // Stop any other playing clip.
  function stopAllClips() {
    // ...existing code...
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
