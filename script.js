const ROWS = 6;
const COLS = 7;
const MAX_SCORES = 7;
const ADMIN_PASSWORD = "admin";

let board;
let currentPlayer;
let gameOver;
let moveCount;
let audioCtx;

let isSinglePlayer = true;
let isComputerThinking = false;

window.onload = function () {
  updateHighScoreDisplay();
  initializeGame(true);

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
  if (gameOver || isComputerThinking) return;

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

function processMove(c) {
  let r = getOpenRow(c);
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
    updateStatusText();

    if (isSinglePlayer && currentPlayer === "black") {
      isComputerThinking = true;
      // Let the UI breathe before the computer freezes it to think
      setTimeout(makeComputerMove, 50);
    }
  }
}

function getOpenRow(c) {
  let r = ROWS - 1;
  while (r >= 0 && board[r][c] !== " ") {
    r--;
  }
  return r;
}

function isBoardFull() {
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === " ") return false;
  }
  return true;
}

// ---------------- AI ALGORITHM & DIFFICULTY ----------------
function makeComputerMove() {
  if (gameOver) return;

  let difficulty = document.getElementById("ai-difficulty").value;
  let validCols = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === " ") validCols.push(c);
  }

  let bestCol = -1;

  // RULE 1: IMMEDIATE WIN OR BLOCK (Always active)
  for (let c of validCols) {
    if (simulateWin(c, "black")) {
      bestCol = c;
      break;
    }
  }
  if (bestCol === -1) {
    for (let c of validCols) {
      if (simulateWin(c, "red")) {
        bestCol = c;
        break;
      }
    }
  }

  // RULE 2: DELEGATE TO DIFFICULTY ENGINE
  if (bestCol === -1) {
    if (difficulty === "easy") {
      bestCol = getEasyMove(validCols);
    } else if (difficulty === "medium") {
      bestCol = getMediumMove(validCols);
    } else if (difficulty === "hard") {
      bestCol = getUltraHardMove(validCols);
    }
  }

  isComputerThinking = false;
  processMove(bestCol);
}

function getEasyMove(validCols) {
  if (Math.random() < 0.25)
    return validCols[Math.floor(Math.random() * validCols.length)];
  const centerPrefs = [3, 2, 4, 1, 5, 0, 6];
  for (let c of centerPrefs) {
    if (validCols.includes(c)) return c;
  }
  return validCols[0];
}

function getMediumMove(validCols) {
  let safeCols = [];
  for (let c of validCols) {
    let r = getOpenRow(c);
    board[r][c] = "black";
    let givesWin = false;
    if (r - 1 >= 0) {
      board[r - 1][c] = "red";
      if (checkBoardWin("red")) givesWin = true;
      board[r - 1][c] = " ";
    }
    board[r][c] = " ";
    if (!givesWin) safeCols.push(c);
  }

  let options = safeCols.length > 0 ? safeCols : validCols;
  const centerPrefs = [3, 2, 4, 1, 5, 0, 6];
  for (let c of centerPrefs) {
    if (options.includes(c)) return c;
  }
  return options[0];
}

// ---------------- MINIMAX ALGORITHM (5 Moves Ahead) ----------------
function getUltraHardMove(validCols) {
  let bestScore = -Infinity;
  // Always check the middle columns first to speed up the algorithm massively
  const centerPrefs = [3, 2, 4, 1, 5, 0, 6];
  let orderedValidCols = centerPrefs.filter((c) => validCols.includes(c));
  let bestCol = orderedValidCols[0];

  for (let c of orderedValidCols) {
    let r = getOpenRow(c);
    board[r][c] = "black"; // Drop phantom piece
    // Look 5 moves deep into the future
    let score = minimax(5, -Infinity, Infinity, false);
    board[r][c] = " "; // Remove phantom piece

    if (score > bestScore) {
      bestScore = score;
      bestCol = c;
    }
  }
  return bestCol;
}

function minimax(depth, alpha, beta, isMaximizing) {
  let isWinRed = checkBoardWin("red");
  let isWinBlack = checkBoardWin("black");

  // The AI prefers to win FAST (+depth) and lose SLOW (-depth)
  if (isWinBlack) return 1000000 + depth;
  if (isWinRed) return -1000000 - depth;

  // If we hit the 5 move limit or the board fills up, score the current setup
  if (depth === 0 || isBoardFull()) {
    return evaluateBoardScore("black") - evaluateBoardScore("red");
  }

  const centerPrefs = [3, 2, 4, 1, 5, 0, 6];
  let validCols = [];
  for (let c of centerPrefs) {
    if (board[0][c] === " ") validCols.push(c);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let c of validCols) {
      let r = getOpenRow(c);
      board[r][c] = "black";
      let ev = minimax(depth - 1, alpha, beta, false);
      board[r][c] = " ";
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break; // Alpha-Beta Pruning (Stops calculating useless branches)
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let c of validCols) {
      let r = getOpenRow(c);
      board[r][c] = "red";
      let ev = minimax(depth - 1, alpha, beta, true);
      board[r][c] = " ";
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// Helper: Checks if a single piece drop results in an immediate win
function simulateWin(col, player) {
  let r = getOpenRow(col);
  if (r < 0) return false;
  board[r][col] = player;
  let isWin = checkBoardWin(player);
  board[r][col] = " ";
  return isWin;
}

// Evaluates the full board to see if someone won
function checkBoardWin(player) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (
        board[r][c] === player &&
        board[r][c + 1] === player &&
        board[r][c + 2] === player &&
        board[r][c + 3] === player
      )
        return true;
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      if (
        board[r][c] === player &&
        board[r + 1][c] === player &&
        board[r + 2][c] === player &&
        board[r + 3][c] === player
      )
        return true;
    }
  }
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (
        board[r][c] === player &&
        board[r + 1][c + 1] === player &&
        board[r + 2][c + 2] === player &&
        board[r + 3][c + 3] === player
      )
        return true;
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (
        board[r][c] === player &&
        board[r - 1][c + 1] === player &&
        board[r - 2][c + 2] === player &&
        board[r - 3][c + 3] === player
      )
        return true;
    }
  }
  return false;
}

// AI Scoring heuristic for when it looks 5 moves deep
function evaluateBoardScore(player) {
  let score = 0;
  let opp = player === "black" ? "red" : "black";

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      let window = [
        board[r][c],
        board[r][c + 1],
        board[r][c + 2],
        board[r][c + 3],
      ];
      score += scoreWindow(window, player, opp);
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      let window = [
        board[r][c],
        board[r + 1][c],
        board[r + 2][c],
        board[r + 3][c],
      ];
      score += scoreWindow(window, player, opp);
    }
  }
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      let window = [
        board[r][c],
        board[r + 1][c + 1],
        board[r + 2][c + 2],
        board[r + 3][c + 3],
      ];
      score += scoreWindow(window, player, opp);
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      let window = [
        board[r][c],
        board[r - 1][c + 1],
        board[r - 2][c + 2],
        board[r - 3][c + 3],
      ];
      score += scoreWindow(window, player, opp);
    }
  }
  return score;
}

function scoreWindow(window, player, opp) {
  let score = 0;
  let pCount = 0;
  let oCount = 0;
  let emptyCount = 0;

  for (let i = 0; i < 4; i++) {
    if (window[i] === player) pCount++;
    else if (window[i] === opp) oCount++;
    else emptyCount++;
  }

  if (pCount === 4) score += 100;
  else if (pCount === 3 && emptyCount === 1) score += 5;
  else if (pCount === 2 && emptyCount === 2) score += 2;
  if (oCount === 3 && emptyCount === 1) score -= 4;

  return score;
}

// ---------------- WIN CHECKING ----------------
function checkWin() {
  if (checkBoardWin(currentPlayer)) {
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
}

// ---------------- LEADERBOARD ----------------
function getSavedScores() {
  try {
    let scores = localStorage.getItem("c4_topScores");
    if (scores) {
      let parsed = JSON.parse(scores);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Score data corrupted, resetting.");
  }
  return [];
}

function declareWinner(winner, winningCells) {
  const statusText = document.getElementById("status");
  let winMessage = winner.toUpperCase() + " WINS IN " + moveCount + " MOVES!";

  // THE EASTER EGG
  if (isSinglePlayer && winner === "black") {
    winMessage =
      "Com<span style='color: #00ffff; text-shadow: 0px 0px 8px #00ffff;'>PETER</span> WINS!";
  }

  // Using innerHTML here so the HTML span tags actually render as code
  statusText.innerHTML = winMessage;
  statusText.style.color = winner === "red" ? "#ff3333" : "#888888";
  gameOver = true;

  for (let i = 0; i < winningCells.length; i++) {
    let r = winningCells[i][0];
    let c = winningCells[i][1];
    let cell = document.getElementById(r.toString() + "-" + c.toString());
    let chip = cell.querySelector(".chip");
    if (chip) chip.classList.add("flash");
  }

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

  let difficultyTag = "";
  if (isSinglePlayer) {
    let diff = document.getElementById("ai-difficulty").value;
    difficultyTag =
      diff === "hard" ? " (H)" : diff === "medium" ? " (M)" : " (E)";
  } else {
    difficultyTag = " (2P)";
  }

  let newRecord = {
    name: nameInput.toUpperCase() + difficultyTag,
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
