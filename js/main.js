// Load and initialize the app
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Main script loaded.");

    await checkTokenValidity(); // Ensure OAuth is valid
    await initApp(); // Initialize the app

    // Auto-reopen chats on reload
    trackedChannels.forEach(channel => openChat(channel));
});
