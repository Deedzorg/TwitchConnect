# Twitch Multi-Chat Viewer

**Twitch Multi-Chat Viewer** is a web application that lets you monitor and interact with multiple Twitch chat channels simultaneously from a single browser window. It leverages Twitch’s IRC (chat) system via WebSockets and enriches the chat experience with custom emotes, badges, and channel management features.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [OAuth & Authentication](#oauth--authentication)
- [File Structure](#file-structure)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Twitch Multi-Chat Viewer is designed for Twitch enthusiasts and stream moderators who want to keep an eye on multiple channels at once. Rather than switching tabs or using multiple windows, this application presents a unified interface where you can add any Twitch channel’s chat, manage them, and even interact using global commands.

The app features a slider-based layout to navigate between chat boxes, supports both global and channel-specific emotes and badges, and even includes unique functionalities such as an auto-pokecatch feature for Pokémon-related streams.

---

## Features

- **Multi-Chat Interface:**\
  Monitor several Twitch chats side by side with a responsive slider for smooth navigation.

- **Channel Manager:**\
  Easily add or remove channels to your tracked list. Channels are saved locally in your browser so that your selection persists between sessions.

- **Global & Channel-Specific Emotes and Badges:**\
  The application fetches and displays Twitch’s global badges and emotes as well as channel-specific assets, making it easier to recognize users and their statuses.

- **Real-Time Chat Integration:**\
  Connects to Twitch’s IRC server via WebSockets. It parses Twitch chat messages, processes IRC tags, and displays each message with a timestamp, username, and any associated badges/emotes.

- **OAuth Authentication:**\
  Users log in using their Twitch account via OAuth. This token-based authentication enables personalized experiences, including fetching user data and connecting to chat using your account.

- **Auto-Pokecatch (Optional):**\
  For channels that host Pokémon community games, the app can automatically respond to wild Pokémon appearances by sending catch commands. This feature helps users play without manually reacting to every event in the chat.

- **Global Chat Input:**\
  In addition to individual chat windows, you can send messages globally across all open channels with a single input field.

- **Responsive Design:**\
  Built with modern HTML, CSS, and JavaScript, the interface adapts seamlessly to different screen sizes for both desktop and mobile users.

---

## How It Works

### Authentication Flow

1. **OAuth Token Check:**\
   When the application is loaded, it checks for an OAuth token in `localStorage`.

   - **No Token:** If no token is found, the user is automatically redirected to Twitch’s OAuth authorization endpoint.
   - **Token Present:** If a token exists, the app uses it to fetch the logged-in user’s data (such as display name) from Twitch’s Helix API.

2. **Token Callback:**\
   After logging in, Twitch redirects you to a dedicated callback page (`callback.html`). This page extracts the access token from the URL, stores it in `localStorage`, and then redirects back to the main application.

### App Initialization

- **Fetching Global Assets:**\
  Once authenticated, the app calls functions to fetch global badges and emotes from Twitch’s APIs. These assets are used to enrich the chat display with visual elements like badges and custom Twitch emotes.

- **Channel Management and Live Status:**\
  The app loads a list of channels that you want to track. It periodically checks which channels are live and updates the UI accordingly. When a channel goes live, its chat box is automatically opened; when it goes offline, the chat box may be closed.

### Chat Connection

- **WebSocket Connection:**\
  For every live channel, the app opens a WebSocket connection to Twitch’s IRC server.
  - **Authentication:** The connection sends the necessary IRC commands (CAP, PASS, NICK, JOIN) to authenticate and join the chat room.
  - **Message Parsing:** Incoming messages are parsed to extract user information (display name, badges, etc.) and the actual chat content. The app then builds a styled message element and appends it to the appropriate chat window.

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/TwitchConnect.git
cd TwitchConnect
```

### 2. Configure Your Twitch Credentials

- Open `script.js` and update the `clientId` variable with your Twitch application's Client ID.
- In your [Twitch Developer Dashboard](https://dev.twitch.tv/console/apps), register the following as your OAuth callback URL:
  ```
  https://deedzorg.github.io/TwitchConnect/callback.html
  ```

### 3. Host on GitHub Pages

- Push your repository to GitHub.
- In your repository’s settings, enable GitHub Pages (set the source to your main branch or a designated folder).
- Your app will be available at:
  ```
  https://deedzorg.github.io/TwitchConnect/
  ```

---

## Future Enhancements

- **Improved UI/UX:**\
  Enhance the design and add animations for smoother transitions between chats.

- **Additional Chat Commands:**\
  Expand command functionality (e.g., custom moderation commands).

- **Mobile Optimization:**\
  Further optimize the interface for mobile devices.

- **Settings Panel:**\
  Allow users to customize their experience, such as theme selection or notification settings.

- **Enhanced Auto-Pokecatch:**\
  Provide more advanced features for the auto-pokecatch functionality.

---

## Contributing

Contributions are welcome! If you have suggestions, bug fixes, or improvements, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request with a detailed description of your changes.

---

## License

This project is licensed under the MIT License.

