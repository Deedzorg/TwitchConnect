function connectToTwitchChat(channel, chatWindow) {
    const socket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");

    socket.onopen = () => {
        console.log(`✅ Connected to #${channel}`);
        socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
        socket.send(`PASS oauth:${oauthToken}`);
        socket.send(`NICK ${username}`);
        socket.send(`JOIN #${channel}`);
    };

    socket.onmessage = (event) => {
        console.log(`[${channel}] Received:`, event.data);
        if (event.data.startsWith("PING")) {
            socket.send("PONG :tmi.twitch.tv");
            return;
        }

        const match = event.data.match(/:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #(\w+) :(.*)/);
        if (!match) return;

        const displayName = match[1];
        const rawMessage = match[3].trim();

        const messageElem = document.createElement("div");
        messageElem.className = "chat-message";
        messageElem.innerHTML = `<span class="username">${displayName}:</span> ${rawMessage}`;
        chatWindow.appendChild(messageElem);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };

    socket.onclose = () => console.log(`🔌 Disconnected from #${channel}`);
    return socket;
}
