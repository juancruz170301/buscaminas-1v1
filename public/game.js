const socket = io();
let room = null;

document.getElementById("join").onclick = () => {
  room = document.getElementById("room").value.trim();
  if (!room) return alert("Escribe un código de sala.");

  socket.emit("joinRoom", room);
  document.getElementById("info").textContent = "Esperando al otro jugador...";
};

socket.on("playersUpdate", players => {
  if (players.length === 1) {
    document.getElementById("info").textContent = "Esperando al segundo jugador...";
  }
  if (players.length === 2) {
    document.getElementById("info").textContent = "Los dos jugadores conectados. Colocando minas...";
    createBoard(5); // tamaño 5x5 por ahora
  }
});

function createBoard(n) {
  const board = document.getElementById("board");
  board.style.gridTemplateColumns = `repeat(${n}, 60px)`;
  board.innerHTML = "";

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const div = document.createElement("div");
      div.classList.add("cell");
      div.dataset.r = r;
      div.dataset.c = c;

      div.onclick = () => {
        socket.emit("digCell", {room, r, c});
      };

      board.appendChild(div);
    }
  }
}

socket.on("cellDug", data => {
  const selector = `.cell[data-r="${data.r}"][data-c="${data.c}"]`;
  const cell = document.querySelector(selector);
  if (cell) cell.classList.add("dug");
});
