const socket = io();
let room = null;

// Al hacer clic en "Unirse / Crear sala"
document.getElementById("join").onclick = () => {
  room = document.getElementById("room").value.trim();

  if (!room) {
    alert("Escribe un código de sala.");
    return;
  }

  socket.emit("joinRoom", room);
  document.getElementById("info").textContent = "Creando / Uniéndose a la sala...";
};


// Confirmación del servidor
socket.on("roomStatus", data => {
  if (data.created) {
    document.getElementById("info").textContent = `Sala ${room} creada. Esperando jugadores...`;
  } else {
    document.getElementById("info").textContent = `Unido a la sala ${room}. Esperando jugadores...`;
  }
});


// Cuando hay cambios de jugadores
socket.on("playersUpdate", players => {
  if (players.length === 1) {
    document.getElementById("info").textContent = `Sala ${room} creada. Sos el primer jugador.`;
  }

  if (players.length === 2) {
    document.getElementById("info").textContent = `Ya está el segundo jugador. ¡Comienza el juego!`;
    createBoard(5);
  }
});


// Crear tablero
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
        socket.emit("digCell", { room, r, c });
      };

      board.appendChild(div);
    }
  }
}

socket.on("cellDug", data => {
  const cell = document.querySelector(`.cell[data-r="${data.r}"][data-c="${data.c}"]`);
  if (cell) cell.classList.add("dug");
});

