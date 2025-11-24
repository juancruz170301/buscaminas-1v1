const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*" }
});

app.use(express.static("public"));

let rooms = {}; 
// rooms = {
//    "ABC": { players: [], board: [...], state: "placingP1" }
// }

io.on("connection", socket => {

  // Crear o unirse a una sala
  socket.on("joinRoom", room => {

    // Si la sala no existe → crear sala nueva
    if (!rooms[room]) {
      rooms[room] = {
        players: [],
        created: Date.now()
      };

      console.log("Sala creada:", room);
      socket.emit("roomStatus", { created: true });
    } else {
      console.log("Unido a sala existente:", room);
      socket.emit("roomStatus", { created: false });
    }

    // Agregar jugador a la sala
    socket.join(room);
    rooms[room].players.push(socket.id);

    // Avisar a la sala cuántos jugadores hay
    io.to(room).emit("playersUpdate", rooms[room].players);
  });


  // Cuando un jugador cava una celda
  socket.on("digCell", data => {
    io.to(data.room).emit("cellDug", data);
  });


  // Cuando un jugador coloca una mina
  socket.on("placeMine", data => {
    io.to(data.room).emit("minePlaced", data);
  });


  // Desconexión
  socket.on("disconnect", () => {
    for (let room in rooms) {
      rooms[room].players = rooms[room].players.filter(id => id !== socket.id);
      io.to(room).emit("playersUpdate", rooms[room].players);
    }
  });

});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Servidor corriendo en", PORT));

