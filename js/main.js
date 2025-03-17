// Load and initialize the app
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Main script loaded.");

    try {
        await checkTokenValidity(); // Ensure OAuth is valid
        await initApp(); // Initialize the app

        // Auto-reopen chats on reload
        trackedChannels.forEach(channel => openChat(channel));

        console.log("Initialization complete.");
    } catch (error) {
        console.error("Error during initialization:", error);
    }
});
