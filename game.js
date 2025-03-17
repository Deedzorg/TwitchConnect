document.addEventListener("DOMContentLoaded", () => {
    console.log("Game.js loaded and DOM is ready.");

    // Ensure global access to participants and leaderboard
    window.participants = window.participants || [];
    window.leaderboard = window.leaderboard || {};

    let currentQuestion = {};
    let questionCount = 0;

    // Listen for players joining
    window.addEventListener("PlayerJoined", (event) => {
        const username = event.detail.username;

        if (!window.participants.includes(username)) {
            window.participants.push(username);
            window.leaderboard[username] = 0;
            console.log(`${username} has joined the game!`);
        } else {
            console.log(`${username} is already in the game.`);
        }
    });

    // Listen for player answers
    window.addEventListener("PlayerAnswered", (event) => {
        const { username, answer } = event.detail;

        if (!window.participants.includes(username)) {
            console.log(`${username} is not in the game!`);
            return;
        }

        // Check if answer matches the correct one
        if (answer === currentQuestion.correct_answer[0].toUpperCase()) {
            window.leaderboard[username] += 10; // Add points
            console.log(`✅ ${username} answered correctly! Score: ${window.leaderboard[username]}`);
        } else {
            console.log(`❌ ${username} answered incorrectly.`);
        }

        // Update leaderboard every 5 questions
        if (questionCount % 5 === 0) {
            updateLeaderboardDisplay();
        }
    });

    // Fetch a trivia question
    async function fetchTriviaQuestion() {
        try {
            const response = await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
            const data = await response.json();
            return data.results[0];
        } catch (error) {
            console.error("Error fetching trivia question:", error);
        }
    }

    // Display a question
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

    // Update leaderboard UI
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

    // Load a new question
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

