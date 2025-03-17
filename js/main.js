document.addEventListener("DOMContentLoaded", async () => {
    console.log("Main script loaded.");

    // Wait until `initApp` is available
    let retries = 10;
    while (!window.initApp && retries > 0) {
        console.warn("Waiting for initApp...");
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        retries--;
    }

    if (!window.initApp) {
        console.error("initApp is still undefined after waiting.");
        return;
    }

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
