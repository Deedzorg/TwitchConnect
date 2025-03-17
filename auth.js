const clientId = "1cvmce5wrxeuk4hpfgd4ssfthiwx46";
let oauthToken = localStorage.getItem("twitchAccessToken");

// Check if the token is valid
async function checkTokenValidity() {
    const response = await fetch("https://id.twitch.tv/oauth2/validate", {
        headers: { "Authorization": `Bearer ${oauthToken}` }
    });

    if (!response.ok) {
        console.warn("OAuth token is invalid. Redirecting to login...");
        localStorage.removeItem("twitchAccessToken");
        window.location.href = `https://id.twitch.tv/oauth2/authorize?${new URLSearchParams({
            client_id: clientId,
            redirect_uri: 'https://deedzorg.github.io/TwitchConnect/callback.html',
            response_type: 'token',
            scope: 'user:read:email chat:read chat:edit'
        })}`;
    }
}

// Ensure token is checked on page load
document.addEventListener("DOMContentLoaded", checkTokenValidity);
