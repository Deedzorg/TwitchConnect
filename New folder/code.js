// Global variable to store the currently selected clip button.
let selectedClipButton = null;

// Define play modes (play/stop, loop):
const playModes = [
  { color: '#00ff00', label: 'Play/Stop', description: 'Plays clip once (or toggles pause).' },
  { color: '#ff0000', label: 'Loop', description: 'Continuously loops the clip. Click to stop.' },
  { color: '#0000ff', label: 'Play Once', description: 'Always plays clip from beginning. Stop using main clip or set audio again.' },
  { color: '#ffa500', label: 'Fast (Play/Stop)', description: 'Higher pitch and faster playback rate (1.5x). Click again to stop.' },
  { color: '#ffff00', label: 'Fast Loop', description: 'Continuously loops the clip at higher (x2.0) speed until stopped.' },
  { color: '#800080', label: 'Hold to Play', description: 'Click and hold to play; release to pause.' }
];

// Constants
const DRAG_DELAY = 100; // milliseconds

let mediaRecorder;
let audioChunks = [];
let clipCounter = {};
// savedClips now includes mode along with position.
let savedClips = JSON.parse(localStorage.getItem('savedClips')) || [];

// Info Modal functions.
const infoModal = document.getElementById('infoModal');
const infoButton = document.getElementById('infoButton');
const closeModal = document.getElementById('closeModal');

if (infoButton) {
  infoButton.addEventListener('click', () => {
    infoModal.style.display = 'block';
  });
}

if (closeModal) {
  closeModal.addEventListener('click', () => {
    infoModal.style.display = 'none';
  });
}

window.onclick = function (event) {
  if (event.target == infoModal && infoModal) {
    infoModal.style.display = 'none';
  }
};

// Recording function for new clips.
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
          let clipName = document.getElementById('clipName').value || 'Recorded Clip';
          clipName = generateUniqueClipName(clipName); // Ensure unique names
          saveClip(clipName, reader.result, null, 0);
          addAudioButton(reader.result, clipName, null, 0);
        };
        reader.onerror = (error) => {
          console.error("Error reading audio as data URL:", error);
          alert("Error converting recorded audio. Please try again.");
        }
      };
      mediaRecorder.start();
      if (button) { //Check if button is valid before setting values
        button.textContent = 'Stop Recording';
        button.classList.add('recording');
      }
    })
    .catch(error => {
      if (error.name === 'NotAllowedError') {
        alert('Microphone access was denied. Please allow access to this feature.');
      } else {
        console.error('Error accessing microphone:', error);
        alert('Error accessing microphone. Please check your microphone settings.'); // User feedback
      }
    });
}

function generateUniqueClipName(baseName) {
  let name = baseName;
  if (clipCounter[name] === undefined) {
    clipCounter[name] = 1;
  } else {
    clipCounter[name]++;
    name += ` (${clipCounter[name]})`;
  }
  return name;
}

const recordButton = document.getElementById('recordButton');
if (recordButton) {
  recordButton.addEventListener('click', function () {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      startRecording(this);
    } else {
      mediaRecorder.stop();
      this.textContent = 'Start Recording';
      this.classList.remove('recording');
    }
  });
}

const fileInput = document.getElementById('fileInput');
if (fileInput) {
  fileInput.addEventListener('change', function (event) {
    Array.from(event.target.files).forEach(file => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        saveClip(file.name, reader.result, null, 0);
        addAudioButton(reader.result, file.name, null, 0);
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        alert("Error reading file.  Please try a different file.");  // User feedback
      }
    });
  });
}

// Export board state to a JSON file.
const exportButton = document.getElementById('exportButton');
if (exportButton) {
  exportButton.addEventListener('click', () => {
    exportBoardState();
  });
}

// Import board state from a JSON file.
const importButton = document.getElementById('importButton');
if (importButton) {
  importButton.addEventListener('click', () => {
    const boardFileInput = document.getElementById('boardFileInput');
    if (boardFileInput) {
      boardFileInput.click();
    } else {
      console.error("boardFileInput element not found.");
      alert("Error: Could not open file selector.");
    }
  });
}

const boardFileInput = document.getElementById('boardFileInput');
if (boardFileInput) {
  boardFileInput.addEventListener('change', (e) => {
    importBoardState(e);
  });
}

function exportBoardState() {
  const boardState = JSON.stringify(savedClips);
  const blob = new Blob([boardState], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'board_state.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function importBoardState(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedClips = JSON.parse(e.target.result);
      if (!Array.isArray(importedClips)) {
        throw new Error("Invalid board file format.  Expected an array of clips.");
      }
      savedClips = importedClips;
      localStorage.setItem('savedClips', JSON.stringify(savedClips));
      // Clear existing board buttons (retain toolbar).
      const buttonsContainer = document.getElementById('buttonsContainer');
      const toolbar = document.getElementById('toolbar');
      if (buttonsContainer && toolbar) {
        buttonsContainer.innerHTML = toolbar.outerHTML;
      }
      loadClips();
    } catch (err) {
      console.error("Error loading board file:", err);
      alert('Error loading board file. Please make sure it is valid JSON.');
    }
  };
  reader.readAsText(file);
  reader.onerror = (error) => {
    console.error("Error reading file:", error);
    alert("Error reading board file.  Please try again.");
  }
}

function saveClip(name, data, position, mode = 0) {
  const clip = { name, data, mode };
  if (position) {
    clip.position = position;
  }
  savedClips.push(clip);
  localStorage.setItem('savedClips', JSON.stringify(savedClips));
}

function updateClipInStorage(name, data) {
  savedClips = savedClips.map(clip => clip.name === name ? { ...clip, data } : clip);
  localStorage.setItem('savedClips', JSON.stringify(savedClips));
}

function updateClipPosition(name, position) {
  savedClips = savedClips.map(clip => clip.name === name ? { ...clip, position } : clip);
  localStorage.setItem('savedClips', JSON.stringify(savedClips));
}

function updateClipMode(name, mode) {
  savedClips = savedClips.map(clip => clip.name === name ? { ...clip, mode } : clip);
  localStorage.setItem('savedClips', JSON.stringify(savedClips));
}

function deleteClip(name, buttonElement) {
  if (confirm(`Are you sure you want to delete "${name}"?`)) {
    savedClips = savedClips.filter(clip => clip.name !== name);
    localStorage.setItem('savedClips', JSON.stringify(savedClips));
    if (buttonElement && buttonElement.parentNode) {
      buttonElement.parentNode.removeChild(buttonElement);
    }
    if (selectedClipButton === buttonElement) {
      selectedClipButton = null;
    }
  }
}

function triggerDownload(name, dataURL) {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = name + '.wav';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Highlight zone logic (delete/save)
function highlightZone(zoneId, shouldHighlight) {
  const zone = document.getElementById(zoneId);
  if (zone) {
    if (shouldHighlight) {
      zone.classList.add('highlight');
    } else {
      zone.classList.remove('highlight');
    }
  }
}

function updateToolbarHighlights() {
  if (selectedClipButton) {
    highlightZone('deleteZone', true);
    highlightZone('saveZone', true);
  } else {
    highlightZone('deleteZone', false);
    highlightZone('saveZone', false);
  }
}

// Add click listeners to the toolbar zones for selected clip actions.
const deleteZone = document.getElementById('deleteZone');
if (deleteZone) {
  deleteZone.addEventListener('click', () => {
    if (selectedClipButton) {
      deleteClip(selectedClipButton.dataset.clipName, selectedClipButton);
      selectedClipButton = null;
      updateToolbarHighlights(); // Update toolbar highlighting
    } else {
      alert("No clip selected.");
    }
  });
}

const saveZone = document.getElementById('saveZone');
if (saveZone) {
  saveZone.addEventListener('click', () => {
    if (selectedClipButton) {
      triggerDownload(selectedClipButton.dataset.clipName, selectedClipButton.dataset.dataURL);
    } else {
      alert("No clip selected.");
    }
  });
}

function loadClips() {
  const buttonsContainer = document.getElementById('buttonsContainer');
  if (buttonsContainer) {
    buttonsContainer.innerHTML = "";  // Clear existing clips
  }
  savedClips.forEach(clip => {
    addAudioButton(clip.data, clip.name, clip.position, clip.mode || 0);
  });
  updateToolbarHighlights(); // Initial highlighting update
}

// --- Drag and drop ---
function addDragAndDrop(button, container, name, dataURL) {
  let dragging = false;
  let startPointerX = 0, startPointerY = 0;
  let startLeft = 0, startTop = 0;
  let dragTimeout = null;
  let animationFrameId = null;

  button.addEventListener('pointerdown', function (e) {
    const rect = button.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    // Store pointer starting position.
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    // Store button's starting position relative to container.
    startLeft = rect.left - containerRect.left;
    startTop = rect.top - containerRect.top;
    dragging = false;
    button.isDragging = false;

    // Start a timer to enable dragging after a delay (e.g., 100ms).
    dragTimeout = setTimeout(() => {
      dragging = true;
      button.isDragging = true;
      button.classList.add('dragging');
    }, DRAG_DELAY);

    button.setPointerCapture(e.pointerId);
  });

  button.addEventListener('pointermove', function (e) {
    if (!dragging) return;

    const containerRect = container.getBoundingClientRect();
    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;

    let newLeft = Math.max(0, Math.min(startLeft + dx, containerRect.width - button.offsetWidth));
    let newTop = Math.max(0, Math.min(startTop + dy, containerRect.height - button.offsetHeight));

    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(() => {
        button.style.left = `${newLeft}px`;
        button.style.top = `${newTop}px`;

        // Highlight delete and save zones when hovered over
        const deleteZoneEl = document.getElementById('deleteZone');
        const saveZoneEl = document.getElementById('saveZone');

        if (deleteZoneEl && saveZoneEl) {
          const deleteZone = deleteZoneEl.getBoundingClientRect();
          const saveZone = saveZoneEl.getBoundingClientRect();
          const btnRect = button.getBoundingClientRect();
          const centerX = btnRect.left + btnRect.width / 2;
          const centerY = btnRect.top + btnRect.height / 2;

          const isOverDeleteZone = centerX >= deleteZone.left && centerX <= deleteZone.right && centerY >= deleteZone.top && centerY <= deleteZone.bottom;
          highlightZone('deleteZone', isOverDeleteZone);

          const isOverSaveZone = centerX >= saveZone.left && centerX <= saveZone.right && centerY >= saveZone.top && centerY >= saveZone.bottom;
          highlightZone('saveZone', isOverSaveZone);
        }

        animationFrameId = null;
      });
    }
  });

  button.addEventListener('pointerup', function (e) {
    clearTimeout(dragTimeout);
    button.releasePointerCapture(e.pointerId);

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    if (dragging) {
      button.classList.remove('dragging');

      const containerRect = container.getBoundingClientRect();
      const deleteZoneEl = document.getElementById('deleteZone');
      const saveZoneEl = document.getElementById('saveZone');

      if (deleteZoneEl && saveZoneEl) {
        const deleteZone = deleteZoneEl.getBoundingClientRect();
        const saveZone = saveZoneEl.getBoundingClientRect();
        const btnRect = button.getBoundingClientRect();
        const centerX = btnRect.left + btnRect.width / 2;
        const centerY = btnRect.top + btnRect.height / 2;

        const isOverDeleteZone = centerX >= deleteZone.left && centerX <= deleteZone.right && centerY >= deleteZone.top && centerY <= deleteZone.bottom;
        if (isOverDeleteZone) {
          deleteClip(name, button);
          highlightZone('deleteZone', false);
          return;
        }

        const isOverSaveZone = centerX >= saveZone.left && centerX <= saveZone.right && centerY >= saveZone.top && centerY >= saveZone.bottom;
        if (isOverSaveZone) {
          triggerDownload(name, dataURL);
          highlightZone('saveZone', false);
        }
      }

      const finalLeft = Math.max(0, Math.min(parseInt(button.style.left), containerRect.width - button.offsetWidth));
      const finalTop = Math.max(0, Math.min(parseInt(button.style.top), containerRect.height - button.offsetHeight));
      button.style.left = `${finalLeft}px`;
      button.style.top = `${finalTop}px`;
      updateClipPosition(name, { left: finalLeft, top: finalTop });

      highlightZone('deleteZone', false);
      highlightZone('saveZone', false);
    }
    dragging = false;
  });

  button.addEventListener('touchmove', function (e) {
    e.preventDefault();
  }, { passive: false });
}

// --- Visual playback indicator ---
function startPlayingAnimation(button, audio) {
  const duration = audio.duration * 1000; // Convert to milliseconds
  let startTime = null;

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min((elapsed / duration) * 100, 100);
    button.style.background = `linear-gradient(to right, hsl(120, 100%, 50%) ${progress}%, ${playModes[button.modeIndex].color} ${progress}%)`;

    if (elapsed < duration) {
      button.playingAnim = requestAnimationFrame(animate);
    } else {
      stopPlayingAnimation(button);
    }
  }

  button.playingAnim = requestAnimationFrame(animate);
}

function stopPlayingAnimation(button) {
  if (button.playingAnim) {
    cancelAnimationFrame(button.playingAnim);
    button.playingAnim = null;
    button.style.background = playModes[button.modeIndex].color;
  }
}

// --- Button creation ---
function createAudioElement(dataURL) {
    const audio = new Audio(dataURL);
      audio.addEventListener('error', (error) => {
          console.error("Error loading audio:", error);
          alert("Error loading audio.  The file may be corrupted or in an unsupported format.");
      });
    return audio;
}

function createButtonElement(name, modeIndex, dataURL) {
    const button = document.createElement('button');
    button.className = 'sound-button';
    button.textContent = name;
    button.style.backgroundColor = playModes[modeIndex].color;
    button.dataset.clipName = name;
    button.dataset.dataURL = dataURL;
    button.modeIndex = modeIndex;
    button.isPlaying = false; //Add a property to track the playing state
    button.isHoldPlaying = false;
    button.initialVolume = 0.5;

    button.setAttribute('aria-label', `Sound clip: ${name}, Play mode: ${playModes[modeIndex].label}`); // Accessibility

    return button;
}

function attachButtonListeners(button, audio, modeIndex, name) {
  const container = document.getElementById('buttonsContainer');

  button.addEventListener('pointerdown', function(e) {
    //Check for 'Shift' pressed during "dragging", but instead we just always focus so drag has to have shiftKey modifier
    //This selection logic happens regardless
    if (selectedClipButton && selectedClipButton !== button) {
      selectedClipButton.classList.remove('selected');
    }
    selectedClipButton = button;
    button.classList.add('selected');

    updateToolbarHighlights(); // Update toolbar highlighting on clip selection

    //'Hold' functionality is managed in Mouse-DOWN
    if (playModes[modeIndex].label === 'Hold to Play') {
      audio.volume = button.initialVolume
      audio.currentTime = 0;
      audio.play();
      button.isHoldPlaying = true;
    }
  });

  button.addEventListener('pointerup', function(e) {
    //clear "held" flag and stop in its special mouseUp handling if hold functionality
    if (playModes[modeIndex].label === 'Hold to Play') {
      audio.pause();
      button.isHoldPlaying = false;
    }
  });

  button.addEventListener('click', function(e) {
    //Check "drag" and skip rest, instead we will focus it only now (in Down) if enabled
       stopAllClips(); //STOP ALL other sounds

    if (playModes[modeIndex].label === 'Play/Stop') {
      if (button.isPlaying) {
        audio.pause();
          stopPlayingAnimation(button); //STOP all animations too
      } else {
        audio.play();
      }
      return; //Skip extra functions now
    } else if (playModes[modeIndex].label === 'Loop') {
      if (button.isPlaying) {
        audio.pause();
         stopPlayingAnimation(button); //STOP all animations too
      } else {
        audio.loop = true; // Force Loop - no reassign, but can make loop explicit in start vs auto ended etc
        audio.play();
      }
      return;
    }
    //else if "always reset Play ONCE and highPitchedPlay settings here (instead separate clear)", clear and re-establish sound clip so auto runs always from head - and has no "reset other audio", since a copy vs main
     else if (playModes[modeIndex].label === 'Play Once'){ //Here is force Always/One scenario again, make sure is here else clear toggle and global on other set, if needed
       audio.currentTime = 0; //FORCE new from head
       audio.play();
         return;
     }

      else if (playModes[modeIndex].label === 'Fast (Play/Stop)'){ //Play with rate
            if (button.isPlaying){
               audio.pause(); //pause
                 stopPlayingAnimation(button); //STOP all animations too
            }
          else {
             audio.currentTime = 0; //restart
             audio.play();
           }
        return;
      }

        else if (playModes[modeIndex].label === 'Fast Loop') { //force loop or functions
         if (button.isPlaying){
            audio.pause(); //pause
            stopPlayingAnimation(button); //STOP all animations too
          }
           else { //here set loop
               audio.loop = true;
               audio.currentTime = 0; //restart
             audio.play();
            }
             return;
        }

  });

  audio.addEventListener('play', () => {
        stopAllClips(); //Stop all clips (or with toggle and loop etc, do only when start as option)

    startPlayingAnimation(button, audio);
    button.isPlaying = true;
  });

  audio.addEventListener('pause', () => {
    stopPlayingAnimation(button);
    button.isPlaying = false;
    // force reset too? with loop off and one type of "clear all" then force set all then clear all or is global set, so if "global setting/code" (3 code methods as has 3) - 1: is
    // toggle, loop 2: toggle code/auto and code, loop is
      //If auto can assign this
  });

  audio.addEventListener('ended', () => {
    stopPlayingAnimation(button);
    button.isPlaying = false;
    //Here main toggle and stop should auto force end here in standard oneTouch/Once - in code no separate check for label setting
    if (playModes[modeIndex].label === 'Play/Stop') { //Not called directly so must get mode again for auto force head or in code reSet always and skip to clearToggle and clearReset to reset ALL etc..  And loop where toggle etc

      audio.currentTime = 0; // Auto force to Reset.
    }
    audio.loop = false;
  });

  button.addEventListener('contextmenu', function(event) {
    event.preventDefault();
    modeIndex = (modeIndex + 1) % playModes.length;
    button.style.backgroundColor = playModes[modeIndex].color;
    button.modeIndex = modeIndex;
    setAudioMode(audio, modeIndex);
    updateClipMode(name, modeIndex);

    button.setAttribute('aria-label', `Sound clip: ${name}, Play mode: ${playModes[modeIndex].label}`); //Accessibility
  });
   addDragAndDrop(button, container, name, button.dataset.dataURL); //Init on creating the functions - dataurl is from button itself here - add drag *in listener created to stop blocked first load functions or code
}

function setAudioMode(audio, modeIndex) {
    const mode = playModes[modeIndex];

    switch (mode.label) {
         case 'Play/Stop':
          audio.loop = false;
            audio.playbackRate = 1.0;
          break;
        case 'Loop':
          audio.loop = true;
           audio.playbackRate = 1.0;
          break;
        case 'Fast (Play/Stop)':
            audio.playbackRate = 1.5;
            audio.loop = false;  //PlayONCE not ToggleLoop on HIGH Pitch fast function (in progress) but force normal single to begin here from this assign to false (can be global auto setting but this example local better. to know start auto has this). can be Toggle too or HOLD even
             break;
            //Other auto clear examples

         case 'Fast Loop': //FORCE loop function in the clip player sound modes so each can function to toggle
          audio.loop = true;
          audio.playbackRate = 2.0;
            break;
        default: // 'Always Once reset', for not other assignments do nothing/only in start with PlayOnce label if needs new reset or functions etc for force always new
             //Not loop but "reset" is what auto means
              audio.loop = false; //Reset Toggle too at anytime //Reset loop on new selection etc or for Force, where only assign with toggle and label,
             audio.playbackRate = 1.0; //But could have functions assigned toggle too "to never hear loop (except manually)", example. This makes Force auto, unless set on assign/
           break;

    }
    //CLEAR settings can include other clear examples to always occur during assign sound clip: loop settings, audio function or loop functions (on example fast always/etc can also
    //  be on toggle with functions: so make manual for settings.  Force is just 3rd example as force reset sound settings when new setting auto) - only auto assign if auto clear
    // audioVolume  etc as well, unless set on assign/
}

function addAudioButton(dataURL, name, position, savedMode = 0) {
    const container = document.getElementById('buttonsContainer');
    if (!container) {
        console.error("buttonsContainer element not found.");
        return; // Exit if the container is missing
    }

    let modeIndex = savedMode;
    const audio = createAudioElement(dataURL);

    //Set inital VOL and assign here before modes clear auto so starts is consistent level unless setting on setup of clear
        setAudioMode(audio, modeIndex);

        const button = createButtonElement(name, modeIndex, dataURL);
        if (position && position.left !== undefined && position.top !== undefined) {
            button.style.left = position.left + 'px';
            button.style.top = position.top + 'px';
        }
       attachButtonListeners(button, audio, modeIndex, name); //DRAG addded here to the function attach

        audio.addEventListener('play', () => startPlayingAnimation(button, audio));
        audio.addEventListener('pause', () => stopPlayingAnimation(button));
        audio.addEventListener('ended', () => {
                stopPlayingAnimation(button);
        });

        container.appendChild(button);
    }

//Function to stop any other playing clip - force stop all
function stopAllClips() {
    const buttons = document.querySelectorAll('.sound-button');
    buttons.forEach(button => {
      if(button.dataset.dataURL){ //Check audio url,
          const audio = new Audio(button.dataset.dataURL); //reassign this

        audio.pause();
        audio.currentTime = 0;
        stopPlayingAnimation(button);
        button.isPlaying = false;
      }
    });
}

// Initial load
window.onload = loadClips;