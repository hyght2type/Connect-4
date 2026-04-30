const ROWS = 6;
const COLS = 7;
const MAX_SCORES = 7;
const ADMIN_PASSWORD = "admin";

let board;
let currentPlayer;
let gameOver;
let moveCount;
let audioCtx;

// New AI State Variables
let isSinglePlayer = true; // Defaults to playing the AI
let isComputerThinking = false;

window.onload = function () {
  updateHighScoreDisplay();
  initializeGame(true); // Start in 1P mode by default

  // Mode Buttons
  document
    .getElementById("btn-1p")
    .addEventListener("click", () => initializeGame(true));
  document
    .getElementById("btn-2p")
    .addEventListener("click", () => initializeGame(false));

  document.getElementById("save-btn").addEventListener("click", saveHighScore);
  document
    .getElementById("leaderboard-btn")
    .addEventListener("click", openModal);
  document.getElementById("close-modal").addEventListener("click", closeModal);
  document
    .getElementById("clear-leaderboard-btn")
    .addEventListener("click", clearLeaderboard);

  document
    .getElementById("leaderboard-modal")
    .addEventListener("click", function (event) {
      if (event.target === this) closeModal();
    });
};

function initializeGame(singlePlayerMode) {
  board = [];
  currentPlayer = "red";
  gameOver = false;
  moveCount = 0;
  isSinglePlayer = singlePlayerMode;
  isComputerThinking = false;

  updateStatusText();

  document.getElementById("record-entry").style.display = "none";

  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML = "";

  for (let r = 0; r < ROWS; r++) {
    let row = [];
    for (let c = 0; c < COLS; c++) {
      row.push(" ");
      let cell = document.createElement("div");
      cell.id = r.toString() + "-" + c.toString();
      cell.classList.add("cell");

      // Re-routed click event through our new handler
      cell.addEventListener("click", handleCellClick);
      boardDiv.append(cell);
    }
    board.push(row);
  }
}

function updateStatusText() {
  const statusText = document.getElementById("status");
  if (gameOver) return;

  if (currentPlayer === "red") {
    statusText.innerText = "Red's Turn";
    statusText.style.color = "#ff3333";
  } else {
    if (isSinglePlayer) {
      statusText.innerText = "Computer is thinking...";
      statusText.style.color = "#888888";
    } else {
      statusText.innerText = "Black's Turn";
      statusText.style.color = "#888888";
    }
  }
}

// ---------------- AUDIO SYSTEM ----------------
function playDropSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);

  masterGain.gain.setValueAtTime(1.5, now);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  const snapOsc = audioCtx.createOscillator();
  snapOsc.type = "square";
  snapOsc.frequency.setValueAtTime(1500, now);
  snapOsc.frequency.exponentialRampToValueAtTime(100, now + 0.02);
  snapOsc.connect(masterGain);

  const bodyOsc = audioCtx.createOscillator();
  bodyOsc.type = "triangle";
  bodyOsc.frequency.setValueAtTime(600, now);
  bodyOsc.frequency.exponentialRampToValueAtTime(150, now + 0.04);
  bodyOsc.connect(masterGain);

  snapOsc.start(now);
  bodyOsc.start(now);
  snapOsc.stop(now + 0.05);
  bodyOsc.stop(now + 0.05);
}

// ---------------- GAME LOGIC ----------------
function handleCellClick() {
  // Prevent human clicking if game is over or AI is thinking
  if (gameOver || isComputerThinking) return;

  // Wake up audio engine on user interaction
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  let coords = this.id.split("-");
  let c = parseInt(coords[1]);

  processMove(c);
}

// Separated dropping logic from clicking logic so the AI can use it
function processMove(c) {
  let r = ROWS - 1;
  while (r >= 0 && board[r][c] !== " ") {
    r--;
  }

  // Column is full
  if (r < 0) return;

  // Formally place the piece
  board[r][c] = currentPlayer;
  moveCount++;

  let cell = document.getElementById(r.toString() + "-" + c.toString());
  let chipDiv = document.createElement("div");
  chipDiv.classList.add("chip", currentPlayer);
  cell.appendChild(chipDiv);
  chipDiv.addEventListener("animationend", playDropSound);

  checkWin();

  if (!gameOver) {
    // Swap turns
    currentPlayer = currentPlayer === "red" ? "black" : "red";
    updateStatusText();

    // Trigger AI Turn if applicable
    if (isSinglePlayer && currentPlayer === "black") {
      isComputerThinking = true;
      // Delay the AI move slightly so it feels natural
      setTimeout(makeComputerMove, 700);
    }
  }
}

// ---------------- AI ALGORITHM ----------------
function makeComputerMove() {
  if (gameOver) return;

  let bestCol = -1;

  // RULE 1: Can the AI win right now? (Prioritize winning)
  for (let c = 0; c < COLS; c++) {
    if (simulateWin(c, "black")) {
      bestCol = c;
      break;
    }
  }

  // RULE 2: If no immediate win, can the player win next turn? (Block them)
  if (bestCol === -1) {
    for (let c = 0; c < COLS; c++) {
      if (simulateWin(c, "red")) {
        bestCol = c;
        break;
      }
    }
  }

  // RULE 3: Otherwise, pick the best available strategic column
  // The center column is the strongest in Connect 4, moving outward
  if (bestCol === -1) {
    const strategicPreferences = [3, 2, 4, 1, 5, 0, 6];
    let validCols = [];

    // Find which columns aren't full yet
    for (let c of strategicPreferences) {
      if (board[0][c] === " ") validCols.push(c);
    }

    // Add a 25% chance the AI picks a random valid column so it's not totally predictable
    if (Math.random() < 0.25) {
      bestCol = validCols[Math.floor(Math.random() * validCols.length)];
    } else {
      bestCol = validCols[0]; // Takes highest priority center-weighted column
    }
  }

  isComputerThinking = false;
  processMove(bestCol);
}

// Helper for AI: Drops a phantom piece and checks if it results in a win
function simulateWin(col, player) {
  let r = ROWS - 1;
  while (r >= 0 && board[r][col] !== " ") {
    r--;
  }
  if (r < 0) return false; // Column full

  // Place phantom piece
  board[r][col] = player;

  // Check if it wins
  let isWin = false;

  // Check Horizontal
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS - 3; j++) {
      if (
        board[i][j] === player &&
        board[i][j + 1] === player &&
        board[i][j + 2] === player &&
        board[i][j + 3] === player
      )
        isWin = true;
    }
  }
  // Check Vertical
  for (let j = 0; j < COLS; j++) {
    for (let i = 0; i < ROWS - 3; i++) {
      if (
        board[i][j] === player &&
        board[i + 1][j] === player &&
        board[i + 2][j] === player &&
        board[i + 3][j] === player
      )
        isWin = true;
    }
  }
  // Check Diagonal
  for (let i = 0; i < ROWS - 3; i++) {
    for (let j = 0; j < COLS - 3; j++) {
      if (
        board[i][j] === player &&
        board[i + 1][j + 1] === player &&
        board[i + 2][j + 2] === player &&
        board[i + 3][j + 3] === player
      )
        isWin = true;
    }
  }
  // Check Anti-Diagonal
  for (let i = 3; i < ROWS; i++) {
    for (let j = 0; j < COLS - 3; j++) {
      if (
        board[i][j] === player &&
        board[i - 1][j + 1] === player &&
        board[i - 2][j + 2] === player &&
        board[i - 3][j + 3] === player
      )
        isWin = true;
    }
  }

  // Remove phantom piece so we don't break the real game
  board[r][col] = " ";
  return isWin;
}

// ---------------- WIN CHECKING ----------------
function checkWin() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (
        board[r][c] !== " " &&
        board[r][c] === board[r][c + 1] &&
        board[r][c + 1] === board[r][c + 2] &&
        board[r][c + 2] === board[r][c + 3]
      ) {
        declareWinner(board[r][c], [
          [r, c],
          [r, c + 1],
          [r, c + 2],
          [r, c + 3],
        ]);
        return;
      }
    }
  }

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      if (
        board[r][c] !== " " &&
        board[r][c] === board[r + 1][c] &&
        board[r + 1][c] === board[r + 2][c] &&
        board[r + 2][c] === board[r + 3][c]
      ) {
        declareWinner(board[r][c], [
          [r, c],
          [r + 1, c],
          [r + 2, c],
          [r + 3, c],
        ]);
        return;
      }
    }
  }

  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (
        board[r][c] !== " " &&
        board[r][c] === board[r + 1][c + 1] &&
        board[r + 1][c + 1] === board[r + 2][c + 2] &&
        board[r + 2][c + 2] === board[r + 3][c + 3]
      ) {
        declareWinner(board[r][c], [
          [r, c],
          [r + 1, c + 1],
          [r + 2, c + 2],
          [r + 3, c + 3],
        ]);
        return;
      }
    }
  }

  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (
        board[r][c] !== " " &&
        board[r][c] === board[r - 1][c + 1] &&
        board[r - 1][c + 1] === board[r - 2][c + 2] &&
        board[r - 2][c + 2] === board[r - 3][c + 3]
      ) {
        declareWinner(board[r][c], [
          [r, c],
          [r - 1, c + 1],
          [r - 2, c + 2],
          [r - 3, c + 3],
        ]);
        return;
      }
    }
  }
}

// ---------------- LEADERBOARD ----------------
function getSavedScores() {
  try {
    let scores = localStorage.getItem("c4_topScores");
    if (scores) {
      let parsed = JSON.parse(scores);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Score data corrupted, resetting.");
  }
  return [];
}

function declareWinner(winner, winningCells) {
  const statusText = document.getElementById("status");
  let winMessage = winner.toUpperCase() + " WINS IN " + moveCount + " MOVES!";

  // Let the player know if the AI beat them
  if (isSinglePlayer && winner === "black") {
    winMessage = "COMPUTER WINS!";
  }

  statusText.innerText = winMessage;
  statusText.style.color = winner === "red" ? "#ff3333" : "#888888";
  gameOver = true;

  for (let i = 0; i < winningCells.length; i++) {
    let r = winningCells[i][0];
    let c = winningCells[i][1];
    let cell = document.getElementById(r.toString() + "-" + c.toString());
    let chip = cell.querySelector(".chip");
    if (chip) chip.classList.add("flash");
  }

  // Only Red (Player 1 or Player 1 in 2P) gets saved to the leaderboard to prevent the computer taking all the top spots!
  if (winner === "red") {
    let scores = getSavedScores();
    let qualifiesForLeaderboard = false;

    if (scores.length < MAX_SCORES) {
      qualifiesForLeaderboard = true;
    } else {
      let worstScore = scores[scores.length - 1].moves;
      if (moveCount <= worstScore) {
        qualifiesForLeaderboard = true;
      }
    }

    if (qualifiesForLeaderboard) {
      document.getElementById("record-entry").style.display = "block";
      document.getElementById("player-name").focus();
    }
  }
}

function saveHighScore() {
  let nameInput = document.getElementById("player-name").value;
  if (nameInput.trim() === "") nameInput = "ANON";

  // Tag the mode to the name
  let modeTag = isSinglePlayer ? " (1P)" : " (2P)";

  let newRecord = {
    name: nameInput.toUpperCase() + modeTag,
    moves: moveCount,
  };

  let scores = getSavedScores();
  scores.push(newRecord);
  scores.sort((a, b) => a.moves - b.moves);

  if (scores.length > MAX_SCORES) {
    scores = scores.slice(0, MAX_SCORES);
  }

  localStorage.setItem("c4_topScores", JSON.stringify(scores));

  updateHighScoreDisplay();
  document.getElementById("record-entry").style.display = "none";
  openModal();
}

function updateHighScoreDisplay() {
  let scores = getSavedScores();
  let listElement = document.getElementById("high-score-list");

  listElement.innerHTML = "";

  if (scores.length === 0) {
    listElement.innerHTML =
      "<li style='list-style:none; text-align:center;'>No records set yet</li>";
    return;
  }

  scores.forEach((score) => {
    let li = document.createElement("li");
    li.innerText = `${score.name} - ${score.moves} moves`;
    listElement.appendChild(li);
  });
}

function openModal() {
  updateHighScoreDisplay();
  document.getElementById("leaderboard-modal").style.display = "flex";
}

function closeModal() {
  document.getElementById("leaderboard-modal").style.display = "none";
}

function clearLeaderboard() {
  let userInput = prompt("Enter the admin password to clear the leaderboard:");
  if (userInput === null) return;

  if (userInput === ADMIN_PASSWORD) {
    localStorage.removeItem("c4_topScores");
    updateHighScoreDisplay();
    alert("Leaderboard has been completely reset.");
  } else {
    alert("Incorrect password. Leaderboard was not reset.");
  }
}
