async function openChat(channel) {
    if (document.querySelector(`.chat-box[data-channel="${channel}"]`)) return;

    const chatBox = document.createElement("div");
    chatBox.className = "chat-box";
    chatBox.dataset.channel = channel;

    const header = document.createElement("div");
    header.className = "chat-header";
    header.innerHTML = `<h4>#${channel}</h4><button class="close-btn" onclick="closeChat('${channel}')">X</button>`;
    chatBox.appendChild(header);

    const messagesDiv = document.createElement("div");
    messagesDiv.className = "messages";
    chatBox.appendChild(messagesDiv);

    document.getElementById("chat-container").appendChild(chatBox);
    connectToTwitchChat(channel, messagesDiv);
}

function closeChat(channel) {
    const chatBox = document.querySelector(`.chat-box[data-channel="${channel}"]`);
    if (chatBox) {
        chatBox.remove();
        console.log(`Closed chat for ${channel}`);
    }
}
