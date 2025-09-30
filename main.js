const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
let User = null;
let Match = null;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const WIDTH = 3000;
const HEIGHT = 3000;
const INITIAL_RADIUS = 15;
const INITIAL_SPEED = 300;
const MIN = -5000;
const MAX = 5000;

let usersCollection = null;
let matchesCollection = null;
const PORT = process.argv[process.argv.length - 1];
let NO_PLAYERS = true;

let initCells = false;
let intervalId = null;
let posX = -3000;

const colorsDb = {
    down: [
        "#19c76a",
        "#181ce4",
        "#9b0a0a",
        "#d3540a",
        "#aca90c",
        "#a30c64"
    ],
    up: [
        "#23ff88",
        "#2d30da",
        "#cf1a1a",
        "#ec7129",
        "#e4e12f",
        "#d12b8c"
    ]
};



const state = {

    players: [],
    player_to_send: [],
    cells: [],
    viruses: [],
    bullets: [],

}

//const MongoClient = mongodb.MongoClient;

app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.static("./public"));


app.post("/api/login", async (req, res) => {

    const { username, password } = req.body;


    const user = await User.findOne({ "username": username, "password": password }).
                        select("username password personalRecord img").
                        exec();
    
    if (user.username === username && user.password === password)
        res.status(200).json({ response: "ok", personalRecord: user.personalRecord, img: user.img });
    else 
        console.log("[main] utente %s non trovato nel db", username);


});

app.post("/api/user", async (req, res) => {

    const { username, password } = req.body;

    const user = new User({ username: username, password: password, personalRecord: 0, img: "no" });
    const newUser = await user.save();
    if (newUser === user) {
        
        res.status(200).json({ response: "ok" });
        console.log("[main] utente salvato nel db.");
    }
    else 
        console.log("[main] problema con save");
    
});

app.put("/api/:usernameUrl/personalRecord", async (req, res) => {

    const { usernameUrl } = req.params;
    const { personalRecord } = req.body;



    let user = await User.findOneAndUpdate({ username: usernameUrl } ,{ personalRecord: personalRecord }).exec();
                            

    //user.personalRecord = personalRecord;

    //let newUser = await user.save();

    if (usernameUrl === user.username) {
        res.status(200).json({ success: "ok" });
        console.log("[main] aggiornamento riuscito.");
    } else 
        console.log("[main] aggiornamento di personalREcord non riuscito.");

    
 
});

app.post("/api/profilePic", async (req, res) => {
    const username = req.body.username;
    const base64 = req.body.img;

    let user = await User.findOneAndUpdate({ username: username } ,{ img: base64 }).exec();
    
    if (username === user.username) {
        res.status(200).json({ success: "ok" });
        console.log("[main] aggiornamento foto profilo riuscito.");
    } else 
        console.log("[main] aggiornamento di foto profilo non riuscito.");


});
app.get("/api/:usernameUrl/history", async (req, res) => {
    const { usernameUrl } = req.params;


    let responseArray = [];
    let matches = await Match.find({});
    
    if (matches.length === 0) {
        console.log("[main] no history found");
        res.status(404).json({ response: "no history found" });
        return;
    }

    for (let match of matches) {
        for (let player of match.players) {
            //console.log(player.username, usernameUrl);
            if (player.username === usernameUrl) {
                responseArray.push({
                    playerUsername: player.username,
                    playerScore: player.score,
                    date: match.date
                });
            }
        }
    }


    //console.log(responseArray);
    res.status(200).json(responseArray);

});

io.on("connection", (socket) => {

    if (NO_PLAYERS) {
        NO_PLAYERS = false;
        console.log("resetto tutto...");
        
        initGameState(intervalId);
        console.log(state.player_to_send);
    }
    
    //let thanos = state.players.find(player => player.username === "thanos123");
    //thanos.socket = socket;

    console.log("nuovo player connesso!");

    socket.emit("ask_player_username");
    socket.on("ask_player_username_ack", data => {

        if (state.players.find(plr => plr.username === data.username) === undefined) {
            let initialSettings = getInitialSettings();
            socket.emit("init_cells", initialSettings);
            state.players.push({
                username: data.username,
                pos: { x: initialSettings.x, y: initialSettings.y },
                radius: initialSettings.r,
                speed: initialSettings.s,
                camScale: 1.5,
                counter: 0,
                isDead: false,
                innerColor: initialSettings.up,
                outerColor: initialSettings.bottom
            });

            state.player_to_send.push({
                username: data.username,
                pos: { x: initialSettings.x, y: initialSettings.y },
                radius: initialSettings.r,
                innerColor: initialSettings.up,
                outerColor: initialSettings.bottom
            });
            socket.broadcast.emit("new_player", { newPlayer: state.player_to_send[state.player_to_send.length - 1]});
            socket.broadcast.emit("new_chat_from_server", { msg: data.username + " si è connesso!" });

        } else if ((player = state.players.find(plr => plr.username === data.username)) !== undefined) {

            if (player.isDead) {
                socket.emit("wait_until_new_game_starts");
            } else {

                let initialSettings = {
                    x: player.pos.x,
                    y: player.pos.y,
                    s: player.speed,
                    r: player.radius,
                    bottom: player.outerColor,
                    up: player.innerColor,
                    cells: state.cells,
                    viruses: state.viruses,
                    other: state.player_to_send,
                    bullets: state.bullets,
                }
                socket.emit("init_cells", initialSettings);

            }
        }
    });
    //socket.emit("init_cells", getInitialSettings());
    //socket.on("player_name", data => addPlayer(socket, data));
    
    socket.on("player_pos", (data) => {
        socket.broadcast.emit("player_pos_to_other_clients", { username: data.username, x: data.x, y: data.y });
        let plr = state.players.find(plr => plr.username === data.username);
        if (plr) {
            plr.pos.x = data.x;
            plr.pos.y = data.y;
        }
        plr = state.player_to_send.find(plr => plr.username === data.username);

        if (plr) {
            plr.pos.x = data.x;
            plr.pos.y = data.y;
        }
        //console.log("usern: " + plr.username +", x: " + plr.pos.x + " , y: " + plr.pos.y);
        //checkCellCollision(socket);
    });
    
    socket.on("new_chat_from_client", data => {
        socket.broadcast.emit("new_chat_from_server", { msg: data.msg });
        
    });

    socket.on("new_bullet_from_client", data => {
        state.bullets.push(data.bullet);
        socket.broadcast.emit("new_bullet_from_server", { bullet: data.bullet });
    });

    socket.on("increase_virus_radius", data => {
        state.viruses[data.virusIndex].r = data.r;
        console.log("virus[" + data.virusIndex + "] radius: " + state.viruses[data.virusIndex].r);
    });

    socket.on("player_dead", data => {
        console.log("[main] " + data.username + " è morto!");
        let player = state.players.find(plr => plr.username === data.username);
        if (player) player.isDead = true;

        socket.broadcast.emit("player_dead_from_server", { username: data.username });

        if (state.players.length >= 2) {
            console.log("controllo per vincitore");
            let counter = 0;
            let winnerUsername = null;
            state.players.forEach(plr => {
                if (!plr.isDead) {
                    counter++;
                    winnerUsername = plr.username;
                }
            });
            console.log(counter);
            if (counter === 1) {
                let d = new Date();
                io.emit("player_won", { winnerUsername: winnerUsername });
                console.log("Winner: " + winnerUsername);
                NO_PLAYERS = true;
                console.log("val di NO_PLAYERS = " + NO_PLAYERS);
                let doc = new Match({
                    winner: winnerUsername,
                    players: [],
                    date: d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear()
                });

                for (let plr of state.players) {
                    doc.players.push({
                        username: plr.username,
                        score: plr.radius
                    })
                }
                //controllare qua (e cambiare npm start nodemon --> node) 
                //state.players = [];

                insertMatch(doc);
            }
        } else {
            console.log("[main] unico player morto resetto tutto...");
            NO_PLAYERS = true;
        }
    });
    
    socket.on("radius_decrease", (data) => {
        console.log("[radius_decrease]: " + data.newRadius);
        socket.broadcast.emit("radius_decrease_from_server", { username: data.username, newRadius: data.newRadius });
        let player = state.players.find(player => player.username === data.username);
        if (player) player.radius = data.newRadius;
            

        player = state.player_to_send.find(player => player.username === data.username);
        if (player) player.radius = data.newRadius;
    });

    socket.on("cell_collision_from_client", data => { 
        console.log(data.username + " ha fatto una collisione con cella[" + data.index + "]");
        
        let newX = getRandomPosCoord();
        let newY = getRandomPosCoord();

        io.emit("new_pos_for_cell", { index: data.index, x: newX, y: newY });
        state.cells[data.index].x = newX;
        state.cells[data.index].y = newY;

        console.log("nuova x: " + state.cells[data.index].x +", nuova y: " + state.cells[data.index].y + ".");

        let plr = state.players.find(plr => data.username === plr.username);

        if (++plr.counter === 3) {
            plr.radius += 10;
            plr.counter = 0;
            plr.speed -= 5;
            socket.emit("zoom_out");
            io.emit("player_radius_increment", { username: plr.username, newSpeed: plr.speed, newRadius: plr.radius });
            console.log("radius increment for " + plr.username);
            console.log(state.players);
        }

        plr = state.player_to_send.find(plr => data.username === plr.username);
        if (plr) {
            plr.radius += 10;
        }
    });

    socket.on("delete_bullet", data => {
        socket.broadcast.emit("delete_bullet_from_server", { index: data.index });
        state.bullets.splice(data.index, 1);
        
    });

    socket.on("player_eats_player", data => {
        console.log(data);
        io.emit("player_radius_increment", { username: data.username, newRadius: data.radius });
        console.log(data.username + " ha mangiato un player,radius increment for " + data.radius);
        
    });

    socket.on("player_eats_bullet", data => {
        console.log(data);
        io.emit("player_radius_increment", { username: data.username, newRadius: data.radius });
        console.log("radius increment for " + data.username + data.newRadius);
    });
    socket.on("disconnect", () => {

    });

    
});

/*
MongoClient.connect(DB_CONN_STRING, {
    maxPoolSize: 50,
    wTimeoutMs: 5000,
    
}).catch(err => {
    console.error(err);
    process.exit(1);
}).then(async client => {
    try {
        usersCollection = await client.db("agar").collection("users");
        matchesCollection = client.db("agar").collection("matches");
    } catch (e) {
        console.error("errore connessione a users collection " + e);
    }

    httpServer.listen(PORT, () => {
    console.log("server avviato sulla porta " + PORT);
    });
});
*/
async function main() {
    await mongoose.connect("mongodb://localhost:27017/agar");

    console.log("[main] connesso al db.");

    const userSchema = new mongoose.Schema({
        username: String,
        password: String,
        personalRecord: Number,
        img: String
    });

    User = mongoose.model("User", userSchema);

    const matchSchema = new mongoose.Schema({
        winner: String,
        players: [{ username: String, score: Number }],
        date: String
    });

    Match = mongoose.model("Match", matchSchema);

    let check = await User.findOne({"username": "thanos123"}).exec();

    if (!check) {
        let thanos = new User({ username: "thanos123", password: "doom", personalRecord: 0 , img: "no"});
        let conan = new User({ username: "conanEdogawa", password: "sherlocked", personalRecord: 0 , img: "no"});

        let savedConan = await conan.save();
        let savedThanos = await thanos.save();
    }

    
    httpServer.listen(PORT, () => {
        console.log("[main] server avviato sulla porta " + PORT);
    });
}

main().catch(err => {
    console.log(err);
    process.exit(1);
});

function getInitialSettings() {
    let x = getRandomPosCoord();
    let y = getRandomPosCoord();
    let randomIndex = Math.floor(Math.random() * (colorsDb.down.length - 1));
    //console.log(colorsDb.down[randomIndex]);
    return {
        s: INITIAL_SPEED, 
        r: INITIAL_RADIUS,
        bottom: colorsDb.down[randomIndex], 
        up: colorsDb.up[randomIndex],
        x: x,
        y: y,
        cells: state.cells,
        viruses: state.viruses,
        other: state.player_to_send,
        bullets: state.bullets
    };

}

function initGameState(intervalId) {
    state.cells = [];
    state.players = [];
    state.player_to_send = [];
    state.viruses = [];
    state.bullets = [];

    for (let i = 0; i < 50; i++) {
        state.cells.push({
            x: getRandomPosCoord(),
            y: getRandomPosCoord(),
            r: INITIAL_RADIUS,
            color: getRandomColor()
        });
    }
    
    for (let i = 0; i < 10; i++) {
        state.viruses.push({
            x: getRandomPosCoord(),
            y: getRandomPosCoord(),
            r: 50,
        });
    }

}

function getRandomColor() {
    return colorsDb.up[Math.floor(Math.random() * (colorsDb.up.length - 1))]
}

function getRandomPosCoord() {
    return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
}

/*
function checkCellCollision(socket) {
    state.cells.forEach(cell => {
        state.players.forEach(player => {
            let dx = Math.floor(cell.x) - Math.floor(player.pos.x);
            let dy = Math.floor(cell.y) - Math.floor(player.pos.y);
            let distance = Math.sqrt(dx * dx + dy * dy);
            let sumOfRadiusWithOffset = (player.radius + INITIAL_RADIUS);

            if (distance < sumOfRadiusWithOffset) 
                socket.emit("cell_collision", { index: state.cells.indexOf(cell) });
        });
    });
}*/


async function findUserInDb(username, password) {
    
    try {

        let result = await usersCollection.findOne({ username: username, password: password });
        console.log(result);
        if (result.username === username && result.password === password)
            return {
                result: true,
                personalRecord: result.personalRecord
            };
        else {
            return false;
        }


    } catch (e) {
        console.log("problema con query " + e);
        return false;
    }
}

async function insertMatch(doc) {

    const result = await doc.save();

    if (result === doc) {
       
        console.log("[main] match inserito nel db: " + doc);
    }

}
