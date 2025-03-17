const clientId = "1cvmce5wrxeuk4hpfgd4ssfthiwx46";
let oauthToken = localStorage.getItem("twitchAccessToken");

let globalBadges = {};
let globalEmotes = {};
let trackedChannels = [];
let liveChannelsStatus = {}; // Key: channel, Value: boolean (true if live)
let channelPictures = {};

/**
 * Initializes the application by fetching required Twitch data
 */
async function initApp() {
    await fetchGlobalBadges();
    await fetchGlobalEmotes();
    loadTrackedChannels();
    checkLiveStatus();
    setInterval(checkLiveStatus, 60000); // Update live status every minute
}

// Ensure `initApp()` is globally accessible
window.initApp = initApp;

/**
 * Fetches global Twitch badges
 */
async function fetchGlobalBadges() {
    const token = localStorage.getItem("twitchAccessToken");
    if (!token) {
        console.error("OAuth token missing in fetchGlobalBadges");
        return;
    }

    try {
        const response = await fetch("https://api.twitch.tv/helix/chat/badges/global", {
            headers: { "Authorization": `Bearer ${token}`, "Client-Id": clientId }
        });

        const data = await response.json();
        globalBadges = data.data.reduce((acc, set) => {
            acc[set.set_id] = set.versions.reduce((vAcc, version) => {
                vAcc[version.id] = version.image_url_1x;
                return vAcc;
            }, {});
            return acc;
        }, {});

        console.log("Global Badges:", globalBadges);
    } catch (error) {
        console.error("Error fetching global badges:", error);
    }
}

/**
 * Fetches global Twitch emotes
 */
async function fetchGlobalEmotes() {
    const token = localStorage.getItem("twitchAccessToken");
    if (!token) {
        console.error("OAuth token missing in fetchGlobalEmotes");
        return;
    }

    try {
        const response = await fetch("https://api.twitch.tv/helix/chat/emotes/global", {
            headers: { "Client-ID": clientId, "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error("Error fetching global emotes:", await response.text());
            return;
        }

        const data = await response.json();
        globalEmotes = data.data.reduce((acc, emote) => {
            acc[emote.name] = emote.images.url_1x;
            return acc;
        }, {});

        console.log("Global Emotes:", globalEmotes);
    } catch (error) {
        console.error("Error fetching global emotes:", error);
    }
}

/**
 * Fetches broadcaster ID by channel name
 */
async function getBroadcasterId(channelName) {
    const token = localStorage.getItem("twitchAccessToken");
    if (!token) {
        console.error("OAuth token missing in getBroadcasterId");
        return null;
    }

    try {
        const response = await fetch(`https://api.twitch.tv/helix/users?login=${channelName}`, {
            headers: { "Client-ID": clientId, "Authorization": `Bearer ${token}` }
        });

        const data = await response.json();
        if (!response.ok || !data.data || data.data.length === 0) {
            console.error(`Error fetching broadcaster ID: ${data.message}`);
            return null;
        }

        return data.data[0].id;
    } catch (error) {
        console.error("Error fetching broadcaster ID:", error);
        return null;
    }
}

/**
 * Fetches a channel's specific emotes
 */
async function fetchChannelEmotes(broadcasterId) {
    const token = localStorage.getItem("twitchAccessToken");
    if (!token) {
        console.error("OAuth token missing in fetchChannelEmotes");
        return {};
    }

    try {
        const response = await fetch(`https://api.twitch.tv/helix/chat/emotes?broadcaster_id=${broadcasterId}`, {
            headers: { "Client-ID": clientId, "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error("Error fetching channel emotes:", await response.text());
            return {};
        }

        const data = await response.json();
        return data.data.reduce((acc, emote) => {
            acc[emote.name] = emote.images.url_1x;
            return acc;
        }, {});
    } catch (error) {
        console.error("Error fetching channel emotes:", error);
        return {};
    }
}

/**
 * Fetches a channel's profile picture
 */
async function fetchChannelPicture(channel) {
    if (channelPictures[channel]) return channelPictures[channel];

    const token = localStorage.getItem("twitchAccessToken");
    if (!token) {
        console.error("OAuth token missing in fetchChannelPicture");
        return null;
    }

    try {
        const response = await fetch(`https://api.twitch.tv/helix/users?login=${channel}`, {
            headers: { "Client-ID": clientId, "Authorization": `Bearer ${token}` }
        });

        const data = await response.json();
        if (data.data && data.data.length > 0) {
            const imgUrl = data.data[0].profile_image_url;
            channelPictures[channel] = imgUrl; // Cache result
            return imgUrl;
        }

        return null;
    } catch (error) {
        console.error("Error fetching channel picture:", error);
        return null;
    }
}

/**
 * Checks if tracked channels are live
 */
async function checkLiveStatus() {
    if (!trackedChannels.length) return;

    const token = localStorage.getItem("twitchAccessToken");
    if (!token) {
        console.error("OAuth token missing in checkLiveStatus");
        return;
    }

    const query = trackedChannels.map(channel => `user_login=${encodeURIComponent(channel)}`).join("&");

    try {
        const response = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
            headers: { "Client-ID": clientId, "Authorization": `Bearer ${token}` }
        });

        const data = await response.json();

        // Reset live status
        trackedChannels.forEach(channel => (liveChannelsStatus[channel] = false));

        // Update live status if any channel is live
        if (data.data) {
            data.data.forEach(stream => {
                liveChannelsStatus[stream.user_login.toLowerCase()] = true;
            });
        }

        console.log("Live Channels:", liveChannelsStatus);
    } catch (error) {
        console.error("Error checking live status:", error);
    }
}

/**
 * Loads tracked channels from local storage
 */
function loadTrackedChannels() {
    const stored = localStorage.getItem("trackedChannels");
    if (stored) {
        trackedChannels = JSON.parse(stored);
        console.log("Loaded Tracked Channels:", trackedChannels);
    }
}

/**
 * Saves tracked channels to local storage
 */
function saveTrackedChannels() {
    localStorage.setItem("trackedChannels", JSON.stringify(trackedChannels));
}

// Make important functions accessible globally
window.fetchGlobalBadges = fetchGlobalBadges;
window.fetchGlobalEmotes = fetchGlobalEmotes;
window.getBroadcasterId = getBroadcasterId;
window.fetchChannelEmotes = fetchChannelEmotes;
window.fetchChannelPicture = fetchChannelPicture;
window.checkLiveStatus = checkLiveStatus;
window.loadTrackedChannels = loadTrackedChannels;
window.saveTrackedChannels = saveTrackedChannels;
