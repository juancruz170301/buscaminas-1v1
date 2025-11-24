const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*", methods: ["GET","POST"] }
});

app.use(express.static("public"));

let rooms = {};
const MINES = {3:2,5:5,7:7,9:10};

function initRoom(code){
  rooms[code] = {
    players: [],
    size: 3,
    phase: "waiting",
    mines: {1:new Set(),2:new Set()},
    dug: new Set(),
    turn: 1,
    lives: {1:3,2:3},
    timer: 10,
    interval: null
  };
}

function safe(r){
  return {
    size: r.size,
    phase: r.phase,
    mines1: [...r.mines[1]],
    mines2: [...r.mines[2]],
    dug: [...r.dug],
    turn: r.turn,
    lives: r.lives,
    timer: r.timer
  };
}

function newRound(code){
  const r = rooms[code];
  r.mines = {1:new Set(),2:new Set()};
  r.dug = new Set();
  r.phase = "placing_p1";
  r.turn = 1;
  r.timer = 10;
}

function startTimer(code){
  const r = rooms[code];
  if (r.interval) clearInterval(r.interval);
  r.timer = 10;
  r.interval = setInterval(()=>{
    r.timer--;
    io.to(code).emit("state", safe(r));
    if(r.timer <= 0){
      if(r.phase === "placing_p1" || r.phase === "placing_p2"){
        r.phase = (r.phase === "placing_p1") ? "placing_p2" : "playing";
      } else {
        r.lives[r.turn]--;
        if(r.lives[r.turn] <= 0){
          io.to(code).emit("game_over", {loser: r.turn});
          clearInterval(r.interval);
          return;
        }
        newRound(code);
      }
      io.to(code).emit("state", safe(r));
    }
  },1000);
}

io.on("connection", socket=>{
  socket.on("create_room", ()=>{
    const code = Math.random().toString(36).substring(2,6).toUpperCase();
    initRoom(code);
    socket.emit("room_created", code);
  });

  socket.on("join_room", ({room})=>{
    if(!rooms[room]) return socket.emit("error","room_not_found");
    const r = rooms[room];
    if(r.players.length >= 2) return socket.emit("error","room_full");
    socket.join(room);
    r.players.push(socket.id);
    if(r.players.length === 2){
      r.phase = "placing_p1";
      startTimer(room);
    }
    io.to(room).emit("state", safe(r));
  });

  socket.on("set_size", ({room,size})=>{
    if(!rooms[room]) return;
    rooms[room].size = size;
    io.to(room).emit("state", safe(rooms[room]));
  });

  socket.on("place_mine", ({room,pos})=>{
    const r = rooms[room];
    if(!r) return;
    const need = MINES[r.size];

    if(r.phase==="placing_p1" && r.mines[1].size < need) r.mines[1].add(pos);
    if(r.phase==="placing_p2" && r.mines[2].size < need) r.mines[2].add(pos);

    io.to(room).emit("state", safe(r));
  });

  socket.on("finish_placing", ({room})=>{
    const r = rooms[room];
    if(!r) return;
    const need = MINES[r.size];

    if(r.phase==="placing_p1" && r.mines[1].size===need){
      r.phase="placing_p2";
      r.timer=10;
      io.to(room).emit("state", safe(r));
      return;
    }
    if(r.phase==="placing_p2" && r.mines[2].size===need){
      r.phase="playing";
      r.timer=10;
      io.to(room).emit("state", safe(r));
      return;
    }
  });

  socket.on("dig", ({room,pos})=>{
    const r = rooms[room];
    if(!r || r.phase!=="playing") return;
    if(r.dug.has(pos)) return;

    r.dug.add(pos);

    if(r.mines[1].has(pos) || r.mines[2].has(pos)){
      r.lives[r.turn]--;
      if(r.lives[r.turn] <= 0){
        io.to(room).emit("game_over",{loser:r.turn});
        clearInterval(r.interval);
        return;
      }
      newRound(room);
      io.to(room).emit("state", safe(r));
      return;
    }

    r.turn = (r.turn===1?2:1);
    io.to(room).emit("state", safe(r));
  });

  socket.on("disconnect", ()=>{
    for(const code in rooms){
      const r = rooms[code];
      r.players = r.players.filter(id=>id!==socket.id);
      if(r.players.length===0){
        clearInterval(r.interval);
        delete rooms[code];
      }
    }
  });
});

http.listen(3000,()=>console.log("Servidor activo en 3000"));
