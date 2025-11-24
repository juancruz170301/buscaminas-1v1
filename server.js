
// Complete working server.js (Node + Socket.IO)
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

app.use(express.static("public"));

let rooms = {};

const MINES_PER_SIZE = {3:2,5:5,7:7,9:10};

function newRound(room){room.minesP1=new Set();room.minesP2=new Set();room.dug=new Set();room.phase="placing_p1";room.turn=1;room.timer=10;}

function safeState(room,code){return {room:code,size:room.size,phase:room.phase,minesP1:[...room.minesP1],minesP2:[...room.minesP2],dug:[...room.dug],turn:room.turn,lives:room.lives,timer:room.timer,link:room.link};}

function startTimer(code){
 const room=rooms[code]; if(!room) return;
 if(room.interval) clearInterval(room.interval);
 room.timer=10;
 room.interval=setInterval(()=>{
   const r=rooms[code]; if(!r)return;
   r.timer--;
   io.to(code).emit("state",safeState(r,code));
   if(r.timer<=0){
      r.lives[r.turn]--;
      if(r.lives[r.turn]<=0){io.to(code).emit("game_over",{loser:r.turn});clearInterval(r.interval);return;}
      newRound(r); io.to(code).emit("state",safeState(r,code)); return;
   }
 },1000);
}

io.on("connection",socket=>{
 socket.on("create_room",()=>{
   const code=Math.random().toString(36).substring(2,6).toUpperCase();
   rooms[code]={players:[],size:5,minesP1:new Set(),minesP2:new Set(),dug:new Set(),phase:"waiting",turn:1,lives:{1:3,2:3},timer:10,interval:null,link:`/?room=${code}`};
   socket.emit("room_created",code);
 });

 socket.on("join_room",data=>{
   const code=data.room;
   if(!rooms[code]){socket.emit("error","room_not_found");return;}
   const room=rooms[code];
   if(room.players.length>=2){socket.emit("error","room_full");return;}
   socket.join(code); room.players.push(socket.id);
   if(room.players.length===2){newRound(room);startTimer(code);}
   io.to(code).emit("state",safeState(room,code));
 });

 socket.on("set_size",data=>{
   const room=rooms[data.room]; if(!room)return;
   room.size=data.size;
   io.to(data.room).emit("state",safeState(room,data.room));
 });

 socket.on("place_mine",data=>{
   const room=rooms[data.room]; if(!room)return;
   const need=MINES_PER_SIZE[room.size];
   if(room.phase==="placing_p1" && room.minesP1.size<need) room.minesP1.add(data.pos);
   if(room.phase==="placing_p2" && room.minesP2.size<need) room.minesP2.add(data.pos);
   io.to(data.room).emit("state",safeState(room,data.room));
 });

 socket.on("finish_placing",data=>{
   const room=rooms[data.room]; if(!room)return;
   const need=MINES_PER_SIZE[room.size];
   if(room.phase==="placing_p1" && room.minesP1.size===need) room.phase="placing_p2";
   else if(room.phase==="placing_p2" && room.minesP2.size===need) room.phase="playing";
   io.to(data.room).emit("state",safeState(room,data.room));
 });

 socket.on("dig",data=>{
   const room=rooms[data.room]; if(!room)return;
   const pos=data.pos;
   if(room.phase!=="playing")return;
   if(room.dug.has(pos))return;
   room.dug.add(pos);
   if(room.minesP1.has(pos)||room.minesP2.has(pos)){
      room.lives[room.turn]--;
      if(room.lives[room.turn]<=0){
        io.to(data.room).emit("game_over",{loser:room.turn});
        clearInterval(room.interval); return;
      }
      newRound(room); io.to(data.room).emit("state",safeState(room,data.room)); return;
   }
   room.turn=room.turn===1?2:1;
   io.to(data.room).emit("state",safeState(room,data.room));
 });

 socket.on("disconnect",()=>{
   for(const code in rooms){
     const room=rooms[code];
     room.players=room.players.filter(id=>id!==socket.id);
     if(room.players.length===0){clearInterval(room.interval);delete rooms[code];}
   }
 });
});

const PORT=process.env.PORT||3000;
http.listen(PORT,()=>console.log("Servidor activo en "+PORT));
