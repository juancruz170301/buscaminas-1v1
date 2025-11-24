const socket=io();
let room=null; let state=null;
function qs(x){return document.getElementById(x);}

qs("create").onclick=()=>socket.emit("create_room");
socket.on("room_created",code=>{
 room=code;
 qs("copy").style.display="inline-block";
 qs("copy").onclick=()=>navigator.clipboard.writeText(window.location.origin+"/?room="+code);
 window.history.pushState({}, "", "/?room="+code);
});

qs("join").onclick=()=>{
 let c=qs("room").value.trim(); 
 if(c){ room=c; socket.emit("join_room",{room:c}); }
};

["3","5","7","9"].forEach(n=>{
 qs("size"+n).onclick=()=>socket.emit("set_size",{room,size:Number(n)});
});

qs("finish").onclick=()=>socket.emit("finish_placing",{room});

socket.on("error",m=>alert(m));

socket.on("state",data=>{
 state=data; updateUI(); drawBoard();
});

socket.on("game_over",d=>{
 alert("Jugador "+d.loser+" perdió");
 location.href="/";
});

function updateUI(){
 qs("phase").innerText="Fase: "+state.phase;
 qs("turn").innerText="Turno: "+state.turn;
 qs("lives").innerText=`Vidas: P1=${state.lives[1]} | P2=${state.lives[2]}`;
 qs("timer").innerText="Tiempo: "+state.timer;
}

function drawBoard(){
 const b=qs("board");
 b.innerHTML="";
 b.style.gridTemplateColumns=`repeat(${state.size},60px)`;
 for(let r=0;r<state.size;r++){
  for(let c=0;c<state.size;c++){
    const pos=`${r},${c}`;
    const cell=document.createElement("div");
    cell.classList.add("cell");
    if(state.phase.startsWith("placing")){
        if(state.mines[1].includes?.(pos) || state.mines[2].includes?.(pos)){
            cell.textContent="●";
        }
    }
    if(state.phase==="playing" && state.dug.includes(pos)){
       cell.classList.add("dug");
    }
    cell.onclick=()=> socket.emit(state.phase.startsWith("placing")?"place_mine":"dig",{room,pos});
    b.appendChild(cell);
  }
 }
}
