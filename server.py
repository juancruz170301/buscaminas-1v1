from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room
import random, time, threading

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

rooms={}
MINES={3:2,5:5,7:7,9:10}

def create_room(code):
    rooms[code]={"players":[],"size":3,"phase":"waiting",
                 "mines":{1:set(),2:set()},"dug":set(),
                 "turn":1,"lives":{1:3,2:3},
                 "timer":10,"timer_active":False}

@app.route("/")
def index():
    return render_template("index.html")

def start_timer(code):
    r=rooms.get(code); 
    if not r: return
    r["timer"]=10; r["timer_active"]=True
    def tick():
        while r["timer"]>0 and r["timer_active"]:
            time.sleep(1); r["timer"]-=1
            socketio.emit("state",r,room=code)
        if not r["timer_active"]: return
        if r["phase"] in ["placing_p1","placing_p2"]:
            cur=1 if r["phase"]=="placing_p1" else 2
            r["lives"][cur]-=1
            if r["lives"][cur]<=0:
                socketio.emit("game_over",{"loser":cur},room=code)
                rooms.pop(code,None); return
            r["mines"]={1:set(),2:set()}; r["dug"]=set()
            r["phase"]="placing_p1"; r["turn"]=cur; r["timer_active"]=False
            socketio.emit("state",r,room=code)
    threading.Thread(target=tick,daemon=True).start()

@socketio.on("create_room")
def on_create():
    code=''.join(random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(4))
    create_room(code); emit("room_created",code)

@socketio.on("join_room")
def on_join(d):
    code=d["room"]
    if code not in rooms: emit("error","room_not_found"); return
    r=rooms[code]
    if len(r["players"])>=2: emit("error","room_full"); return
    join_room(code); r["players"].append(request.sid)
    if len(r["players"])==2:
        r["phase"]="placing_p1"; start_timer(code)
    emit("state",r,room=code)

@socketio.on("set_size")
def set_size(d):
    code=d["room"]; size=d["size"]
    if code in rooms:
        rooms[code]["size"]=size
        socketio.emit("state",rooms[code],room=code)

@socketio.on("place_mine")
def place(d):
    code=d["room"]; pos=d["pos"]
    r=rooms.get(code); 
    if not r: return
    need=MINES[r["size"]]
    if r["phase"]=="placing_p1" and len(r["mines"][1])<need:
        r["mines"][1].add(pos)
    if r["phase"]=="placing_p2" and len(r["mines"][2])<need:
        r["mines"][2].add(pos)
    socketio.emit("state",r,room=code)

@socketio.on("finish_placing")
def finish(d):
    code=d["room"]; r=rooms.get(code)
    if not r: return
    need=MINES[r["size"]]
    if r["phase"]=="placing_p1" and len(r["mines"][1])==need:
        r["phase"]="placing_p2"; r["timer"]=10
    elif r["phase"]=="placing_p2" and len(r["mines"][2])==need:
        r["phase"]="playing"; r["timer_active"]=False
    socketio.emit("state",r,room=code)

@socketio.on("dig")
def dig(d):
    code=d["room"]; pos=d["pos"]
    r=rooms.get(code); 
    if not r or r["phase"]!="playing": return
    if pos in r["dug"]: return
    r["dug"].add(pos)
    if pos in r["mines"][1] or pos in r["mines"][2]:
        cur=r["turn"]; r["lives"][cur]-=1
        if r["lives"][cur]<=0:
            socketio.emit("game_over",{"loser":cur},room=code)
            rooms.pop(code,None); return
        r["mines"]={1:set(),2:set()}; r["dug"]=set()
        r["phase"]="placing_p1"; r["turn"]=cur; socketio.emit("state",r,room=code)
        start_timer(code); return
    r["turn"]=2 if r["turn"]==1 else 1
    socketio.emit("state",r,room=code)

if __name__=="__main__":
    socketio.run(app,host="0.0.0.0",port=5000)
