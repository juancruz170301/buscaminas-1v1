
from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, emit
import random

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

rooms = {}
MINES = {3:2,5:5,7:7,9:10}

def new_room(code):
    rooms[code] = {
        "players": [],
        "size": 3,
        "mines": {1:set(),2:set()},
        "dug": set(),
        "phase": "waiting",
        "lives": {1:3,2:3},
        "turn": 1,
        "timer": 10
    }

@app.route("/")
def index():
    return render_template("index.html")

@socketio.on("create_room")
def create_room():
    code = ''.join(random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(4))
    new_room(code)
    emit("room_created", code)

@socketio.on("join_room")
def join(data):
    code = data["room"]
    if code not in rooms:
        emit("error","room_not_found"); return
    r = rooms[code]
    if len(r["players"])>=2:
        emit("error","room_full"); return
    join_room(code)
    r["players"].append(request.sid)
    if len(r["players"])==2:
        r["phase"]="placing_p1"
    emit("state", r, to=code)

@socketio.on("set_size")
def set_size(data):
    code=data["room"]
    size=data["size"]
    if code in rooms:
        rooms[code]["size"]=size
        emit("state", rooms[code], to=code)

@socketio.on("place_mine")
def place_mine(data):
    code=data["room"]; pos=data["pos"]
    r=rooms.get(code); 
    if not r: return
    need=MINES[r["size"]]
    if r["phase"]=="placing_p1" and len(r["mines"][1])<need:
        r["mines"][1].add(pos)
    if r["phase"]=="placing_p2" and len(r["mines"][2])<need:
        r["mines"][2].add(pos)
    emit("state", r, to=code)

@socketio.on("finish_placing")
def finish(data):
    code=data["room"]
    r=rooms.get(code); 
    if not r: return
    need=MINES[r["size"]]
    if r["phase"]=="placing_p1" and len(r["mines"][1])==need:
        r["phase"]="placing_p2"
    elif r["phase"]=="placing_p2" and len(r["mines"][2])==need:
        r["phase"]="playing"
    emit("state", r, to=code)

@socketio.on("dig")
def dig(data):
    code=data["room"]; pos=data["pos"]
    r=rooms.get(code); 
    if not r: return
    if r["phase"]!="playing": return
    if pos in r["dug"]: return
    r["dug"].add(pos)
    if pos in r["mines"][1] or pos in r["mines"][2]:
        r["lives"][r["turn"]]-=1
        if r["lives"][r["turn"]]<=0:
            emit("game_over",{"loser":r["turn"]},to=code)
            del rooms[code]
            return
        # new round
        r["mines"]={1:set(),2:set()}
        r["dug"]=set()
        r["phase"]="placing_p1"
        r["turn"]=1
        emit("state", r, to=code)
        return
    r["turn"]=2 if r["turn"]==1 else 1
    emit("state", r, to=code)

if __name__=="__main__":
    socketio.run(app,host="0.0.0.0",port=5000)
