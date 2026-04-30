const ROWS = 6;
const COLS = 7;
const MAX_SCORES = 7;
const ADMIN_PASSWORD = "admin"; // <--- CHANGE YOUR PASSWORD HERE

let board;
let currentPlayer;
let gameOver;
let moveCount;

let audioCtx;

window.onload = function () {
  updateHighScoreDisplay();
  initializeGame();

  document
    .getElementById("reset-btn")
    .addEventListener("click", initializeGame);
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

function initializeGame() {
  board = [];
  currentPlayer = "red";
  gameOver = false;
  moveCount = 0;

  const statusText = document.getElementById("status");
  statusText.innerText = "Red's Turn";
  statusText.style.color = "#ff3333";

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
      cell.addEventListener("click", placePiece);
      boardDiv.append(cell);
    }
    board.push(row);
  }
}

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

function placePiece() {
  if (gameOver) return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  let coords = this.id.split("-");
  let c = parseInt(coords[1]);

  let r = ROWS - 1;
  while (r >= 0 && board[r][c] !== " ") {
    r--;
  }

  if (r < 0) return;

  board[r][c] = currentPlayer;
  moveCount++;

  let cell = document.getElementById(r.toString() + "-" + c.toString());

  let chipDiv = document.createElement("div");
  chipDiv.classList.add("chip", currentPlayer);
  cell.appendChild(chipDiv);

  chipDiv.addEventListener("animationend", playDropSound);

  checkWin();

  if (!gameOver) {
    currentPlayer = currentPlayer === "red" ? "black" : "red";

    const statusText = document.getElementById("status");
    if (currentPlayer === "red") {
      statusText.innerText = "Red's Turn";
      statusText.style.color = "#ff3333";
    } else {
      statusText.innerText = "Black's Turn";
      statusText.style.color = "#888888";
    }
  }
}

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
    console.error("Score data was corrupted, resetting leaderboard.");
  }
  return [];
}

function declareWinner(winner, winningCells) {
  const statusText = document.getElementById("status");
  statusText.innerText =
    winner.toUpperCase() + " WINS IN " + moveCount + " MOVES!";
  statusText.style.color = winner === "red" ? "#ff3333" : "#888888";
  gameOver = true;

  for (let i = 0; i < winningCells.length; i++) {
    let r = winningCells[i][0];
    let c = winningCells[i][1];
    let cell = document.getElementById(r.toString() + "-" + c.toString());
    let chip = cell.querySelector(".chip");
    if (chip) chip.classList.add("flash");
  }

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

function saveHighScore() {
  let nameInput = document.getElementById("player-name").value;

  if (nameInput.trim() === "") {
    nameInput = "ANON";
  }

  let newRecord = {
    name: nameInput.toUpperCase(),
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

  if (userInput === null) {
    return;
  }

  if (userInput === ADMIN_PASSWORD) {
    localStorage.removeItem("c4_topScores");
    updateHighScoreDisplay();
    alert("Leaderboard has been completely reset.");
  } else {
    alert("Incorrect password. Leaderboard was not reset.");
  }
}
