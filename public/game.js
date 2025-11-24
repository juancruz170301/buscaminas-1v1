const socket = io();
let room = null;
let state = null;

function qs(id) { return document.getElementById(id); }

window.onload = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.has("room")) {
    room = params.get("room");
    socket.emit("joinRoom", room);
  }
};

qs("auto").onclick = () => {
  socket.emit("autoRoom");
};

socket.on("roomCreated", data => {
  room = data.code;
  window.location.href = data.link;
});

qs("join").onclick = () => {
  room = qs("room").value.trim();
  if (room) socket.emit("joinRoom", room);
};

qs("size3").onclick = () => socket.emit("setSize", { room, size: 3 });
qs("size4").onclick = () => socket.emit("setSize", { room, size: 4 });
qs("size5").onclick = () => socket.emit("setSize", { room, size: 5 });
qs("size7").onclick = () => socket.emit("setSize", { room, size: 7 });

qs("finish").onclick = () => socket.emit("finishPlacing", room);

socket.on("playersUpdate", count => {
  qs("players").textContent = "Jugadores en sala: " + count;
});

socket.on("stateUpdate", s => {
  state = s;
  renderUI();
  renderBoard();
});

socket.on("gameOver", data => {
  alert("Jugador " + data.loser + " perdió la partida.");
  location.reload();
});

function renderUI() {
  qs("phase").textContent = "Fase: " + state.phase;
  qs("turn").textContent = "Turno jugador: " + state.turn;
  qs("lives").textContent = `Vidas → P1: ${state.lives[1]} | P2: ${state.lives[2]}`;
  qs("timer").textContent = "Tiempo: " + state.timer;
}

function renderBoard() {
  const b = qs("board");
  b.innerHTML = "";
  b.style.gridTemplateColumns = `repeat(${state.size}, 60px)`;

  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      const pos = `${r},${c}`;

      if (state.phase === "placingP1" && state.minesP1.includes(pos))
        cell.textContent = "●";

      if (state.phase === "placingP2" && state.minesP2.includes(pos))
        cell.textContent = "●";

      if (state.phase === "playing") {
        if (state.dug.includes(pos)) {
          cell.classList.add("dug");
          if (state.minesP1.includes(pos) || state.minesP2.includes(pos))
            cell.textContent = "💥";
        }
      }

      cell.onclick = () => {
        if (state.phase === "placingP1" || state.phase === "placingP2") {
          socket.emit("placeMine", { room, pos });
        } else if (state.phase === "playing") {
          socket.emit("digCell", { room, pos });
        }
      };

      b.appendChild(cell);
    }
  }
}

