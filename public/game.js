const socket = io();

let room = null;
let state = null;

function qs(id) {
    return document.getElementById(id);
}

window.onload = () => {
    const params = new URLSearchParams(window.location.search);

    if (params.has("room")) {
        room = params.get("room");
        socket.emit("join_room", { room });
    }
};

qs("create").onclick = () => {
    socket.emit("create_room");
};

socket.on("room_created", code => {
    room = code;
    window.location.href = "/?room=" + code;
});

qs("join").onclick = () => {
    const code = qs("room").value.trim();
    if (code) {
        room = code;
        socket.emit("join_room", { room: code });
    }
};

qs("size3").onclick = () => socket.emit("set_size", { room, size: 3 });
qs("size5").onclick = () => socket.emit("set_size", { room, size: 5 });
qs("size7").onclick = () => socket.emit("set_size", { room, size: 7 });
qs("size9").onclick = () => socket.emit("set_size", { room, size: 9 });

qs("finish").onclick = () => socket.emit("finish_placing", { room });

socket.on("state", data => {
    state = data;
    updateUI();
    drawBoard();
});

socket.on("game_over", data => {
    alert("Jugador " + data.loser + " perdió todas sus vidas.");
    window.location.href = "/";
});

function updateUI() {
    qs("phase").innerText = "Fase: " + state.phase;
    qs("turn").innerText = "Turno del jugador: " + state.turn;
    qs("lives").innerText = `Vidas → P1: ${state.lives[1]} | P2: ${state.lives[2]}`;
    qs("timer").innerText = "Tiempo restante: " + state.timer + "s";
}

function drawBoard() {
    const board = qs("board");
    board.innerHTML = "";
    board.style.gridTemplateColumns = `repeat(${state.size}, 60px)`;

    for (let r = 0; r < state.size; r++) {
        for (let c = 0; c < state.size; c++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");

            const pos = `${r},${c}`;

            if (state.phase === "placing_p1" && state.minesP1.includes(pos)) {
                cell.textContent = "●";
            }

            if (state.phase === "placing_p2" && state.minesP2.includes(pos)) {
                cell.textContent = "●";
            }

            if (state.phase === "playing") {
                if (state.dug.includes(pos)) {
                    cell.classList.add("dug");

                    if (state.minesP1.includes(pos) || state.minesP2.includes(pos)) {
                        cell.textContent = "💥";
                    }
                }
            }

            cell.onclick = () => {
                if (!state) return;

                if (state.phase === "placing_p1" || state.phase === "placing_p2") {
                    socket.emit("place_mine", { room, pos });
                }

                if (state.phase === "playing") {
                    socket.emit("dig", { room, pos });
                }
            };

            board.appendChild(cell);
        }
    }
}

function draw

