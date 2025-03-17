async function fetchGlobalBadges() {
    const token = localStorage.getItem("twitchAccessToken");
    if (!token) return console.error("OAuth token missing in fetchGlobalBadges");

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

async function fetchGlobalEmotes() {
    const response = await fetch("https://api.twitch.tv/helix/chat/emotes/global", {
        headers: { "Client-ID": clientId, "Authorization": `Bearer ${oauthToken}` }
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
}
