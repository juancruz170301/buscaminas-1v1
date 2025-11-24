const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

app.use(express.static("public"));

let rooms = {};

const MINES_PER_SIZE = {
  3: 2,
  4: 3,
  5: 5,
  7: 7
};

function newRound(room) {
  room.minesP1 = new Set();
  room.minesP2 = new Set();
  room.dug = new Set();
  room.phase = "placingP1";
  room.turn = 1;
  room.timer = 10;
}

function safeState(room, roomName) {
  return {
    room: roomName,
    size: room.size,
    phase: room.phase,
    minesP1: Array.from(room.minesP1),
    minesP2: Array.from(room.minesP2),
    dug: Array.from(room.dug),
    turn: room.turn,
    lives: room.lives,
    timer: room.timer,
    link: room.link
  };
}

function startTimer(roomName) {
  const room = rooms[roomName];
  if (!room) return;

  if (room.interval) clearInterval(room.interval);

  room.timer = 10;

  room.interval = setInterval(() => {
    const r = rooms[roomName];
    if (!r) return;

    r.timer--;
    io.to(roomName).emit("stateUpdate", safeState(r, roomName));

    if (r.timer <= 0) {
      r.lives[r.turn]--;

      if (r.lives[r.turn] <= 0) {
        io.to(roomName).emit("gameOver", { loser: r.turn });
        clearInterval(r.interval);
        return;
      }

      newRound(r);
      io.to(roomName).emit("stateUpdate", safeState(r, roomName));
    }
  }, 1000);
}

io.on("connection", socket => {

  socket.on("autoRoom", () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const link = `/?room=${code}`;
    socket.emit("roomCreated", { code, link });
  });

  socket.on("joinRoom", roomName => {
    if (!roomName) return;

    if (!rooms[roomName]) {
      rooms[roomName] = {
        players: [],
        size: 5,
        minesP1: new Set(),
        minesP2: new Set(),
        dug: new Set(),
        phase: "placingP1",
        turn: 1,
        lives: {1:3, 2:3},
        timer: 10,
        interval: null,
        link: `/?room=${roomName}`
      };
    }

    const room = rooms[roomName];

    if (room.players.length >= 2) {
      socket.emit("roomFull");
      return;
    }

    socket.join(roomName);
    room.players.push(socket.id);

    io.to(roomName).emit("playersUpdate", room.players.length);
    io.to(roomName).emit("stateUpdate", safeState(room, roomName));

    if (room.players.length === 2) {
      startTimer(roomName);
    }
  });

  socket.on("setSize", data => {
    const room = rooms[data.room];
    if (!room) return;

    room.size = data.size;
    io.to(data.room).emit("stateUpdate", safeState(room, data.room));
  });

  socket.on("placeMine", data => {
    const room = rooms[data.room];
    if (!room) return;

    const pos = data.pos;

    if (room.phase === "placingP1" && room.minesP1.size < MINES_PER_SIZE[room.size]) {
      room.minesP1.add(pos);
    }
    else if (room.phase === "placingP2" && room.minesP2.size < MINES_PER_SIZE[room.size]) {
      room.minesP2.add(pos);
    }

    io.to(data.room).emit("stateUpdate", safeState(room, data.room));
  });

  socket.on("finishPlacing", roomName => {
    const room = rooms[roomName];
    if (!room) return;

    if (room.phase === "placingP1" && room.minesP1.size === MINES_PER_SIZE[room.size]) {
      room.phase = "placingP2";
    }
    else if (room.phase === "placingP2" && room.minesP2.size === MINES_PER_SIZE[room.size]) {
      room.phase = "playing";
    }

    io.to(roomName).emit("stateUpdate", safeState(room, roomName));
  });

  socket.on("digCell", data => {
    const room = rooms[data.room];
    if (!room) return;
    if (room.phase !== "playing") return;

    const pos = data.pos;

    if (room.dug.has(pos)) return;

    room.dug.add(pos);

    if (room.minesP1.has(pos) || room.minesP2.has(pos)) {
      room.lives[room.turn]--;

      if (room.lives[room.turn] <= 0) {
        io.to(data.room).emit("gameOver", { loser: room.turn });
        clearInterval(room.interval);
        return;
      }

      newRound(room);
      io.to(data.room).emit("stateUpdate", safeState(room, data.room));
      return;
    }

    room.turn = room.turn === 1 ? 2 : 1;
    io.to(data.room).emit("stateUpdate", safeState(room, data.room));
  });

  socket.on("disconnect", () => {
    for (let roomName in rooms) {
      const room = rooms[roomName];
      room.players = room.players.filter(id => id !== socket.id);

      if (room.players.length === 0) {
        clearInterval(room.interval);
        delete rooms[roomName];
      }
    }
  });

});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Servidor activo en " + PORT));
