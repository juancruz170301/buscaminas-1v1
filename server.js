const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*" }
});

app.use(express.static("public"));

let rooms = {};

io.on("connection", socket => {

  socket.on("joinRoom", room => {
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = {
        players: [],
        gameState: null
      };
    }

    rooms[room].players.push(socket.id);

    io.to(room).emit("playersUpdate", rooms[room].players);
  });

  socket.on("placeMine", data => {
    io.to(data.room).emit("minePlaced", data);
  });

  socket.on("startGame", room => {
    io.to(room).emit("startGame");
  });

  socket.on("digCell", data => {
    io.to(data.room).emit("cellDug", data);
  });

  socket.on("disconnect", () => {
    for (let room in rooms) {
      rooms[room].players = rooms[room].players.filter(id => id !== socket.id);
      io.to(room).emit("playersUpdate", rooms[room].players);
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Servidor corriendo en", PORT));
