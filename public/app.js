

let k = null;
let onUpdateController = null;
let socket = null;
let myCell = null;
let canMove = false;
let isDead = false;
let mySpeed = null;
let lastIndex = null;
let lastVirusIndex = null;
let lastPlayerIndex = null;
let myUsername = null;
let myInnerColor = null;
let myOuterColor = null;
let myTimer = null;
let myPersonalRecord = null;
let zoomOutLimit = 0;
let joystick = null;
let base64 = "";
let camFlag = false;
let newZoomScale = 0;
// per il movimento
let joyX = 0;
let joyY = 0;
// per il proiettile con pad
let prevX = 0;
let prevY = 0;
//let padDistance = 0;

let GAME_WIDH = 5000;
let GAME_HEIGHT = 5000;

let otherPlayers = [];
let cells = [];
let viruses = [];
let bullets = [];

const LIME_GREEN = "#23ff88";
const BACKGROUND = "#2c2b2b";
const BACKGROUND_ALT = "#00809d";


JoystickController = JoystickController.default;

const escMenu = document.querySelector('div[class~="esc-menu-wrapper"]');
const dashBoard = document.querySelector("div.dashboard-view");
const dashBoardUsername = document.querySelector("div.dashboard-username");
const dashBoardPersonalRecord = document.querySelector("div.dashboard-personal-record");
const playButton = document.querySelector("span.play-button");
const gameWrapper = document.querySelector(".game-wrapper");
const registerWrapper = document.querySelector("div.register-wrapper");
const loginWrapper = document.querySelector(".login-wrapper");
const loginButton = document.querySelector('.login-button');
const loginRegButton = document.querySelector('div.login-buttons > div.register-button');
const registerButton = document.getElementById("reg-button");
const chatDisplay = document.querySelector('.chat-display');
//const chatDisplayMobile = document.querySelector('.chat-display-mobile');
const chatInput = document.querySelector("#chat-input");
const chatInputMobile = document.querySelector("#chat-input-mobile");
const gameHistory = document.querySelector("div.game-history");
const leftArrow = document.getElementById("left_arrow");
const rightArrow = document.getElementById("right_arrow");
const upArrow = document.getElementById("up_arrow");
const downArrow = document.getElementById("down_arrow");
const boom = document.getElementById("boom");
const boomMini = document.getElementById("boom-mini");
const currentPos = document.getElementById("current_pos");
const currentRadius = document.getElementById("current_radius");
const currentLeader = document.getElementById("current_leader");
const endDialogSpan = document.querySelector(".end-dialog-span");
const endDialog = document.querySelector(".end-dialog");
const endDialogButton = document.querySelector(".end-dialog-button");
const photoSubmit = document.querySelector("input#profile-photo-submit");
const changeProfilePicButton = document.querySelector("img#profile-photo-submit-img");
const radiusDisplayMobileDiv = document.querySelector(".radius-display-mobile");
const sideDrawerButton = document.querySelector(".side-drawer-hide-btn");
const sideDrawer = document.querySelector(".side-drawer");

changeProfilePicButton.addEventListener("click", () => {
    photoSubmit.click();
});

photoSubmit.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onloadend = async () => {
        base64 = reader.result;
        document.querySelector("img#profile_photo").src = base64;

        try {
            let result = await fetch("http://localhost:9000/api/profilePic", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body : JSON.stringify({ username: myUsername, img: base64 })
            });

            if (!result.ok) {
                throw new Error(`Response status: ${result.status}`);
            }

            const resp = await result.json();
            
        } catch(err) {
            console.log(err);
        }   
    };

    reader.readAsDataURL(file);
});


if (window.innerWidth <= 480) {

    k = kaplay({
        width: window.innerHeight,
        height: window.innerWidth,
        canvas: document.getElementById("canvas"),
        background: BACKGROUND_ALT,
        debugKey: "r",
        global: false
    
    });



} else {

    k = kaplay({
        width: window.innerWidth,
        height: window.innerHeight - document.querySelector(".header-wrapper").offsetHeight - 3,
        canvas: document.getElementById("canvas"),
        background: BACKGROUND_ALT,
        debugKey: "r",
        global: false
    
    });


}

k.loadSprite("img", "./img/up.png");

if (window.innerWidth <= 900) {
    document.querySelector(`div[class~="side-drawer"] #welcome-msg-mobile`).textContent = myUsername ? "Benvenuto " + myUsername : "Benvenuto Ospite!";
    boom.addEventListener("click", () => spara(prevX, prevY));
    boomMini.addEventListener("click", () => sparaMini(prevX, prevY));
    sideDrawerButton.addEventListener("click", () => {
        const drawer = document.querySelector(".side-drawer");
        if (!drawer.classList.contains("in")) {
            
            drawer.addEventListener("animationend", () => { 
                
                drawer.classList.remove("slide-in");
                drawer.style.left = "0px";
            });

            drawer.classList.add("slide-in");
            drawer.classList.add("in");
        } else {
            
            drawer.addEventListener("animationend", () => { 
                
                drawer.classList.remove("slide-out");
                drawer.style.left = "-150px"
            });

            drawer.classList.add("slide-out");
            drawer.classList.remove("in");
            
        }
    });

    chatInputMobile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && chatInputMobile.value.length > 0) {
            
            let divElement = document.createElement("div");
            divElement.textContent = "[" + myUsername + "]: " + chatInputMobile.value;
            chatInputMobile.value = "";
            divElement.classList.add("chat-record");
            chatDisplay.appendChild(divElement);
            chatDisplay.scrollTop = chatDisplay.scrollHeight;

            socket.emit("new_chat_from_client", { msg: divElement.textContent});
            

        }
    });

}

loginButton.addEventListener("click", handleLogin);
loginRegButton.addEventListener("click", changeToRegisterView);
registerButton.addEventListener("click", doRegisterFetch);
endDialogButton.addEventListener("click", endGame);




function paintCells(state) {
    for (let cell of state.cells) {
        k.add([
            k.pos(cell.x, cell.y),
            k.cricle(cell.r),
            k.color(cell.color),
            k.area({
                scale: 0.5,
                offset: vec2(cell.r / 2)
            }),
            "cell"
        ]);
    }
}




function addCells(settingsObj) {

    //socket.emit("player_name", { username: myUsername , outerColor: settingsObj.bottom, innerColor: settingsObj.up });
    mySpeed = settingsObj.s;
    
    k.setCamScale(1.5);
    newZoomScale = k.getCamScale().x;
    for(let bullet of settingsObj.bullets) {
        bullets.push(bullet);
    }

    for (let other of settingsObj.other) {
        if (other.username !== myUsername)
            otherPlayers.push(other);
    }

    for (let cell of settingsObj.cells) {
        let littleCell = k.add([
            k.pos(cell.x, cell.y),
            k.circle(cell.r),
            k.color(cell.color),
            
            "cell"
        ]);

        cells.push(littleCell);
    }
    /*
    for (let cell of settingsObj.cells) {
        cells.push(cell);
    }
    */
    for (let virus of settingsObj.viruses) {
        let virusObj = k.add([
            k.pos(virus.x, virus.y),
            k.circle(virus.r),
            k.color(k.WHITE),
            k.outline(4, k.RED),
            k.z(100),
            "virus"

        ]);

        viruses.push(virusObj);
    } 
    //console.log(settingsObj);

    myCell = k.add([
        
        k.circle(settingsObj.r, true, { anchor: "center" }),
        k.outline(4, k.Color.fromHex(settingsObj.bottom)),
        k.pos(settingsObj.x, settingsObj.y),
        k.color(settingsObj.up),


    ]);
    

    
    myCell.add([
        
        k.pos(k.vec2(0, 0)),
        k.text(myUsername, { size: myCell.radius * 2,
                             fonnt: "sans-serif",
                             
                           }
        ),
        k.anchor("center"),
        "meText"
        
    ]);

    


    

}

function updateCellPos(data) {
    cells[data.index].pos.x = data.x;
    cells[data.index].pos.y = data.y;
    cells[data.index].opacity = 1;

    console.log("nova x: " + cells[data.index].pos.x + ", nuova y: " + cells[data.index].pos.y + ".");
}

function checkVirusCollision() {
    let currentIndex = null;
    
    viruses.forEach(virus => {
        currentIndex = viruses.indexOf(virus);

        let dx = Math.floor(virus.pos.x) - Math.floor(myCell.pos.x);
        let dy = Math.floor(virus.pos.y) - Math.floor(myCell.pos.y);
        let distance = Math.sqrt(dx * dx + dy * dy);

        let sumOfRadius = virus.radius + myCell.radius;

        if (distance < sumOfRadius) {
            
            
            if (currentIndex !== lastVirusIndex) {
                console.log("collisione con virus");
                if (myCell.radius > virus.radius) {

                    console.log("morto");
                    socket.emit("player_dead", { username: myUsername });
                    endGameDialog(false);

                }
                
                
                lastVirusIndex = currentIndex;
                
            }

        } else {
            if (currentIndex === lastVirusIndex)
                lastVirusIndex = null;
        }

        
        
    });
}


function checkCellCollision() {
    let currentIndex = null;
    
    cells.forEach(cell => {
        currentIndex = cells.indexOf(cell);

        let dx = Math.floor(cell.pos.x) - Math.floor(myCell.pos.x);
        let dy = Math.floor(cell.pos.y) - Math.floor(myCell.pos.y);
        let distance = Math.sqrt(dx * dx + dy * dy);

        let sumOfRadius = cell.radius + myCell.radius;

        if (distance < sumOfRadius) {
            
            
            if (currentIndex !== lastIndex) {
                socket.emit("cell_collision_from_client", { username: myUsername, index: cells.indexOf(cell) });
                //k.addKaboom(cell.pos);
                cell.opacity = 0;
                lastIndex = currentIndex;
                
            }

        } else {
            if (currentIndex === lastIndex)
                lastIndex = null;
        }

        
        
    });
    
}



function handleRadiusIncrement(data) {
    //sono io 
    if (myUsername === data.username) {
        myCell.radius = data.newRadius;
        //mySpeed = data.newSpeed;
        myCell.textSize = data.newRadius;
        console.log("nuovo r: " + myCell.radius);
    } else {//altrimenti cercare nell'array otherPlayers
        let plr = otherPlayers.find(plr => plr.username === data.username);
        plr.radius = data.newRadius;
        console.log("radius increment for " + data.username + ": " + data.newRadius);
    }
    
}

function addNewPlayer(data) {
    otherPlayers.push(data.newPlayer);
}


playButton.addEventListener("click", (e) => {
    dashBoard.classList.add("view");
    gameWrapper.classList.remove("view");
   
    startGame();

    if (window.innerWidth <= 900) {
        radiusDisplayMobileDiv.classList.remove("view");
        sideDrawer.classList.remove("view");
        joystick = new JoystickController(
            {
                x: "90%",
                y: "23%",
                maxRange: 50

            }, 
            data => {
                if (!canMove)
                    canMove = true;
                joyX = data.leveledX;
                joyY = data.leveledY;
                if (data.x > 0) {
                    padX = data.x;
                    prevX = myCell.pos.x;
                    prevY = myCell.pos.y;
                }
                if (data.y > 0)
                    padY = data.y;
                padDistance = data.distance;
                //console.log(data)
            }
        );

        document.querySelector("#welcome-msg-mobile").textContent= "Benvenuto " + myUsername;
    }
    
});




async function fetchLogin(username, password) {
    try {
        const result = await fetch("http://localhost:9000/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });
        if (!result.ok) {
            throw new Error(`Response status: ${result.status}`);
        }

        const resp = await result.json();
        myPersonalRecord = resp.personalRecord;
        console.log(resp.img);
        if (resp.img !== "no") {
            document.querySelector("img#profile_photo").src = resp.img;
        }
        dashBoardPersonalRecord.textContent = "Personal record: " + resp.personalRecord;
        myUsername = username;
        await fetchMatchHistory();

        if (resp.response === "ok")
            return true;
        else 
            return false;

    } catch (err) {
        console.error(err.message);
    }
}


function handleLogin() {
    const username = document.querySelector("#username").value;
    const password = document.querySelector("#password").value;

    fetchLogin(username, password).then(response => {
        if (response) {
            loginWrapper.classList.add("view");
            dashBoardUsername.textContent = username;
            
            console.log("myUsername dopo il login -> " + myUsername);
            
            dashBoard.classList.remove("view");
        } else {
            console.log("problema fetch-login");
        }
    });

}


function startGame() {
    const WelcomeMsg = document.querySelector("#welcome-msg");
    WelcomeMsg.textContent = "Benvenuto! " + myUsername;

    //console.log(otherPlayers);
    //setInterval(() => myTimer += 1, 1000);
    socket = io("http://localhost:9000");
    socket.on("ask_player_username", sendMyUsername);
    socket.on("init_cells", addCells);
    socket.on("new_pos_for_cell", updateCellPos);
    socket.on("player_radius_increment", handleRadiusIncrement);
    socket.on("new_player", addNewPlayer);
    socket.on("new_chat_from_server", handleNewChat);
    socket.on("new_bullet_from_server", handleNewBullet);
    socket.on("player_dead_from_server", removeFromOtherPlayers);
    socket.on("player_pos_to_other_clients", handlePlayerPos);
    socket.on("delete_bullet_from_server", deleteBulletFromServer);
    socket.on("player_won", handleWinner);
    socket.on("zoom_out", zoomOut);
    socket.on("radius_decrease_from_server", handleRadiusDecrease);

    /*
    k.loop(1, () => {
        if (myCell) {
            prevX = myCell.pos.x;
            prevY = myCell.pos.y;
        }
    });*/

    k.onLoad(() => {
        //newZoomScale = k.getCamScale().x;
    });

    onUpdateController = k.onUpdate(() => {
        
        if (Math.floor(k.getCamScale().x) >= Math.floor(newZoomScale)) {
            //console.log("dentro...", k.getCamScale().x);
            //k.setCamScale(k.lerp(k.getCamScale().x, newZoomScale, 0.01));
            
            /*
            if (k.getCamScale().x !== newZoomScale)
                k.setCamScale(k.lerp(k.getCamScale().x, newZoomScale, 0.01));
            else
                camFlag = false;
            */
        }

        k.tween(
            k.getCamScale().x,
            newZoomScale,
            1,
            (v) => {
                k.setCamScale(v);
                
            },
            k.easings.linear
        );
        
        if (myCell) {
            //prevX = myCell.pos.x;
            //prevY = myCell.pos.y;
            let currentLeaderRadius = myCell.radius;
            let currentLeaderUsername = myUsername;
            currentPos.textContent = "Current (x, y) - (" + Math.floor(myCell.pos.x) + ", " + Math.floor(myCell.pos.y) + ")";
            if (window.innerWidth <= 900)
                document.querySelector(".side-drawer-xy")
                        .textContent = "Current (x, y) - (" + Math.floor(myCell.pos.x) + ", " + Math.floor(myCell.pos.y) + ")";
            
            currentRadius.textContent = "Current radius - " + myCell.radius;
            if (window.innerWidth <= 900 ) radiusDisplayMobileDiv.textContent = "r - " + myCell.radius;

            for (let plr of otherPlayers) {
                if (plr.radius > currentLeaderRadius) {
                    currentLeaderRadius = plr.radius;
                    currentLeaderUsername = plr.username;
                }
            }

            currentLeader.textContent = "Current Leader: " + currentLeaderUsername +" - r: " + currentLeaderRadius;
        }
        for (let bullet of bullets) {
            if (bullet.counter >= 0) {
                bullet.x += bullet.dx;
                bullet.y -= bullet.dy;

                bullet.counter -= 1;
            } else bullet.isMoving = false;
            

        }

        if (myCell) {
            k.setCamPos(myCell.pos);
            //console.log(myCell.pos.x);

            if (Math.floor(myCell.pos.x) > GAME_WIDH - myCell.radius)
                myCell.pos.x = GAME_WIDH - myCell.radius;
            if (Math.floor(myCell.pos.x) < (-GAME_WIDH) + myCell.radius)
                myCell.pos.x = (-GAME_WIDH) + myCell.radius;
            if (Math.floor(myCell.pos.y) > GAME_HEIGHT - myCell.radius)
                myCell.pos.y = GAME_HEIGHT - myCell.radius;
            if (Math.floor(myCell.pos.y) < (-GAME_HEIGHT) + myCell.radius)
                myCell.pos.y = (-GAME_HEIGHT) + myCell.radius;

            //checkCollisionWithPlayers();
            checkBulletCollision();
            checkBulletCollisionWithVirus();
            checkVirusCollision();
            checkCellCollision();
            //console.log("lastIndex " + lastIndex);
            if (window.innerWidth > 900) {
                if (canMove && !isDead) {
                    myCell.moveTo(k.toWorld(k.mousePos()), mySpeed);

                    socket.emit("player_pos", { 
                                                username: myUsername,
                                                x: Math.floor(myCell.pos.x), 
                                                y: Math.floor(myCell.pos.y)
                                            }
                    );
                    
                }
            } else {
                if (canMove && !isDead) {
                    myCell.moveTo(myCell.pos.x + joyX, myCell.pos.y - joyY, mySpeed);
                    socket.emit("player_pos", { 
                                                username: myUsername,
                                                x: Math.floor(myCell.pos.x), 
                                                y: Math.floor(myCell.pos.y)
                                            }
                    );
                }
            }
        }

    });

    k.onMouseMove(() => {
        if (!canMove)
            canMove = true;


    });



    k.onDraw(() => {
        checkCollisionWithPlayers();

        k.drawRect({
            width: 10000,
            height: 10000,
            pos: k.vec2(-5000),
            gradient: [k.RED, k.GREEN],
            fill: false,
            outline: { width: 20 , color: k.RED }
        });
        
        for (let bullet of bullets) {
            k.drawCircle({
                pos: k.vec2(bullet.x, bullet.y),
                radius: bullet.r,
                color: bullet.color,

            });
        }
        
        for (let other of otherPlayers) {
            if (other.username !== myUsername) {

                if (Math.floor(other.pos.x) > GAME_WIDH - other.radius)
                    other.pos.x = GAME_WIDH - other.radius;
                if (Math.floor(other.pos.x) < (-GAME_WIDH) + other.radius)
                    other.pos.x = (-GAME_WIDH) + other.radius;
                if (Math.floor(other.pos.y) > GAME_HEIGHT - other.radius)
                    other.pos.y = GAME_HEIGHT - other.radius;
                if (Math.floor(other.pos.y) < (-GAME_HEIGHT) + other.radius)
                    other.pos.y = (-GAME_HEIGHT) + other.radius;

                k.drawCircle({
                    pos: k.vec2(other.pos.x, other.pos.y),
                    radius: other.radius,
                    color: k.Color.fromHex(other.innerColor),
                    outline: { width: 4, color: k.Color.fromHex(other.outerColor) }
                });
                k.drawText({ 
                    text: other.username, 
                    size: other.radius * 2,
                    color: k.WHITE,
                    font: "sans-serif",
                    pos: k.vec2(other.pos.x, other.pos.y),
                    anchor: "center"
                });
            }
        }


 
    });

    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && chatInput.value.length > 0) {
            
            let divElement = document.createElement("div");
            divElement.textContent = "[" + myUsername + "]: " + chatInput.value;
            chatInput.value = "";
            divElement.classList.add("chat-record");
            chatDisplay.appendChild(divElement);
            chatDisplay.scrollTop = chatDisplay.scrollHeight;

            socket.emit("new_chat_from_client", { msg: divElement.textContent});
            

        }
    });




    //console.log(otherPlayers);
    document.addEventListener("keydown", (e) => {
    
        //console.log(e.key);
        if (e.code === "Escape") {
            //onUpdateController.paused = true;

            if (!escMenu.classList.contains("active")) {
                escMenu.classList.add("active");
            } else {
                escMenu.classList.remove("active");
            }
        }

        if (e.code === "KeyI") {
            k.setCamScale(k.getCamScale().x - 0.1);
            console.log(k.getCamScale());
            //myCell.radius = 150;
            //myCell.textSize = 150;
            //myCell.radius +=  5
            //myCell.get("child")[0].radius = myCell.radius - 4;
        }

        if (e.code === "KeyD") {
            //k.setCamScale(k.getCamScale() + 5);
            k.setCamScale(k.getCamScale().x  + 0.1);
            console.log(k.getCamScale());
            //myCell.radius -= 5;
            //myCell.get("child")[0].radius = myCell.radius - 4;
        }

        if (e.key === "z") {
            sparaMini();
        }

        if (e.key === " ") {
            spara();
            /*
            if (myCell.radius >= 75) {
                //(x, y) del vettore che punta dalla cell al mouse
                let vectorX = k.toWorld(k.mousePos()).x - myCell.pos.x;
                let vectorY = k.toWorld(k.mousePos()).y - myCell.pos.y;

                let l = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
                //normalizziamo per avere il vettore di lunghezza 1
                vectorX /= l;
                vectorY /= l;

                let newBullet = {
                    
                    
                    x: myCell.pos.x,
                    y: myCell.pos.y,
                    dx: vectorX * 8,
                    dy: vectorY * -8,
                    counter: 213,
                    r: myCell.radius * 0.5,
                    color: myCell.color,
                    owner: myUsername,
                    isMoving: true,
                };

                bullets.push(newBullet);
                myCell.radius *= 0.5;
                console.log("[radius_decrease]: " + myCell.radius);
                socket.emit("radius_decrease", { username: myUsername, newRadius: myCell.radius });
                socket.emit("new_bullet_from_client", { bullet: newBullet });

            }*/
  
        }

        if (e.key === "Control")
            myCell.radius = 750;
        if (e.key === "m")
            myCell.radius = 76;
    });
}

function handleNewChat(data) {
    const divElement = document.createElement("div");
    divElement.classList.add("chat-record");
    divElement.textContent = data.msg;
    chatDisplay.appendChild(divElement);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;

}

function handleNewBullet(data) {
    bullets.push(data.bullet);
}

function checkBulletCollisionWithVirus() {
    for (let virus of viruses) {
        for (let bullet of bullets) {
            let dx = Math.floor(bullet.x) - Math.floor(virus.pos.x);
            let dy = Math.floor(bullet.y) - Math.floor(virus.pos.y);
            let distance = Math.sqrt(dx * dx + dy * dy);

            let sumOfRadius = bullet.r + virus.radius;

            if (distance < sumOfRadius) {
                virus.radius += bullet.r * 0.2;
                bullets.splice(bullets.indexOf(bullet), 1);
                socket.emit("increase_virus_radius", { virusIndex: viruses.indexOf(virus), r: virus.radius });
            }
        }
    }
}

function removeFromOtherPlayers(data) {

    let player = otherPlayers.find(plr => plr.username === data.username);
    otherPlayers.splice(otherPlayers.indexOf(player), 1);
}

function sendMyUsername() {
    socket.emit("ask_player_username_ack", { username: myUsername });
}

function handlePlayerPos(data) {
    let plr = otherPlayers.find(plr => plr.username === data.username);
    if (plr) {
        plr.pos.x = data.x;
        plr.pos.y = data.y;
    }
}

function checkBulletCollision() {

    for (let bullet of bullets) {
        
        let dx = Math.floor(bullet.x) - Math.floor(myCell.pos.x);
        let dy = Math.floor(bullet.y) - Math.floor(myCell.pos.y);
        let distance = Math.sqrt(dx * dx + dy * dy);

        let sumOfRadius = bullet.r + myCell.radius;

        if (distance < sumOfRadius) {
            //console.log(bullet);
            if (myCell.radius < bullet.r && bullet.owner !== myUsername) {
                socket.emit("increase_bullet_radius", {index: bullets.indexOf(bullet), radius: bullet.r + myCell.radius });
                socket.emit("player_dead", { username: myUsername });
                console.log("morto");

                endGameDialog(false);

                
            } else if (myCell.radius > bullet.r && bullet.owner !== myUsername) {
                console.log("primo if")
                socket.emit("delete_bullet", {index: bullets.indexOf(bullet) });
                socket.emit("player_eats_bullet", { username: myUsername, radius: myCell.radius + (bullet.r / 2) });
                bullets.splice(bullets.indexOf(bullet), 1);
                
            } else if (bullet.owner === myUsername && bullet.isMoving === false) {
                
                socket.emit("delete_bullet", {index: bullets.indexOf(bullet) });
                let newRadius = myCell.radius + bullet.r;
                
                socket.emit("player_eats_bullet", { username: myUsername, radius: newRadius });
                bullets.splice(bullets.indexOf(bullet), 1);
            }
            
        }
        
    }
}


function deleteBulletFromServer(data) {
    bullets.splice(data.index, 1);
}


function handleWinner(data) {
    console.log("handleWinner");
    if (myUsername === data.winnerUsername) {

        endGameDialog(true);
        console.log("Ho vinto - r: " + myCell.radius);
        
    }
}


function checkCollisionWithPlayers() {
    let currentIndex = null;
    for (let other of otherPlayers) {
        currentIndex = other.username;
        //console.log(other);
        let dx = Math.floor(other.pos.x) - Math.floor(myCell.pos.x);
        let dy = Math.floor(other.pos.y) - Math.floor(myCell.pos.y);
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        let sumOfRadius = other.radius + myCell.radius;

        if (distance < sumOfRadius) {
            if (lastPlayerIndex !== currentIndex) {
                console.log("collisione con " + other.username);
                if (myCell.radius > other.radius) {
                    //otherPlayers.splice(otherPlayers.indexOf(other), 1);
                    console.log("il mio r è più grande");
                    socket.emit("player_eats_player", { username: myUsername, radius: myCell.radius + other.radius });
                } else {

                    console.log("il mio r è più piccolo");
                    socket.emit("player_dead", { username: myUsername });
                    
                    endGameDialog(false);
                    /*
                    k.flash(k.RED, 0.5).onEnd(() => {
                        gameWrapper.classList.add("view");
                        dashBoard.classList.remove("view");

                        k.quit();
                        socket.disconnect();
                        joystick.destroy();
                        checkPersonalRecord();
                    });
                    k.shake();
                    isDead = true;
                    myCell.opacity = 0;
                    */
                    
                }
                lastPlayerIndex = currentIndex;
            }
            /*
            if (myCell.radius > other.radius) {
                socket.emit("player_eats_player", { username: myUsername, radius: myCell.radius + other.radius });
            } else if (myCell.radius < other.radius) {
                socket.emit("player_eats_player", { username: other.username, radius: myCell.radius + other.radius });
                socket.emit("player_dead", { username: myUsername });
                console.log("morto");

                k.flash(k.RED, 0.5).onEnd(() => {
                    gameWrapper.classList.add("view");
                    dashBoard.classList.remove("view");
                    k.quit();
                });

                isDead = true;
                myCell.opacity = 0;
                socket.disconnect();
                

            } */
        } else {
            if (currentIndex === lastPlayerIndex)
                lastPlayerIndex = null;
        }
    }
}

function changeToRegisterView() {
    loginWrapper.classList.add("view");
    registerWrapper.classList.remove("view");
    
}

async function doRegisterFetch() {
    const username = document.querySelector("#username-reg").value;
    const password = document.querySelector("#password-reg").value;
    try {
        let result = await fetch("http://localhost:9000/api/user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body : JSON.stringify({ username: username, password: password })
        });

        if (!result.ok) {
            throw new Error(`Response status: ${result.status}`);
        }

        const resp = await result.json();
        console.log(resp);
        if (resp.response === "ok") {
                loginWrapper.classList.remove("view");
                registerWrapper.classList.add("view");
        }


    } catch (err) {
        console.error(err.message);
    }
}


async function fetchMatchHistory() {
    try {
        let url = `http://localhost:9000/api/${myUsername}/history`;
        console.log(url);
        let fetchResult = await fetch(url);
        let result = await fetchResult.json();
        
        if (result.length > 0)
            for (let i = result.length - 1; i >= 0; i--) {

                if (i % 2 === 0)
                    addRecordInMatchHistory(
                        result[i].playerUsername, 
                        result[i].playerScore, 
                        result[i].date,
                        true
                    );
                else 
                    addRecordInMatchHistory(
                        result[i].playerUsername, 
                        result[i].playerScore, 
                        result[i].date,
                        false
                    );

            }
        else 
            addNullRecordInMatchHistory();
            

    } catch (err) {
        console.log(err.message);
    }
}

function addRecordInMatchHistory(username, score, date, background) {
    
    let record = document.createElement("div");

    if (background) record.classList.add("yes");
    record.classList.add("game-record");

    record.textContent = "username: [" + username + "] - score: [" + score + "] - data: [" + date + "]";

    gameHistory.appendChild(record);

}

function addNullRecordInMatchHistory() {

    let record = document.createElement("div");

    record.classList.add("yes");
    record.classList.add("game-record");

    record.textContent = "nessuna cronologia trovata";

    gameHistory.appendChild(record);

}

function moveLeft() {
    if (myCell && !isDead) {
        myCell.onUpdate(() => { 
            myCell.moveTo(k.vec2(-6000, myCell.pos.y), mySpeed);

            socket.emit("player_pos", { 
            username: myUsername,
            x: Math.floor(myCell.pos.x), 
            y: Math.floor(myCell.pos.y)
            });
        });



    }
}

function moveRight() {
    if (myCell && !isDead) {
        myCell.onUpdate(() => myCell.moveTo(k.vec2(6000, myCell.pos.y), mySpeed));
        socket.emit("player_pos", { 
            username: myUsername,
            x: Math.floor(myCell.pos.x), 
            y: Math.floor(myCell.pos.y)
        }
        );
    }
}

function moveUp() {
    if (myCell && !isDead) {
        myCell.onUpdate(() => { 
            myCell.moveTo(k.vec2(myCell.pos.x, -6000), mySpeed);
            socket.emit("player_pos", { 
                username: myUsername,
                x: Math.floor(myCell.pos.x), 
                y: Math.floor(myCell.pos.y)
            });

        });

    }
}


function moveDown() {
    if (myCell && !isDead) {
        myCell.onUpdate(() => { 
            myCell.moveTo(k.vec2(myCell.pos.x, 6000), mySpeed);
            socket.emit("player_pos", {
            username: myUsername,
            x: Math.floor(myCell.pos.x), 
            y: Math.floor(myCell.pos.y)
            });
        });

    }
}

function spara(prevX, prevY) {
    
        if (myCell.radius >= 75) {
            let vectorX = null;
            let vectorY = null;
            let l = null;

            if (!prevX && !prevY) {
                //(x, y) del vettore che punta dalla cell al mouse
                vectorX = k.toWorld(k.mousePos()).x - myCell.pos.x;
                vectorY = k.toWorld(k.mousePos()).y - myCell.pos.y;

                l = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
                //normalizziamo per avere il vettore di lunghezza 1
                vectorX /= l;
                vectorY /= l;
            } else {
                vectorX = myCell.pos.x - prevX;
                vectorY = myCell.pos.y - prevY;
                console.log(vectorX, vectorY)
                l = Math.sqrt(vectorX * vectorX + vectorY * vectorY);

                vectorX /= l;
                vectorY /= l;
            }
            console.log("l: " + l);
            console.log("vecX: " + vectorX + " padX: " + prevX);
            console.log("vecY: " + vectorY + " padY: " + prevY);
            let newBullet = {
                
                
                x: myCell.pos.x,
                y: myCell.pos.y,
                dx: vectorX * 8,
                dy: vectorY * -8,
                counter: 213,
                r: myCell.radius * 0.5,
                color: myCell.color,
                owner: myUsername,
                isMoving: true,
            };

            bullets.push(newBullet);
            myCell.radius *= 0.5;
            console.log("[radius_decrease]: " + myCell.radius);
            socket.emit("radius_decrease", { username: myUsername, newRadius: myCell.radius });
            socket.emit("new_bullet_from_client", { bullet: newBullet });

        } else {
            const msg = document.createElement("div");
            msg.classList.add("chat-record");

            msg.textContent = "spara() richiede un r di almeno 75!!!";
            chatDisplay.appendChild(msg);
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
        }
    
}

async function checkPersonalRecord() {
    if (myCell.radius > myPersonalRecord) {

        let url = `http://localhost:9000/api/${myUsername}/personalRecord`;

        let fetchResult = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ personalRecord: myCell.radius })
        });

        let result = await fetchResult.json();

        if (result.success === "ok")
            console.log("personalRecord aggiornato");
        else 
            console.log("agg. personalRecord non riuscito");
    }
}

function zoomOut() {
    if (zoomOutLimit < 13) {
        //console.log("zooming out..." + k.getCamScale().x);
        //k.setCamScale(k.lerp(k.getCamScale().x, (k.getCamScale().x - 0.1), 0.1));
        //console.log(k.lerp(k.getCamScale().x, (k.getCamScale().x - 0.1), 0.1));
        //camFlag = true;
        newZoomScale = k.getCamScale().x - 0.1;
        zoomOutLimit++;
    }
}

function handleRadiusDecrease(data) {
    console.log("radius decr: " + data.newRadius);

    for (let other of otherPlayers) {
        if (other.username === data.username)
            other.radius = data.newRadius;
    }
    
}

function endGame() {
                        
    gameWrapper.classList.add("view");
    dashBoard.classList.remove("view");

    
    socket.disconnect();
    checkPersonalRecord();
    if (joystick)
        joystick.destroy();
                    
    endDialog.classList.add("view");
    if (!radiusDisplayMobileDiv.classList.contains("view"))
        radiusDisplayMobileDiv.classList.add("view");
    if (!sideDrawer.classList.contains("view"))
        sideDrawer.classList.add("view");
    isDead = false;
    canMove = false;
    mySpeed = null;
    zoomOutLimit = 0;
    lastIndex = null;
    lastVirusIndex = null;
    lastPlayerIndex = null;

    otherPlayers = [];
    cells = [];
    viruses = [];
    bullets = [];
    
    k.destroy(myCell);
    myCell = null;
    k.destroyAll("cell");
    k.destroyAll("virus");

}

function endGameDialog(winOrLose) {

    endDialog.classList.remove("view");
    isDead = true;
    myCell.opacity = 0;

    if (winOrLose) {
        endDialogSpan.textContent = "hai vinto!";
    } else {
        endDialogSpan.textContent = "hai perso!";
    }
}


function sparaMini() {
    if (myCell.radius >= 150) {
        let vectorX = null;
        let vectorY = null;
        let l = null;

        if (!prevX && !prevY) {
            //(x, y) del vettore che punta dalla cell al mouse
            vectorX = k.toWorld(k.mousePos()).x - myCell.pos.x;
            vectorY = k.toWorld(k.mousePos()).y - myCell.pos.y;

            l = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
            //normalizziamo per avere il vettore di lunghezza 1
            vectorX /= l;
            vectorY /= l;
        } else {
            vectorX = myCell.pos.x - prevX;
            vectorY = myCell.pos.y - prevY;
            console.log(vectorX, vectorY)
            l = Math.sqrt(vectorX * vectorX + vectorY * vectorY);

            vectorX /= l;
            vectorY /= l;
        }
        console.log("l: " + l);
        console.log("vecX: " + vectorX + " padX: " + prevX);
        console.log("vecY: " + vectorY + " padY: " + prevY);
        let newBullet = {
            
            
            x: myCell.pos.x,
            y: myCell.pos.y,
            dx: vectorX * 8,
            dy: vectorY * -8,
            counter: 213,
            r: myCell.radius * 0.1,
            color: myCell.color,
            owner: myUsername,
            isMoving: true,
        };

        bullets.push(newBullet);
        myCell.radius = myCell.radius - (myCell.radius * 0.1);
        console.log("[radius_decrease]: " + myCell.radius);
        socket.emit("radius_decrease", { username: myUsername, newRadius: myCell.radius });
        socket.emit("new_bullet_from_client", { bullet: newBullet });

    } else {
        const msg = document.createElement("div");
        msg.classList.add("chat-record");

        msg.textContent = "sparaMini() richiede un r di almeno 150!!!";
        chatDisplay.appendChild(msg);
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }
}