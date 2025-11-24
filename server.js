const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

app.use(express.static("public"));

let rooms = {};

io.on("connection", socket => {

  socket.on("joinRoom", room => {

    if (!rooms[room]) {
      rooms[room] = {
        players: [],
        size: 5,
        minesP1: new Set(),
        minesP2: new Set(),
        dug: new Set(),
        phase: "placingP1",
        turn: 1,
        lives: {1:3, 2:3},
        timer: 15
      };
    }

    socket.join(room);
    rooms[room].players.push(socket.id);

    io.to(room).emit("playersUpdate", rooms[room].players);
    io.to(room).emit("stateUpdate", formatState(rooms[room]));
  });

  socket.on("setSize", data => {
    rooms[data.room].size = data.size;
    io.to(data.room).emit("stateUpdate", formatState(rooms[data.room]));
  });

  socket.on("placeMine", data => {
    const room = rooms[data.room];

    if (room.phase === "placingP1")
      room.minesP1.add(data.pos);

    else if (room.phase === "placingP2")
      room.minesP2.add(data.pos);

    io.to(data.room).emit("stateUpdate", formatState(room));
  });

  socket.on("finishPlacing", roomName => {
    const room = rooms[roomName];

    if (room.phase === "placingP1") {
      room.phase = "placingP2";
    } else if (room.phase === "placingP2") {
      room.phase = "playing";
    }

    io.to(roomName).emit("stateUpdate", formatState(room));
  });

  socket.on("digCell", data => {
    const room = rooms[data.room];
    if (room.dug.has(data.pos)) return;

    room.dug.add(data.pos);

    if (room.minesP1.has(data.pos) || room.minesP2.has(data.pos)) {
      room.lives[room.turn]--;
      if (room.lives[room.turn] <= 0) {
        io.to(data.room).emit("gameOver", { loser: room.turn });
        return;
      }
    }

    room.turn = (room.turn === 1 ? 2 : 1);
    io.to(data.room).emit("stateUpdate", formatState(room));
  });

});

function formatState(room) {
  return {
    size: room.size,
    phase: room.phase,
    minesP1: Array.from(room.minesP1),
    minesP2: Array.from(room.minesP2),
    dug: Array.from(room.dug),
    turn: room.turn,
    lives: room.lives
  };
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Servidor activo en " + PORT));

