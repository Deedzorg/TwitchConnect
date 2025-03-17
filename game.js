document.addEventListener("DOMContentLoaded", () => {
    console.log("Game.js loaded and DOM is ready.");

    // Ensure global access to participants and leaderboard
    window.participants = window.participants || [];
    window.leaderboard = window.leaderboard || {};

    let currentQuestion = {};
    let questionCount = 0;

    // Connect to Twitch chat
    const twitchChannel = "your_channel_name";  // 🔹 Replace with your Twitch channel
    const socket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");

    socket.onopen = () => {
        console.log("✅ Connected to Twitch chat!");
        socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
        socket.send(`PASS oauth:your_oauth_token`);  // 🔹 Replace with your OAuth token
        socket.send("NICK justinfan123"); // Anonymous login
        socket.send(`JOIN #${twitchChannel}`);
    };

    socket.onmessage = (event) => {
        const message = event.data;
        console.log("📩 Twitch Chat Message:", message);

        if (message.includes("PRIVMSG")) {
            const parsed = parseTwitchMessage(message);
            const username = parsed.username;
            const chatMessage = parsed.message;

            // Check for !play command
            if (chatMessage.toLowerCase().trim() === "!play") {
                addParticipant(username);
                return;
            }

            // Check for answers like "!answer 2"
            if (chatMessage.toLowerCase().startsWith("!answer")) {
                const answer = chatMessage.split(" ")[1]; // Get the number
                handleTwitchAnswer(username, answer);
            }
        }
    };

    function parseTwitchMessage(message) {
        const regex = /:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.*)/;
        const match = message.match(regex);
        return match ? { username: match[1], message: match[2].trim() } : null;
    }

    function addParticipant(username) {
        if (!window.participants.includes(username)) {
            window.participants.push(username);
            window.leaderboard[username] = 0;
            console.log(`${username} joined the game!`);
        }
    }

    function handleTwitchAnswer(username, answer) {
        if (!window.participants.includes(username)) return;

        if (answer && answer.trim() === currentQuestion.correct_answer) {
            window.leaderboard[username] = (window.leaderboard[username] || 0) + 1;
            console.log(`✅ ${username} answered correctly!`);
        } else {
            console.log(`❌ ${username} answered incorrectly.`);
        }

        // Update leaderboard every 5 questions
        if (questionCount % 5 === 0) {
            updateLeaderboardDisplay();
        }
    }

    async function fetchTriviaQuestion() {
        try {
            const response = await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
            const data = await response.json();
            return data.results[0];
        } catch (error) {
            console.error("Error fetching trivia question:", error);
        }
    }

    function displayQuestion(data) {
        const questionText = document.getElementById("question-text");
        const buttons = document.querySelectorAll(".option-btn");

        questionText.innerHTML = data.question;
        let options = [data.correct_answer, ...data.incorrect_answers];
        options.sort(() => Math.random() - 0.5);

        buttons.forEach((btn, index) => {
            btn.textContent = options[index];
            btn.dataset.answer = options[index];
        });

        currentQuestion.correct_answer = data.correct_answer;
    }

    function updateLeaderboardDisplay() {
        const leaderboardEl = document.getElementById("leaderboard");
        leaderboardEl.innerHTML = "";

        Object.entries(window.leaderboard)
            .sort((a, b) => b[1] - a[1])
            .forEach(([user, score]) => {
                const li = document.createElement("li");
                li.textContent = `${user}: ${score}`;
                leaderboardEl.appendChild(li);
            });
    }

    async function loadNewQuestion() {
        const data = await fetchTriviaQuestion();
        if (data) {
            currentQuestion = data;
            questionCount++;
            displayQuestion(data);
        }
    }

    // Start the game
    loadNewQuestion();
});
