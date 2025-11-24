const socket = io();
let room = null;
let state = null;

document.getElementById("join").onclick = () => {
  room = document.getElementById("room").value.trim();
  socket.emit("joinRoom", room);
};

window.setBoardSize = size => {
  socket.emit("setSize", { room, size });
};

function clickCell(r, c) {
  if (!state) return;
  const pos = r + "," + c;

  if (state.phase === "placingP1" || state.phase === "placingP2") {
    socket.emit("placeMine", { room, pos });
  } else if (state.phase === "playing") {
    socket.emit("digCell", { room, pos });
  }
}

document.getElementById("finish").onclick = () => {
  socket.emit("finishPlacing", room);
};

socket.on("stateUpdate", s => {
  state = s;
  drawBoard();
  updateUI();
});

function drawBoard() {
  const board = document.getElementById("board");
  board.innerHTML = "";
  board.style.gridTemplateColumns = `repeat(${state.size}, 60px)`;

  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      const div = document.createElement("div");
      div.classList.add("cell");

      const pos = r + "," + c;

      if (state.phase === "placingP1" && state.minesP1.includes(pos))
        div.textContent = "●";

      if (state.phase === "placingP2" && state.minesP2.includes(pos))
        div.textContent = "●";

      if (state.phase === "playing") {
        if (state.dug.includes(pos)) {
          div.classList.add("dug");

          if (state.minesP1.includes(pos) || state.minesP2.includes(pos))
            div.textContent = "💥";
        }
      }

      div.onclick = () => clickCell(r, c);
      board.appendChild(div);
    }
  }
}

function updateUI() {
  document.getElementById("info").textContent =
    "Fase: " + state.phase +
    " | Turno jugador " + state.turn +
    " | Vidas: P1=" + state.lives[1] +
    " P2=" + state.lives[2];
}

socket.on("gameOver", data => {
  alert("Jugador " + data.loser + " perdió.");
});
