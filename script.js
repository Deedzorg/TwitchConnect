// --- Global Configuration ---
const clientId = '1cvmce5wrxeuk4hpfgd4ssfthiwx46';
let username = null; // This will be set when fetching user data
let oauthToken = null; // Declare it globally


// Global variables to store badges and emotes
let globalBadges = {};
let globalEmotes = {};

let trackedChannels = [];
let liveChannelsStatus = {}; // Key: channel, Value: boolean (true if live)
let channelPictures = {};
let currentSlide = 0;

let autoPokecatchEnabled = false;
let lastCatchTime = 0;
const CATCH_COOLDOWN = 5000;
let first151Pokemon = [];
let lastBallType = null;




// Initialize the application by fetching global badges and emotes
async function initApp() {
  await fetchGlobalBadges();
  await fetchGlobalEmotes();
  loadTrackedChannels();
  checkLiveStatus();
  setInterval(checkLiveStatus, 60000);
}

document.addEventListener("DOMContentLoaded", () => {
  // Define chatContainer globally
  window.chatContainer = document.getElementById("chat-container");
  if (!window.chatContainer) {
    console.error("chatContainer is missing from the DOM.");
    return;
  }

  oauthToken = localStorage.getItem('twitchAccessToken');

  if (!oauthToken) {
    window.location.href = 'https://id.twitch.tv/oauth2/authorize?' +
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: 'https://deedzorg.github.io/TwitchConnect/callback.html',
        response_type: 'token',
        scope: 'user:read:email chat:read chat:edit'
      });
  } else {
    fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${oauthToken}`
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.data && data.data.length > 0) {
        username = data.data[0].display_name;
        console.log('Logged in as:', username);
        initApp();
      } else {
        console.error('No user data found.');
      }
    })
    .catch(err => console.error('Error fetching user data:', err));
  }
});

// This code should run on the redirect page
function getAccessTokenFromHash() {
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.slice(1)); // remove the '#' at the beginning
  return params.get('access_token');
}

const accessToken = getAccessTokenFromHash();
if (accessToken) {
  // Save the token (e.g., in localStorage or state management)
  localStorage.setItem('twitchAccessToken', accessToken);
  // You can now use the token to fetch user data or interact with Twitch APIs.
  fetchTwitchUserData(accessToken);
}

function fetchTwitchUserData(token) {
  fetch('https://api.twitch.tv/helix/users', {
    headers: {
      'Client-ID': '1cvmce5wrxeuk4hpfgd4ssfthiwx46',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.data && data.data.length > 0) {
      const user = data.data[0];
      console.log('Logged in as:', user.display_name);
      // Update your UI with the user's name and profile picture, etc.
    }
  })
  .catch(err => console.error('Error fetching user data:', err));
}




async function fetchGlobalBadges() {
  const token = oauthToken || localStorage.getItem('twitchAccessToken'); // Ensure it's fetched
  if (!token) {
    console.error("OAuth token missing in fetchGlobalBadges");
    return;
  }

  try {
    const response = await fetch("https://api.twitch.tv/helix/chat/badges/global", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Client-Id": clientId
      }
    });
    const data = await response.json();
    console.log("Global Badges:", data);
  } catch (error) {
    console.error("Error fetching global badges:", error);
  }
}




// --- Global API functions ---

async function fetchGlobalEmotes() {
  const response = await fetch('https://api.twitch.tv/helix/chat/emotes/global', {
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${oauthToken}`
    }
  });
  const data = await response.json();
  console.log('Global Emotes API Response:', data);
  if (!response.ok) {
    console.error(`Error fetching global emotes: ${data.message} (Status: ${response.status})`);
    return;
  }
  if (!data.data) {
    console.error('Unexpected API response structure for global emotes:', data);
    return;
  }
  data.data.forEach(emote => {
    globalEmotes[emote.name] = emote.images.url_1x;
  });
}

async function getBroadcasterId(channelName) {
  const response = await fetch(`https://api.twitch.tv/helix/users?login=${channelName}`, {
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${oauthToken}`
    }
  });
  const data = await response.json();
  if (!response.ok) {
    console.error(`Error fetching user ID: ${data.message} (Status: ${response.status})`);
    return null;
  }
  if (data.data && data.data.length > 0) {
    return data.data[0].id;
  } else {
    return null;
  }
}

async function fetchChannelBadges(broadcasterId) {
  const response = await fetch(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${broadcasterId}`, {
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${oauthToken}`
    }
  });
  const data = await response.json();
  if (!response.ok) {
    console.error(`Error fetching channel badges: ${data.message} (Status: ${response.status})`);
    return {};
  }
  const channelBadges = {};
  data.data.forEach(set => {
    channelBadges[set.set_id] = {};
    set.versions.forEach(version => {
      channelBadges[set.set_id][version.id] = version.image_url_1x;
    });
  });
  return channelBadges;
}

async function fetchChannelEmotes(broadcasterId) {
  const response = await fetch(`https://api.twitch.tv/helix/chat/emotes?broadcaster_id=${broadcasterId}`, {
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${oauthToken}`
    }
  });
  const data = await response.json();
  if (!response.ok) {
    console.error(`Error fetching channel emotes: ${data.message} (Status: ${response.status})`);
    return {};
  }
  const channelEmotes = {};
  data.data.forEach(emote => {
    channelEmotes[emote.name] = emote.images.url_1x;
  });
  return channelEmotes;
}

async function fetchChannelPicture(channel) {
  // Return from cache if available
  if (channelPictures[channel]) {
    return channelPictures[channel];
  }
  
  const response = await fetch(`https://api.twitch.tv/helix/users?login=${channel}`, {
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${storedOauthToken || oauthToken}` // Use stored token if available
    }
  });
  const data = await response.json();
  if (data.data && data.data.length > 0) {
    const imgUrl = data.data[0].profile_image_url;
    channelPictures[channel] = imgUrl; // Cache it
    return imgUrl;
  }
  return null; // fallback if not found
}

function slideChats(direction) {
  const container = document.getElementById("chat-container");
  const chatBoxes = container.children;
  const chatBoxWidth = 340; // approximate width (chat box width + gap)
  const maxSlide = Math.max(0, chatBoxes.length - 2); // show two at a time
  currentSlide += direction;
  if (currentSlide < 0) currentSlide = 0;
  if (currentSlide > maxSlide) currentSlide = maxSlide;
  container.style.transform = `translateX(-${currentSlide * chatBoxWidth}px)`;
}

// --- GLOBAL MESSAGE FUNCTIONALITY ---
function sendGlobalMessage() {
  const globalInput = document.getElementById("globalMessage");
  const message = globalInput.value;
  if (!message) return;
  // Loop through all chat boxes and send message if the socket is open
  const chatBoxes = document.querySelectorAll(".chat-box");
  chatBoxes.forEach(chatBox => {
    if (chatBox.socket && chatBox.socket.readyState === WebSocket.OPEN) {
      const channel = chatBox.querySelector(".chat-header h4").textContent.replace("#", "");
      chatBox.socket.send(`PRIVMSG #${channel} :${message}\r\n`);
    }
  });
  globalInput.value = "";
}

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

function removeTrackedChannel(channel) {
  trackedChannels = trackedChannels.filter(ch => ch !== channel);
  updateTrackedChannelsUI(); 
}

async function fetchChannelPicture(channel) {
  try{
  // Return from cache if available
  if (channelPictures[channel]) {

    return channelPictures[channel];
  }
  
  const response = await fetch(`https://api.twitch.tv/helix/users?login=${channel}`, {
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${oauthToken}` // Use stored token if available
    }
  });
  if (!response.ok) {
    console.error(`Error fetching user data for ${channel}: ${response.status} - ${response.statusText}`);
      channelPictures[channel] = null; // clear the cache on error
    return null; // fallback if not found
  }
  const data = await response.json();
  if (data.data && data.data.length > 0) {
    const imgUrl = data.data[0].profile_image_url;
    channelPictures[channel] = imgUrl; // Cache it
    console.log(`Picture fetched and cached for ${channel}: ${imgUrl}`); // Debugging log
    return imgUrl;
  }
      console.log(`No user data found for ${channel}`); // Debugging log
      channelPictures[channel] = null; // clear the cache on error
      return null; // fallback if not found
  } catch (error) {
      console.error(`Error fetching user data for ${channel}`, error);
      channelPictures[channel] = null; // clear the cache on error
      return null; // fallback if not found
  }
}

async function createChannelElement(channel) {
    const li = document.createElement("li");
    li.style.margin = "5px 0";
    li.style.display = "flex";
    li.style.flexDirection = "column"; // Stack items vertically
    li.style.alignItems = "center"; // Center items horizontally
  
    // 1. Create the <img> element
    const img = document.createElement("img");
    img.style.width = "50px"; // Set a width
    img.style.height = "50px"; // Set a height
    img.style.borderRadius = "50%"; // Make it circular
    img.style.marginBottom = "5px";
  
    // 2. Set the src (and handle the async fetch)
    try {
        const imgUrl = await fetchChannelPicture(channel);
        img.src = imgUrl || "default-image.png"; // Fallback to a default if not found
        img.alt = `Profile picture for ${channel}`; // Add alt text
        li.appendChild(img);
    } catch (error) {
        console.error(`Error fetching/displaying image for ${channel}`, error);
        img.src = "default-image.png";
        li.appendChild(img);
    }
  
    // Add the live indicator (if live)
    if (liveChannelsStatus[channel]) {
        const liveIndicator = document.createElement("span");
        liveIndicator.textContent = "● ";
        liveIndicator.style.color = "red";
        liveIndicator.style.fontWeight = "bold";
        li.prepend(liveIndicator); // Add indicator
    }
  
    // Add the channel name
    const channelText = document.createElement("span");
    channelText.textContent = channel;
    li.appendChild(channelText);
  
    // Add the remove button
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.style.marginLeft = "10px";
    removeBtn.onclick = () => removeTrackedChannel(channel);
    li.appendChild(removeBtn);
    
    return li;
  }
  
  function updateTrackedChannelsUI() {
    const list = document.getElementById("trackedChannelsList");
    list.innerHTML = ""; // Clear existing list items
  
    // Create promises for each channel and wait for them to resolve
    const channelPromises = trackedChannels.map(createChannelElement);
    Promise.all(channelPromises)
        .then(channelElements => {
            // Append elements to the list once all are created
            channelElements.forEach(li => list.appendChild(li));
        }).catch(error => {
            console.error("Error updating tracked channels:", error);
        });
    saveTrackedChannels()
  }

async function checkLiveStatus() {
    if (!trackedChannels.length) return;
    
    // Build query parameters for each tracked channel
    const query = trackedChannels
      .map(channel => `user_login=${encodeURIComponent(channel)}`)
      .join("&");
    
    const response = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
      headers: {
        "Client-ID": clientId,
        "Authorization": `Bearer ${oauthToken}`
      }
    });
    const data = await response.json();
    
    // Reset status for all tracked channels to false
    trackedChannels.forEach(channel => {
      liveChannelsStatus[channel] = false;
    });
    
    // If a channel is live, mark it as true
    if (data.data) {
      data.data.forEach(stream => {
        const channel = stream.user_login.toLowerCase();
        liveChannelsStatus[channel] = true;
      });
    }
    // Update the UI to reflect live status
    updateTrackedChannelsUI();
    // Open chats for live channels and close for offline channels
    trackedChannels.forEach(channel => {
      if (liveChannelsStatus[channel]) {
        if (!isChatOpen(channel)) {
          console.log(`Opening chat for ${channel} (live)`);
          openChat(channel);
        }
      } else {
        if (isChatOpen(channel)) {
          console.log(`Closing chat for ${channel} (offline)`);
          closeChat(channel);
        }
      }
    });
  }

function toggleEmotePicker(context) {
  let inputField, pickerDiv;
  let combinedEmotes; // Declare combinedEmotes here

  if (context === 'global') {
    inputField = document.getElementById("globalMessage");
    pickerDiv = document.getElementById("globalEmotePicker");
    combinedEmotes = globalEmotes; // Use global emotes for global picker
  } else {
    // For per-chat input, context is an object {input: ..., picker: ...}
    inputField = context.input;
    pickerDiv = context.picker;
    // Find the chat box associated with the picker
    const chatBox = pickerDiv.closest('.chat-box');
    // Extract channel from data attribute
    const channel = chatBox.dataset.channel;
        // Retrieve combined emotes from chatbox, using it's channel to access it
        combinedEmotes = getCombinedEmotesForChannel(channel);
  }

  pickerDiv.classList.toggle("active");
  // Populate picker if active and not already populated
  if (pickerDiv.classList.contains("active") && pickerDiv.childElementCount === 0) {
    for (let emote in combinedEmotes) {
      const img = document.createElement("img");
      img.style.cursor = "pointer";
      img.src = combinedEmotes[emote];
      img.alt = emote;
      img.title = emote;
      img.onclick = () => {
        insertAtCursor(inputField, emote + " ");
        pickerDiv.classList.remove("active"); //close on click
      };
      pickerDiv.appendChild(img);
    }
  }
}


function toggleChannelManager() {
  const manager = document.getElementById("channelManager");
  if (manager.style.display === "none" || manager.style.display === "") {
    manager.style.display = "block";
    // Immediately update live status when opening the manager
    checkLiveStatus();
  } else {
    manager.style.display = "none";
  }
}

function toggleEmotePicker(context) {
  let inputField, pickerDiv;
  let combinedEmotes; // Declare combinedEmotes here

  if (context === 'global') {
    inputField = document.getElementById("globalMessage");
    pickerDiv = document.getElementById("globalEmotePicker");
    combinedEmotes = globalEmotes; // Use global emotes for global picker
  } else {
    // For per-chat input, context is an object {input: ..., picker: ...}
    inputField = context.input;
    pickerDiv = context.picker;
    // Find the chat box associated with the picker
    const chatBox = pickerDiv.closest('.chat-box');
    // Extract channel from data attribute
    const channel = chatBox.dataset.channel;
    // Retrieve combined emotes from chatbox, using its channel to access it
    combinedEmotes = getCombinedEmotesForChannel(channel);
  }

  pickerDiv.classList.toggle("active");
  // Populate picker if active and not already populated
  if (pickerDiv.classList.contains("active") && pickerDiv.childElementCount === 0) {
    for (let emote in combinedEmotes) {
      const img = document.createElement("img");
      img.style.cursor = "pointer";
      img.src = combinedEmotes[emote];
      img.alt = emote;
      img.title = emote;
      img.onclick = () => {
        insertAtCursor(inputField, emote + " ");
        pickerDiv.classList.remove("active"); //close on click
      };
      pickerDiv.appendChild(img);
    }
  }
}

function getCombinedEmotesForChannel(channel) {
  // Find the chat box that matches the current channel
  const chatBox = document.querySelector(`.chat-box[data-channel="${channel}"]`);
  
  // Check if chatBox exists and has the emotes stored
  if (chatBox && chatBox.combinedEmotes) {
      return chatBox.combinedEmotes;
  } else {
      console.warn(`Emotes not found for channel: ${channel}`);
      return globalEmotes; // fallback
  }
}
// Helper to insert text at cursor in input field
function insertAtCursor(input, textToInsert) {
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const text = input.value;
  input.value = text.substring(0, start) + textToInsert + text.substring(end);
  input.selectionStart = input.selectionEnd = start + textToInsert.length;
  input.focus();
}


async function addChat(providedChannel) {
  let channel = providedChannel;
  if (!channel) {
    channel = prompt("Enter Twitch channel name:");
    if (!channel) return;
  }
  channel = channel.trim();
  // Strip URLs, keeping only the channel name and convert to lowercase for consistency
  channel = channel.replace(/.*twitch\.tv\//, "").toLowerCase();

  // Check if a chat for this channel is already open
  if (isChatOpen(channel)) {
    console.log(`Chat for ${channel} is already open.`);
    return;
  }

  const broadcasterId = await getBroadcasterId(channel);
  if (!broadcasterId) {
    alert("Channel not found.");
    return;
  }

  // Before appending, mark the chat box with a data attribute for the channel
  const channelBadges = await fetchChannelBadges(broadcasterId);
  const channelEmotes = await fetchChannelEmotes(broadcasterId);

  // Merge global and channel-specific badges/emotes
  const combinedBadges = { ...globalBadges };
  Object.keys(channelBadges).forEach(setId => {
    if (!combinedBadges[setId]) {
      combinedBadges[setId] = {};
    }
    combinedBadges[setId] = { ...combinedBadges[setId], ...channelBadges[setId] };
  });
  const combinedEmotes = { ...globalEmotes, ...channelEmotes };

  // Create chat box UI
  const chatBox = document.createElement("div");
  chatBox.className = "chat-box";
  chatBox.dataset.channel = channel;
  chatBox.combinedEmotes = combinedEmotes;

  // Chat header
  const header = document.createElement("div");
  header.className = "chat-header";
  const title = document.createElement("h4");
  title.textContent = `#${channel}`;
  header.appendChild(title);

  const closeButton = document.createElement("button");
  closeButton.className = "close-btn";
  closeButton.textContent = "X";
  closeButton.onclick = () => {
    if (chatBox.socket && chatBox.socket.readyState === WebSocket.OPEN) {
      chatBox.socket.close();
    }
    chatBox.remove();
    slideChats(0);
  };
  
  header.appendChild(closeButton);
  chatBox.appendChild(header);

  // Messages container
  const messagesDiv = document.createElement("div");
  messagesDiv.className = "messages";
  chatBox.appendChild(messagesDiv);

  // Per-chat input area with emote picker
  const inputDiv = document.createElement("div");
  inputDiv.className = "chat-input";
  const inputField = document.createElement("input");
  inputField.type = "text";
  inputField.placeholder = "Type your message...";
  inputDiv.appendChild(inputField);

  const emoteBtn = document.createElement("button");
  emoteBtn.className = "emote-picker-btn";
  emoteBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <g>
        <path d="M7 11a1 1 0 100-2 1 1 0 000 2zM14 10a1 1 0 11-2 0 1 1 0 012 0zM10 14a2 2 0 002-2H8a2 2 0 002 2z"></path>
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0a6 6 0 11-12 0 6 6 0 0112 0z" clip-rule="evenodd"></path>
      </g>
    </svg>`;
  // Create per-chat emote picker container
  const pickerDiv = document.createElement("div");
  pickerDiv.className = "emote-picker";
  emoteBtn.onclick = () => toggleEmotePicker({ input: inputField, picker: pickerDiv });
  
  // Populate picker if active and not already populated
  if (pickerDiv.childElementCount === 0) {
    for (let emote in combinedEmotes) {
      const img = document.createElement("img");
      img.style.cursor = "pointer";
      img.src = combinedEmotes[emote];
      img.alt = emote;
      img.title = emote;
      img.onclick = () => { insertAtCursor(inputField, emote + " "); };
      pickerDiv.appendChild(img);
    }
  }
  inputDiv.appendChild(emoteBtn);
  inputDiv.appendChild(pickerDiv);

  const sendButton = document.createElement("button");
  sendButton.textContent = "Send";
  inputDiv.appendChild(sendButton);
  chatBox.appendChild(inputDiv);

  // Append chat box to slider container
  window.chatContainer.appendChild(chatBox);

  // Connect to Twitch chat
  const socket = connectToTwitchChat(channel, messagesDiv, combinedBadges, combinedEmotes);
  chatBox.socket = socket;

  sendButton.onclick = () => sendChatMessage(socket, channel, inputField);
  inputField.addEventListener("keyup", (e) => {
    if (e.key === "Enter") sendChatMessage(socket, channel, inputField);
  });

  slideChats(0);
}


function sendChatMessage(socket, channel, inputField) {
  const message = inputField.value;
  if (message && socket.readyState === WebSocket.OPEN) {
    socket.send(`PRIVMSG #${channel} :${message}\r\n`);
    // Optionally, display the sent message in the chat window
    displaySentMessage(channel, message);
    inputField.value = "";
  }
}

function displaySentMessage(channel, message) {
  // Create a chat message element just like when receiving a message
  const chatWindow = document.querySelector(`.chat-box[data-channel="${channel}"] .messages`);
  if (!chatWindow) return;
  
  const timestamp = new Date().toLocaleTimeString(); // Optional: change format as needed
  
  const messageElem = document.createElement("div");
  messageElem.className = "chat-message";
  
  // Create a span for the message text
  const messageText = document.createElement("span");
  messageText.textContent = `[${timestamp}] You: ${message}`;
  messageElem.appendChild(messageText);
  
  chatWindow.appendChild(messageElem);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function sanitize(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function createBadgeImages(badgesStr, badges) {
  if (!badgesStr) return [];
  return badgesStr.split(',').map(badge => {
    const [badgeName, version] = badge.split('/');
    const badgeUrl = badges[badgeName] ? badges[badgeName][version] : null;
    if (badgeUrl) {
      const img = document.createElement('img');
      img.src = badgeUrl;
      img.alt = badgeName;
      img.className = 'badge';
      return img;
    } else {
      console.warn(`Badge not found: ${badgeName}/${version}`);
      return document.createTextNode('');
    }
  });
}

function parseEmotesInText(text, emotes) {
  const words = text.split(/\s+/);
  const fragment = document.createDocumentFragment();
  words.forEach((word, index) => {
    const sanitizedWord = sanitize(word);
    if (emotes[sanitizedWord]) {
      const img = document.createElement("img");
      img.src = emotes[sanitizedWord];
      img.alt = sanitizedWord;
      img.className = "emote";
      fragment.appendChild(img);
    } else {
      fragment.appendChild(document.createTextNode(sanitizedWord));
    }
    if (index < words.length - 1) {
      fragment.appendChild(document.createTextNode(" "));
    }
  });
  return fragment;
}

function parseTags(tagString) {
  const tags = {};
  tagString.split(';').forEach(pair => {
    const [key, value] = pair.split('=');
    tags[key] = value;
  });
  return tags;
}
function isChatOpen(channel) {
  return document.querySelector(`.chat-box[data-channel="${channel}"]`) !== null;
}
// Opens a chat for the given channel by calling addChat()
async function openChat(channel) {
  await addChat(channel);
}
// Closes the chat for the given channel, if open
function closeChat(channel) {
  const chatBox = document.querySelector(`.chat-box[data-channel="${channel}"]`);
  if (chatBox) {
    if (chatBox.socket && chatBox.socket.readyState === WebSocket.OPEN) {
      chatBox.socket.close();
    }
    chatBox.remove();
    slideChats(0);
    console.log(`Closed chat for ${channel}`);
  }
}
// Lets the user modify the tracked channels list via a prompt
function manageTrackedChannels() {
  // Prompt user for comma-separated channels
  const input = prompt("Enter channels to track (comma-separated):");
  if (input) {
    // Split, trim, remove URL parts, convert to lowercase, and filter out empties
    trackedChannels = input
      .split(",")
      .map(ch => ch.trim().replace(/.*twitch\.tv\//, "").toLowerCase())
      .filter(ch => ch);
    console.log("Tracked channels:", trackedChannels);
  }
}
// Poll Twitch's Get Streams API for tracked channels and open/close chats accordingly
async function checkLiveStatus() {
  if (!trackedChannels.length) return;
  
  // Build query parameters for each tracked channel
  const query = trackedChannels
    .map(channel => `user_login=${encodeURIComponent(channel)}`)
    .join("&");
  
  const response = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
    headers: {
      "Client-ID": clientId,
      "Authorization": `Bearer ${oauthToken}`
    }
  });
  const data = await response.json();
  
  // Reset status for all tracked channels to false
  trackedChannels.forEach(channel => {
    liveChannelsStatus[channel] = false;
  });
  
  // If a channel is live, mark it as true
  if (data.data) {
    data.data.forEach(stream => {
      const channel = stream.user_login.toLowerCase();
      liveChannelsStatus[channel] = true;
    });
  }
  // Update the UI to reflect live status
  updateTrackedChannelsUI();
  // Open chats for live channels and close for offline channels
  trackedChannels.forEach(channel => {
    if (liveChannelsStatus[channel]) {
      if (!isChatOpen(channel)) {
        console.log(`Opening chat for ${channel} (live)`);
        openChat(channel);
      }
    } else {
      if (isChatOpen(channel)) {
        console.log(`Closing chat for ${channel} (offline)`);
        closeChat(channel);
      }
    }
  });
}
// Toggle the visibility of the channel manager UI
function toggleChannelManager() {
  const manager = document.getElementById("channelManager");
  if (manager.style.display === "none" || manager.style.display === "") {
    manager.style.display = "block";
    // Immediately update live status when opening the manager
    checkLiveStatus();
  } else {
    manager.style.display = "none";
  }
}
// Add a new channel to the trackedChannels list
function addTrackedChannel() {
  const input = document.getElementById("newTrackedChannel");
  let channel = input.value.trim();
  if (!channel) return;
  // Strip URL parts and convert to lowercase for consistency
  channel = channel.replace(/.*twitch\.tv\//, "").toLowerCase();
  // Only add if it's not already tracked
  if (!trackedChannels.includes(channel)) {
    trackedChannels.push(channel);
    updateTrackedChannelsUI();
  }
  input.value = "";
}

function saveTrackedChannels() {
  localStorage.setItem("trackedChannels", JSON.stringify(trackedChannels));
}

function loadTrackedChannels() {
  const stored = localStorage.getItem("trackedChannels");
  if (stored) {
    trackedChannels = JSON.parse(stored);
    updateTrackedChannelsUI(); // Update your UI list
  }
}

// Remove a channel from the trackedChannels list
function removeTrackedChannel(channel) {
  trackedChannels = trackedChannels.filter(ch => ch !== channel);
  updateTrackedChannelsUI();
}

function connectToTwitchChat(channel, chatWindow, badges, emotes) {
  const socket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");

  socket.onopen = () => {
    console.log(`✅ Connected to #${channel}`);
    socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands\r\n");
    socket.send(`PASS oauth:${oauthToken}\r\n`);
    socket.send(`NICK ${username}\r\n`);
    socket.send(`JOIN #${channel}\r\n`);
  };
  
  function handlePokecatch(autoPokecatchEnabled, displayName, rawMessage, socket, channelName) {
    // Check for a wild Pokémon appearance message
    if (
      autoPokecatchEnabled &&
      displayName === "PokemonCommunityGame" &&
      /A wild (.+) appears/i.test(rawMessage) &&
      Date.now() - lastCatchTime > CATCH_COOLDOWN &&
      socket.readyState === WebSocket.OPEN
    ) {
      const pokemonMatch = rawMessage.match(/A wild (.+) appears/i);
      if (pokemonMatch) {
        const pokemonName = pokemonMatch[1].toLowerCase();
  
        console.log(`Attempting to catch ${pokemonName} with pokeball in #${channelName}`);
        sendChatMessage(socket, channelName, "!pokecatch");
  
        // Set last ball type to pokeball since that's all we're using now.
        lastBallType = "pokeball";
        lastCatchTime = Date.now();
      }
    }
  
    // Error handling: if we receive a message saying "You don't own that ball."
    if (
      autoPokecatchEnabled &&
      displayName === "PokemonCommunityGame" &&
      /You don't own that ball\./i.test(rawMessage) &&
      /@\w+ You don't own that ball\./i.test(rawMessage) &&
      rawMessage.toLowerCase().includes(`@${username.toLowerCase()}`)
    ) {
      console.log(`Detected "You don't own that ball." message for @${username} in #${channelName}`);
      console.log(`No pokeball available in #${channelName} for @${username}. Purchasing 5 pokeballs...`);
      sendChatMessage(socket, channelName, "!pokeshop pokeball 5");
  
      // Wait briefly to allow the purchase to process, then attempt to catch with the pokeball
      setTimeout(() => {
        console.log(`Attempting to catch with pokeball after purchase in #${channelName}`);
        sendChatMessage(socket, channelName, "!pokecatch");
      }, 500);
    }
  
    // Error handling: if we receive a message saying "You don't have any Poké Balls."
    if (
      autoPokecatchEnabled &&
      displayName === "PokemonCommunityGame" &&
      /You don't have any Poké Balls\./i.test(rawMessage)
    ) {
      console.log(`Detected "You don't have any Poké Balls." message in #${channelName}`);
      console.log(`No pokeball available in #${channelName}. Purchasing 5 pokeballs...`);
      sendChatMessage(socket, channelName, "!pokeshop pokeball 5");
  
      // Wait briefly to allow the purchase to process, then attempt to catch with the pokeball
      setTimeout(() => {
        console.log(`Attempting to catch with pokeball after purchase in #${channelName}`);
        sendChatMessage(socket, channelName, "!pokecatch");
      }, 500);
    }
  }
  
  function sendChatMessage(socket, channelName, message) {
    socket.send(`PRIVMSG #${channelName} :${message}\r\n`);
  }
  
  
  socket.onmessage = (event) => {
    console.log(`[${channel}] Received:`, event.data);
  
    if (event.data.startsWith("PING")) {
      socket.send("PONG :tmi.twitch.tv\r\n");
      return;
    }
  
    if (event.data.includes('NOTICE * :Login authentication failed')) {
      console.error('Authentication failed: Invalid OAuth token or username.');
      alert('Authentication failed: Invalid OAuth token or username.');
      socket.close();
      return;
    }
  
    if (event.data.includes('NOTICE') && event.data.includes('Improperly formatted auth')) {
      console.error('Improperly formatted auth');
      alert('Improperly formatted auth');
      socket.close();
      return;
    }
  
    let tags = {};
    let messageData = event.data;
  
    if (messageData.startsWith("@")) {
      const splitData = messageData.split(" ");
      tags = parseTags(splitData[0].substring(1));
      messageData = splitData.slice(1).join(" ");
    }
  
    // Extract common parts
    const regex = /:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #(\w+) :(.*)/;
    const match = messageData.match(regex);
    if (!match) return;
  
    const displayName = tags["display-name"] || match[1];
    const channelName = match[2];
    const rawMessage = match[3].trim();
    const userColor = (tags["color"] && tags["color"].trim() !== "") ? tags["color"] : "#ffffff";
    // Create a timestamp element
    // Optionally style it in your CSS (e.g., smaller, gray font)
    // Then prepend it to your message element:
  
    const timestampElem = document.createElement("span");
    timestampElem.className = "timestamp";
    timestampElem.textContent = `[${new Date().toLocaleTimeString()}] `;
  
    // Build the message element
    const usernameElem = document.createElement("span");
    usernameElem.className = "username";
    usernameElem.textContent = displayName + ": ";
    usernameElem.style.color = userColor;
  
    const badgesStr = tags["badges"] || "";
    const badgeImages = createBadgeImages(badgesStr, badges);
  
    const messageFragment = parseEmotesInText(rawMessage, emotes);
  
    const messageElem = document.createElement("div");
    messageElem.className = "chat-message";
    badgeImages.forEach(img => messageElem.appendChild(img));
    messageElem.appendChild(timestampElem);
    messageElem.appendChild(usernameElem);
    messageElem.appendChild(messageFragment);
  
    chatWindow.appendChild(messageElem);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  
    // --- Command Checks ---
    // Check for !honk command
    if (rawMessage === "!honk") {
      if (socket.readyState === WebSocket.OPEN) {
        console.log(`Responding with honk in #${channelName}`);
        socket.send(`PRIVMSG #${channelName} :honk\r\n`);
      }
    }
      handlePokecatch(autoPokecatchEnabled, displayName, rawMessage, socket, channelName)
  };
  
  socket.onerror = (error) => console.error(`❌ Error in #${channel}:`, error);
  socket.onclose = () => console.log(`🔌 Disconnected from #${channel}`);
  return socket;
  
  }

