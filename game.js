document.addEventListener("DOMContentLoaded", () => {
    console.log("Game.js loaded and DOM is ready.");

    // Ensure global access to participants and leaderboard
    window.participants = window.participants || [];
    window.leaderboard = window.leaderboard || {};

    let currentQuestion = {};
    let questionCount = 0;
    let currentUser = null;

    // Ensure Twitch user is loaded from script.js
    if (typeof getTwitchUserInfo === 'function') {
        getTwitchUserInfo().then(userInfo => {
            console.log("Twitch User Info Retrieved:", userInfo);
            currentUser = userInfo.display_name;

            // Add user as a participant if not already in the game
            addParticipant(currentUser);

            // Display welcome message in the game UI
            const gameContainer = document.getElementById("game-container");
            if (gameContainer) {
                gameContainer.insertAdjacentHTML('afterbegin', `<h2>Welcome, ${currentUser}!</h2>`);
            }
        }).catch(err => console.error("Failed to fetch Twitch user:", err));
    } else {
        console.error("Twitch integration not found in script.js");
    }

    // Fetch a trivia question from API
    async function fetchTriviaQuestion() {
        try {
            const response = await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
            const data = await response.json();
            const questionObj = data.results[0];

            return {
                question: questionObj.question,
                correct_answer: questionObj.correct_answer,
                incorrect_answers: questionObj.incorrect_answers
            };
        } catch (error) {
            console.error("Error fetching trivia question:", error);
        }
    }

    // Shuffle answer options randomly
    function shuffleOptions(options) {
        return options.sort(() => Math.random() - 0.5);
    }

    // Load a new trivia question
    async function loadNewQuestion() {
        const data = await fetchTriviaQuestion();
        if (data) {
            currentQuestion = data;
            questionCount++;
            displayQuestion(data);
        }
    }

    // Display the question and multiple-choice answers
    function displayQuestion(data) {
        const questionText = document.getElementById("question-text");
        const buttons = document.querySelectorAll(".option-btn");

        questionText.innerHTML = data.question;
        let options = [data.correct_answer, ...data.incorrect_answers];
        options = shuffleOptions(options);

        // Assign answer options to buttons
        buttons.forEach((btn, index) => {
            btn.textContent = options[index];
            btn.dataset.answer = options[index];
        });
    }

    // Update the leaderboard display
    function updateLeaderboardDisplay() {
        const leaderboardEl = document.getElementById("leaderboard");
        leaderboardEl.innerHTML = "";

        // Sort players by score
        const sorted = Object.entries(window.leaderboard).sort((a, b) => b[1] - a[1]);

        sorted.forEach(([user, score]) => {
            const li = document.createElement("li");
            li.textContent = `${user}: ${score}`;
            leaderboardEl.appendChild(li);
        });
    }

    // Add a participant when they type !PlayGame in Twitch chat
    function addParticipant(username) {
        if (!window.participants.includes(username)) {
            window.participants.push(username);
            window.leaderboard[username] = 0;
            console.log(`${username} joined the game!`);
        }
    }

    // Handle answer selection
    function handleAnswerClick(e) {
        let answeringUser = currentUser;

        // If no logged-in user, allow chat participants to answer
        if (!answeringUser || !window.participants.includes(answeringUser)) {
            const enteredName = prompt("Enter your Twitch username to answer:");
            if (!enteredName) return;

            answeringUser = enteredName.trim();

            // Auto-add to the game if not already a participant
            if (!window.participants.includes(answeringUser)) {
                addParticipant(answeringUser);
            }
        }

        const selectedAnswer = e.target.dataset.answer;
        if (selectedAnswer === currentQuestion.correct_answer) {
            window.leaderboard[answeringUser] = (window.leaderboard[answeringUser] || 0) + 1;
            alert(`Correct! +1 point for ${answeringUser}.`);
        } else {
            alert(`Incorrect. The correct answer was "${currentQuestion.correct_answer}".`);
        }

        // Update leaderboard every 5 questions
        if (questionCount % 5 === 0) {
            updateLeaderboardDisplay();
        }

        loadNewQuestion();
    }

    // Attach event listeners to answer buttons
    document.querySelectorAll(".option-btn").forEach(btn => {
        btn.addEventListener("click", handleAnswerClick);
    });

    // Function to simulate a Twitch user login
    function setTwitchUser(username) {
        currentUser = username;
        alert(`Welcome, ${username}!`);
    }

    // Start the game by loading the first question
    loadNewQuestion();
});
