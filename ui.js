// UI.js - Handles all UI interactions
document.addEventListener("DOMContentLoaded", () => {
    console.log("UI script loaded.");
    setupEventListeners();
});

// Setup UI event listeners
function setupEventListeners() {
    // Toggle Auto-Pokecatch
    const pokecatchBtn = document.getElementById("togglePokecatch");
    if (pokecatchBtn) {
        pokecatchBtn.addEventListener("click", togglePokecatch);
    }

    // Manage Tracked Channels
    const addChannelBtn = document.getElementById("addTrackedChannelBtn");
    if (addChannelBtn) {
        addChannelBtn.addEventListener("click", addTrackedChannel);
    }

    // Open Channel Manager
    const manageChannelsBtn = document.getElementById("manageChannelsBtn");
    if (manageChannelsBtn) {
        manageChannelsBtn.addEventListener("click", toggleChannelManager);
    }

    // Global Message Send Button
    const sendGlobalMsgBtn = document.getElementById("sendGlobalMessageBtn");
    if (sendGlobalMsgBtn) {
        sendGlobalMsgBtn.addEventListener("click", sendGlobalMessage);
    }
}

// Toggles the Pokécatch feature
function togglePokecatch() {
    autoPokecatchEnabled = !autoPokecatchEnabled;
    document.getElementById("togglePokecatch").textContent = autoPokecatchEnabled
        ? "Disable Auto-Pokecatch"
        : "Enable Auto-Pokecatch";
    console.log("Auto-Pokecatch enabled:", autoPokecatchEnabled);
}

// Updates the tracked channels UI list
async function updateTrackedChannelsUI() {
    const list = document.getElementById("trackedChannelsList");
    list.innerHTML = "";

    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();
    const channelElements = await Promise.all(trackedChannels.map(createChannelElement));

    channelElements.forEach(li => fragment.appendChild(li));
    list.appendChild(fragment);
    saveTrackedChannels();
}

// Toggles the channel manager UI visibility
function toggleChannelManager() {
    const manager = document.getElementById("channelManager");
    manager.style.display = manager.style.display === "none" ? "block" : "none";
    if (manager.style.display === "block") checkLiveStatus(); // Update live status on open
}

// Handles adding a new tracked channel
function addTrackedChannel() {
    const input = document.getElementById("newTrackedChannel");
    let channel = input.value.trim();

    if (!channel) return;
    channel = channel.replace(/.*twitch\.tv\//, "").toLowerCase();

    if (!trackedChannels.includes(channel)) {
        trackedChannels.push(channel);
        updateTrackedChannelsUI();
    }
    input.value = "";
}

// Handles removing a tracked channel
function removeTrackedChannel(channel) {
    trackedChannels = trackedChannels.filter(ch => ch !== channel);
    updateTrackedChannelsUI();
}

// Updates the chat UI when sending a message
function displaySentMessage(channel, message) {
    const chatWindow = document.querySelector(`.chat-box[data-channel="${channel}"] .messages`);
    if (!chatWindow) return;

    const timestamp = new Date().toLocaleTimeString();
    const messageElem = document.createElement("div");
    messageElem.className = "chat-message";

    const messageText = document.createElement("span");
    messageText.textContent = `[${timestamp}] ${username}: ${message}`;
    messageElem.appendChild(messageText);

    chatWindow.appendChild(messageElem);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Function to insert text (like emotes) at cursor position in an input field
function insertAtCursor(input, textToInsert) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    input.value = text.substring(0, start) + textToInsert + text.substring(end);
    input.selectionStart = input.selectionEnd = start + textToInsert.length;
    input.focus();
}

// Handles toggling the emote picker
function toggleEmotePicker(context) {
    let inputField, pickerDiv;
    let combinedEmotes;

    if (context === "global") {
        inputField = document.getElementById("globalMessage");
        pickerDiv = document.getElementById("globalEmotePicker");
        combinedEmotes = globalEmotes;
    } else {
        inputField = context.input;
        pickerDiv = context.picker;
        const chatBox = pickerDiv.closest(".chat-box");
        const channel = chatBox.dataset.channel;
        combinedEmotes = getCombinedEmotesForChannel(channel);
    }

    pickerDiv.classList.toggle("active");

    if (pickerDiv.classList.contains("active") && pickerDiv.childElementCount === 0) {
        for (let emote in combinedEmotes) {
            const img = document.createElement("img");
            img.style.cursor = "pointer";
            img.src = combinedEmotes[emote];
            img.alt = emote;
            img.title = emote;
            img.onclick = () => {
                insertAtCursor(inputField, emote + " ");
                pickerDiv.classList.remove("active");
            };
            pickerDiv.appendChild(img);
        }
    }
}

// Handles sliding between chat windows
function slideChats(direction) {
    const container = document.getElementById("chat-container");
    const chatBoxes = container.children;
    const chatBoxWidth = 340; // Adjust based on actual width
    const maxSlide = Math.max(0, chatBoxes.length - 2);

    currentSlide += direction;
    if (currentSlide < 0) currentSlide = 0;
    if (currentSlide > maxSlide) currentSlide = maxSlide;

    container.style.transform = `translateX(-${currentSlide * chatBoxWidth}px)`;
}

// Sends a global message to all chat rooms
function sendGlobalMessage() {
    const globalInput = document.getElementById("globalMessage");
    const message = globalInput.value;
    if (!message) return;

    const chatBoxes = document.querySelectorAll(".chat-box");
    chatBoxes.forEach(chatBox => {
        if (chatBox.socket && chatBox.socket.readyState === WebSocket.OPEN) {
            const channel = chatBox.querySelector(".chat-header h4").textContent.replace("#", "");
            chatBox.socket.send(`PRIVMSG #${channel} :${message}\r\n`);
        }
    });

    globalInput.value = "";
}
