
const socket = io();

let room=null;
let state=null;

function qs(id){ return document.getElementById(id); }

qs("create").onclick=()=> socket.emit("create_room");

socket.on("room_created",code=>{
    window.location.href="/?room="+code;
});

qs("join").onclick=()=>{
    const code=qs("room").value.trim();
    if(code){
        room=code;
        socket.emit("join_room",{room:code});
    }
};

["3","5","7","9"].forEach(n=>{
  qs("size"+n).onclick=()=> socket.emit("set_size",{room,size:Number(n)});
});

qs("finish").onclick=()=> socket.emit("finish_placing",{room});

socket.on("state",data=>{
    state=data;
    updateUI();
    drawBoard();
});

socket.on("game_over",data=>{
    alert("Jugador "+data.loser+" perdió");
    window.location.href="/";
});

function updateUI(){
    qs("phase").innerText="Fase: "+state.phase;
    qs("turn").innerText="Turno: "+state.turn;
    qs("lives").innerText=`Vidas: P1=${state.lives[1]} P2=${state.lives[2]}`;
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

            if(state.phase==="placing_p1" && state.mines1.includes(pos)) cell.textContent="●";
            if(state.phase==="placing_p2" && state.mines2.includes(pos)) cell.textContent="●";

            if(state.phase==="playing" && state.dug.includes(pos)){
                cell.classList.add("dug");
                if(state.mines1.includes(pos)||state.mines2.includes(pos)) cell.textContent="💥";
            }

            cell.onclick=()=>{
                if(state.phase==="placing_p1"||state.phase==="placing_p2"){
                    socket.emit("place_mine",{room,pos});
                } else {
                    socket.emit("dig",{room,pos});
                }
            };

            b.appendChild(cell);
        }
    }
}
