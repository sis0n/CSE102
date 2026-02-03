const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const TILE_SRC_SIZE = 16;
const TILE_DISPLAY_SIZE = 32;
const COLS = 29;
const ROWS = 19;

canvas.width = COLS * TILE_DISPLAY_SIZE;
canvas.height = ROWS * TILE_DISPLAY_SIZE;

// --- ASSETS ---
const tileset = new Image();
const playerImg = new Image();
const trapImg = new Image();
const heartImg = new Image();
const enemy1Img = new Image();
const enemy2Img = new Image();
const bossImg = new Image();

// --- GLOBAL VARIABLES ---
const bgLayer = [];
const wallLayer = [];
const traps = [];
const enemies = [];
const projectiles = [];
const enemyProjectiles = [];
const particles = [];
const floatingTexts = []; // NEW: For damage numbers
const items = [];         // NEW: For health drops

let solutionPathSet = new Set();
let solutionPathArr = [];
let currentLevel = 1;
let forestWave = 0;
let gameWon = false;
let gameState = "START";
let playerName = "";
let score = 0;
let difficultyMultiplier = 1;
let gameTime = 0;
let shakeIntensity = 0;

// --- PLAYER ---
const player = {
    x: TILE_DISPLAY_SIZE * 1.1,
    y: TILE_DISPLAY_SIZE * 1.1,
    width: 30,
    height: 30,
    srcW: 32,
    srcH: 32,
    frameX: 0,
    frameCount: 4,
    frameTimer: 0,
    frameSpeed: 8,
    speed: 5.5,          // Base speed
    dashSpeed: 12,       // NEW: Speed when dashing
    isMoving: false,
    lives: 3,
    isInvincible: false,
    invTimer: 0,
    lastDir: { x: 1, y: 0 },
    facingRight: true,
    shootTimer: 0,
    // NEW: Dash Properties
    isDashing: false,
    dashTimer: 0,
    dashCooldown: 0
};

const keys = {};

// --- INPUT HANDLING ---
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (gameState === "PLAYING") gameState = "SETTINGS";
        else if (gameState === "SETTINGS" || gameState === "SETTINGS_CONTROLS") gameState = "PLAYING";
        return;
    }

    if (gameState === "INPUT_NAME") {
        if (e.key === "Enter") {
            if (playerName.length > 0) gameState = "DIFFICULTY_SELECT";
        } else if (e.key === "Backspace") {
            playerName = playerName.slice(0, -1);
        } else if (e.key.length === 1) {
            playerName += e.key;
        }
        return;
    }
    if (gameState !== "PLAYING") return;

    // NEW: Dash Logic (Shift Key)
    if (e.key === "Shift" && player.dashCooldown <= 0 && !player.isDashing) {
        player.isDashing = true;
        player.dashTimer = 10; // Dash lasts 10 frames
        player.dashCooldown = 60; // 1 second cooldown
        createParticles(player.x + player.width / 2, player.y + player.height / 2, "cyan", 8);
    }

    keys[e.key.toLowerCase()] = true;
    player.isMoving = true;
});

window.addEventListener("keyup", (e) => {
    if (gameState !== "PLAYING") return;
    keys[e.key.toLowerCase()] = false;
    if (!Object.values(keys).some((v) => v)) {
        player.isMoving = false;
        player.frameX = 0;
    }
});

canvas.addEventListener("mousedown", (e) => {
    // ... (Existing Mouse Logic kept exactly the same) ...
    if (gameState === "START") {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const btnX = canvas.width / 2 - 50;
        const btnY = canvas.height / 2 + 50;
        const btnW = 100;
        const btnH = 50;
        if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH) {
            gameState = "INPUT_NAME";
        }
    }
    if (gameState === "DIFFICULTY_SELECT") {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const btnW = 200;
        const btnH = 50;
        const btnX = canvas.width / 2 - btnW / 2;

        if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= 200 && mouseY <= 200 + btnH) {
            difficultyMultiplier = 0.6;
            gameState = "PLAYING";
            gameTime = 0;
        }
        else if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= 300 && mouseY <= 300 + btnH) {
            difficultyMultiplier = 1;
            gameState = "PLAYING";
            gameTime = 0;
        }
        else if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= 400 && mouseY <= 400 + btnH) {
            difficultyMultiplier = 2;
            gameState = "PLAYING";
            gameTime = 0;
        }
    }
    if (gameState === "LEADERBOARD") {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const btnX = canvas.width / 2 - 60;
        const btnY = canvas.height - 80;
        const btnW = 120;
        const btnH = 40;
        if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH) {
            location.reload(); 
        }
    }
    if (gameState === "GAME_OVER") {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const btnX = canvas.width / 2 - 75;
        const btnY = canvas.height / 2 + 60;
        const btnW = 150;
        const btnH = 50;
        if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH) {
            gameState = "LEADERBOARD";
        }
    }
    if (gameState === "SETTINGS") {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        if (mouseX >= cx - 100 && mouseX <= cx + 100 && mouseY >= cy - 60 && mouseY <= cy - 20) {
            gameState = "SETTINGS_CONTROLS";
        }
        else if (mouseX >= cx - 100 && mouseX <= cx + 100 && mouseY >= cy && mouseY <= cy + 40) {
            resetGame();
        }
        else if (mouseX >= cx - 100 && mouseX <= cx + 100 && mouseY >= cy + 60 && mouseY <= cy + 100) {
            location.reload();
        }
    }
    if (gameState === "SETTINGS_CONTROLS") {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        if (mouseX >= cx - 100 && mouseX <= cx + 100 && mouseY >= cy + 100 && mouseY <= cy + 140) gameState = "SETTINGS";
    }
});

// --- HELPER FUNCTIONS ---

// NEW: Function to show floating damage numbers
function showDamage(x, y, text, color = "white") {
    floatingTexts.push({
        x: x,
        y: y,
        text: text,
        life: 1.0,
        color: color,
        vy: -2
    });
}

function generateMaze() {
    solutionPathSet.clear();
    solutionPathArr = [];
    traps.length = 0;
    enemies.length = 0;
    projectiles.length = 0;
    items.length = 0;           // Clear items
    floatingTexts.length = 0;   // Clear text
    forestWave = 1;

    for (let r = 0; r < ROWS; r++) {
        bgLayer[r] = [];
        wallLayer[r] = [];
        for (let c = 0; c < COLS; c++) {
            bgLayer[r][c] = 0;
            wallLayer[r][c] = 3;
        }
    }

    const stack = [];
    let current = { r: 1, c: 1 };
    wallLayer[current.r][current.c] = -1;

    while (true) {
        let neighbors = [];
        let r = current.r,
            c = current.c;
        if (r > 2 && wallLayer[r - 2][c] === 3)
            neighbors.push({ r: r - 2, c: c, pr: r - 1, pc: c });
        if (r < ROWS - 3 && wallLayer[r + 2][c] === 3)
            neighbors.push({ r: r + 2, c: c, pr: r + 1, pc: c });
        if (c > 2 && wallLayer[r][c - 2] === 3)
            neighbors.push({ r: r, c: c - 2, pr: r, pc: c - 1 });
        if (c < COLS - 3 && wallLayer[r][c + 2] === 3)
            neighbors.push({ r: r, c: c + 2, pr: r, pc: c + 1 });

        if (neighbors.length > 0) {
            let next = neighbors[Math.floor(Math.random() * neighbors.length)];
            wallLayer[next.pr][next.pc] = -1;
            wallLayer[next.r][next.c] = -1;
            stack.push(current);
            current = next;
        } else if (stack.length > 0) {
            current = stack.pop();
        } else {
            break;
        }
    }

    let startNode = { r: 1, c: 1, path: [{ r: 1, c: 1 }] };
    let queue = [startNode];
    let visited = new Set(["1,1"]);
    while (queue.length > 0) {
        let { r, c, path } = queue.shift();
        if (r === ROWS - 2 && c === COLS - 2) {
            solutionPathArr = path;
            break;
        }
        let dirs = [
            { dr: 0, dc: 1 },
            { dr: 0, dc: -1 },
            { dr: 1, dc: 0 },
            { dr: -1, dc: 0 },
        ];
        for (let d of dirs) {
            let nr = r + d.dr,
                nc = c + d.dc;
            if (
                nr >= 0 &&
                nr < ROWS &&
                nc >= 0 &&
                nc < COLS &&
                wallLayer[nr][nc] === -1 &&
                !visited.has(`${nr},${nc}`)
            ) {
                visited.add(`${nr},${nc}`);
                queue.push({ r: nr, c: nc, path: [...path, { r: nr, c: nc }] });
            }
        }
    }
    solutionPathArr.forEach((p) => solutionPathSet.add(`${p.r},${p.c}`));
    wallLayer[ROWS - 2][COLS - 2] = 10;
}

function generateForest() {
    solutionPathSet.clear();
    solutionPathArr = [];
    traps.length = 0;
    enemies.length = 0;
    projectiles.length = 0;
    enemyProjectiles.length = 0;
    particles.length = 0;
    items.length = 0;           // Clear items
    floatingTexts.length = 0;   // Clear text
    gameWon = false;

    for (let r = 0; r < ROWS; r++) {
        bgLayer[r] = [];
        wallLayer[r] = [];
        for (let c = 0; c < COLS; c++) {
            bgLayer[r][c] = 0;
            if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
                wallLayer[r][c] = 5; 
            } else {
                wallLayer[r][c] = -1;
            }
        }
    }
    player.x = TILE_DISPLAY_SIZE * 2;
    player.y = TILE_DISPLAY_SIZE * 2;

    let wave1Count = 10;
    let wave1SpeedMult = difficultyMultiplier;
    if (difficultyMultiplier > 1) {
        wave1Count = 20;
        wave1SpeedMult = 1;
    }

    for (let i = 0; i < wave1Count; i++) {
        let ex, ey;
        do {
            ex = Math.floor(Math.random() * (COLS - 2) + 1) * TILE_DISPLAY_SIZE;
            ey = Math.floor(Math.random() * (ROWS - 2) + 1) * TILE_DISPLAY_SIZE;
        } while (Math.abs(ex - player.x) < 150 && Math.abs(ey - player.y) < 150);

        enemies.push({
            x: ex,
            y: ey,
            width: 50,
            height: 50,
            speed: (1 + Math.random() * 1.5) * wave1SpeedMult,
            hp: 1,
            maxHp: 1,
            emoji: "👹",
            img: enemy1Img,
            points: difficultyMultiplier < 1 ? 2.5 : difficultyMultiplier > 1 ? 10 : 5,
            srcW: 66,
            srcH: 60,
            frameX: 2,
            frameY: 0,
            frameCount: 2,
            frameTimer: 0,
            frameSpeed: 15,
        });
    }
}

function loadLevel(level) {
    if (level === 1) {
        generateMaze();
        player.x = TILE_DISPLAY_SIZE * 1.1;
        player.y = TILE_DISPLAY_SIZE * 1.1;
    } else if (level === 2) {
        generateForest();
    }
}

function canMoveTo(nx, ny) {
    let p = 6;
    let corners = [
        { x: nx + p, y: ny + p },
        { x: nx + player.width - p, y: ny + p },
        { x: nx + p, y: ny + player.height - p },
        { x: nx + player.width - p, y: ny + player.height - p },
    ];
    for (let cp of corners) {
        let c = Math.floor(cp.x / TILE_DISPLAY_SIZE);
        let r = Math.floor(cp.y / TILE_DISPLAY_SIZE);
        if (
            !wallLayer[r] ||
            wallLayer[r][c] === undefined ||
            (wallLayer[r][c] !== -1 && wallLayer[r][c] !== 10)
        )
            return false;
    }
    return true;
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 1.0,
            color: color
        });
    }
}

function saveScore() {
    const highScores = JSON.parse(localStorage.getItem("leaderboard")) || [];
    highScores.push({ name: playerName, score: score });
    highScores.sort((a, b) => b.score - a.score);
    localStorage.setItem("leaderboard", JSON.stringify(highScores.slice(0, 5)));
}

function resetGame() {
    score = 0;
    gameTime = 0;
    currentLevel = 1;
    forestWave = 0;
    gameWon = false;
    player.lives = 3;
    player.isInvincible = false;
    player.invTimer = 0;
    player.dashCooldown = 0; // Reset Dash
    loadLevel(1);
    gameState = "PLAYING";
}

// --- UPDATE LOOP ---
function update() {
    if (gameState !== "PLAYING") return;
    gameTime++;
    if (shakeIntensity > 0) shakeIntensity -= 1;

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // NEW: Update Floating Text
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.life -= 0.03;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    // NEW: Update Items (Collection)
    for (let i = items.length - 1; i >= 0; i--) {
        let item = items[i];
        // Collision with player
        if (player.x < item.x + item.width &&
            player.x + player.width > item.x &&
            player.y < item.y + item.height &&
            player.y + player.height > item.y) {
            
            if (item.type === "health") {
                if (player.lives < 3) {
                    player.lives++;
                    showDamage(player.x, player.y - 20, "+1 HP", "#0f0");
                    items.splice(i, 1);
                } else {
                    // Score bonus if full health
                    score += 5;
                    showDamage(player.x, player.y - 20, "+5 PTS", "yellow");
                    items.splice(i, 1);
                }
            }
        }
    }

    if (player.lives <= 0) return;
    let nx = player.x,
        ny = player.y;

    // Movement & Direction
    let dx = 0, dy = 0;
    if (keys["w"] || keys["arrowup"]) dy = -1;
    if (keys["s"] || keys["arrowdown"]) dy = 1;
    if (keys["a"] || keys["arrowleft"]) dx = -1;
    if (keys["d"] || keys["arrowright"]) dx = 1;

    if (dx !== 0 || dy !== 0) {
        player.lastDir = { x: dx, y: dy };
        if (dx === -1) player.facingRight = false;
        if (dx === 1) player.facingRight = true;
    }

    // NEW: Dash Logic Implementation
    let currentSpeed = player.speed;
    if (player.isDashing) {
        currentSpeed = player.dashSpeed; // Boost speed
        player.dashTimer--;
        // Create dash trail particles
        if (player.dashTimer % 3 === 0) {
             createParticles(player.x + player.width/2, player.y + player.height/2, "cyan", 1);
        }
        if (player.dashTimer <= 0) player.isDashing = false;
    }
    if (player.dashCooldown > 0) player.dashCooldown--;

    // Apply speed
    if (dy === -1) ny -= currentSpeed;
    if (dy === 1) ny += currentSpeed;
    if (dx === -1) nx -= currentSpeed;
    if (dx === 1) nx += currentSpeed;

    if (canMoveTo(nx, player.y)) player.x = nx;
    if (canMoveTo(player.x, ny)) player.y = ny;

    let pCol = Math.floor((player.x + player.width / 2) / TILE_DISPLAY_SIZE);
    let pRow = Math.floor((player.y + player.height / 2) / TILE_DISPLAY_SIZE);

    traps.forEach((trap) => {
        if (trap.r === pRow && trap.c === pCol) {
            trap.revealed = true;
            if (!player.isInvincible && !player.isDashing) { // Invincible during dash? Optional.
                player.lives--;
                shakeIntensity = 10;
                player.isInvincible = true;
                player.invTimer = 60;
                showDamage(player.x, player.y, "-1 HP", "red");
                if (player.lives <= 0)
                    setTimeout(() => {
                        saveScore(); gameState = "GAME_OVER";
                    }, 100);
            }
        }
    });

    // Shooting Logic
    if (player.shootTimer > 0) player.shootTimer--;
    if (keys[" "] && player.shootTimer <= 0) {
        player.shootTimer = 20; 
        projectiles.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            vx: player.lastDir.x * 7,
            vy: player.lastDir.y * 7,
        });
    }

    // Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;

        let pCol = Math.floor(p.x / TILE_DISPLAY_SIZE);
        let pRow = Math.floor(p.y / TILE_DISPLAY_SIZE);
        if (
            p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height ||
            (wallLayer[pRow] && wallLayer[pRow][pCol] !== -1 && wallLayer[pRow][pCol] !== 10)
        ) {
            projectiles.splice(i, 1);
            continue;
        }

        // Check Enemy Collision
        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            if (p.x > e.x && p.x < e.x + e.width && p.y > e.y && p.y < e.y + e.height) {
                e.hp--;
                createParticles(e.x + e.width / 2, e.y + e.height / 2, "red", 3);
                showDamage(e.x + e.width / 2, e.y, "1", "white"); // Show Damage

                if (e.hp <= 0) {
                    createParticles(e.x + e.width / 2, e.y + e.height / 2, "orange", 10);
                    score += e.points;
                    
                    // NEW: Chance to drop heart
                    if (Math.random() < 0.20) {
                        items.push({
                            x: e.x + 10,
                            y: e.y + 10,
                            width: 20,
                            height: 20,
                            type: "health"
                        });
                    }

                    if (e.isBoss) {
                        gameWon = true;
                        setTimeout(() => {
                            saveScore();
                            gameState = "LEADERBOARD";
                        }, 3000);
                    }
                    enemies.splice(j, 1);
                }
                projectiles.splice(i, 1); 
                break;
            }
        }
    }

    // Enemy Logic (Level 2)
    if (currentLevel === 2) {
        if (enemies.length === 0 && forestWave === 1) {
            forestWave = 2;
            let wave2Count = 5;
            let wave2SpeedMult = difficultyMultiplier;
            if (difficultyMultiplier > 1) {
                wave2Count = 10;
                wave2SpeedMult = 1;
            }

            for (let i = 0; i < wave2Count; i++) {
                let ex, ey;
                do {
                    ex = Math.floor(Math.random() * (COLS - 2) + 1) * TILE_DISPLAY_SIZE;
                    ey = Math.floor(Math.random() * (ROWS - 2) + 1) * TILE_DISPLAY_SIZE;
                } while (Math.abs(ex - player.x) < 150 && Math.abs(ey - player.y) < 150);

                enemies.push({
                    x: ex,
                    y: ey,
                    width: 50,
                    height: 50,
                    speed: (1 + Math.random() * 1.5) * wave2SpeedMult,
                    hp: 2,
                    maxHp: 2,
                    img: enemy2Img,
                    points: difficultyMultiplier < 1 ? 5 : difficultyMultiplier > 1 ? 20 : 10,
                    srcW: 80,
                    srcH: 80,
                    frameX: 2,
                    frameY: 1,
                    frameCount: 2,
                    frameTimer: 0,
                    frameSpeed: 12,
                });
            }
        } else if (enemies.length === 0 && forestWave === 2) {
            forestWave = 3;
            enemies.push({
                x: (COLS * TILE_DISPLAY_SIZE) / 2 - 50,
                y: (ROWS * TILE_DISPLAY_SIZE) / 2 - 50,
                width: 100,
                height: 100,
                hp: 20,
                maxHp: 20,
                emoji: "🐉",
                img: bossImg,
                srcW: 65,
                srcH: 80,
                frameX: 1.5,
                frameY: 1.9,
                frameCount: 2,
                frameTimer: 0,
                frameSpeed: 20,
                isBoss: true,
                points: difficultyMultiplier < 1 ? 15 : difficultyMultiplier > 1 ? 60 : 30,
                shootTimer: 0,
            });
        }

        enemies.forEach((enemy) => {
            if (enemy.isBoss) {
                enemy.shootTimer--;
                let px = player.x + player.width / 2;
                let ex = enemy.x + enemy.width / 2;
                enemy.facingRight = px > ex;

                if (enemy.shootTimer <= 0) {
                    enemy.shootTimer = Math.floor(60 / difficultyMultiplier);
                    let ex = enemy.x + enemy.width / 2;
                    let ey = enemy.y + enemy.height / 2;
                    let px = player.x + player.width / 2;
                    let py = player.y + player.height / 2;
                    let angle = Math.atan2(py - ey, px - ex);
                    let speed = 4 * difficultyMultiplier;
                    enemyProjectiles.push({
                        x: ex,
                        y: ey,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                    });
                }
            } else {
                if (enemy.x < player.x) {
                    enemy.x += enemy.speed;
                    enemy.facingRight = true;
                }
                if (enemy.x > player.x) {
                    enemy.x -= enemy.speed;
                    enemy.facingRight = false;
                }
                if (enemy.y < player.y) enemy.y += enemy.speed;
                if (enemy.y > player.y) enemy.y -= enemy.speed;
            }

            if (enemy.img) {
                enemy.frameTimer++;
                if (enemy.frameTimer >= enemy.frameSpeed) {
                    if (enemy.baseFrameX === undefined) enemy.baseFrameX = enemy.frameX;
                    let currentOffset = enemy.frameX - enemy.baseFrameX;
                    let nextOffset = (currentOffset + 1) % enemy.frameCount;
                    enemy.frameX = enemy.baseFrameX + nextOffset;
                    enemy.frameTimer = 0;
                }
            }

            if (
                player.x < enemy.x + 30 &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + 30 &&
                player.y + player.height > enemy.y
            ) {
                if (!player.isInvincible && !player.isDashing) {
                    player.lives--;
                    shakeIntensity = 10;
                    player.isInvincible = true;
                    player.invTimer = 60;
                    showDamage(player.x, player.y, "-1 HP", "red");
                    if (player.lives <= 0) setTimeout(() => {
                        saveScore(); gameState = "GAME_OVER";
                    }, 100);
                }
            }
        });

        for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
            let ep = enemyProjectiles[i];
            ep.x += ep.vx;
            ep.y += ep.vy;

            if (ep.x < 0 || ep.x > canvas.width || ep.y < 0 || ep.y > canvas.height) {
                enemyProjectiles.splice(i, 1);
                continue;
            }

            if (
                ep.x > player.x && ep.x < player.x + player.width &&
                ep.y > player.y && ep.y < player.y + player.height
            ) {
                if (!player.isInvincible && !player.isDashing) {
                    player.lives--;
                    shakeIntensity = 10;
                    player.isInvincible = true;
                    player.invTimer = 60;
                    showDamage(player.x, player.y, "-1 HP", "red");
                    if (player.lives <= 0) setTimeout(() => {
                        saveScore(); gameState = "GAME_OVER";
                    }, 100);
                }
                enemyProjectiles.splice(i, 1);
            }
        }
    }

    if (player.invTimer > 0) {
        player.invTimer--;
        if (player.invTimer <= 0) player.isInvincible = false;
    }
    if (player.isMoving) {
        player.frameTimer++;
        if (player.frameTimer >= player.frameSpeed) {
            player.frameX = (player.frameX + 1) % player.frameCount;
            player.frameTimer = 0;
        }
    }
    if (wallLayer[pRow] && wallLayer[pRow][pCol] === 10) {
        currentLevel++;
        loadLevel(currentLevel);
        return;
    }
}

// --- RENDER FUNCTIONS ---

// NEW: Flickering Fog Logic
function drawFog() {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tCtx = tempCanvas.getContext("2d");
    tCtx.fillStyle = "rgba(0, 0, 0, 0.95)";
    tCtx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    
    // Flicker calculation
    const flicker = (Math.random() * 10) - 5; 
    const radius = 120 + flicker;

    const gradient = tCtx.createRadialGradient(
        centerX,
        centerY,
        20,
        centerX,
        centerY,
        radius
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    tCtx.globalCompositeOperation = "destination-out";
    tCtx.fillStyle = gradient;
    tCtx.beginPath();
    tCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    tCtx.fill();
    ctx.drawImage(tempCanvas, 0, 0);
}

function render() {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === "START") {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Welcome, would you like to help the bear", canvas.width / 2, canvas.height / 2 - 50);
        ctx.fillText("get revenge on the dragon?", canvas.width / 2, canvas.height / 2);
        const btnX = canvas.width / 2 - 50;
        const btnY = canvas.height / 2 + 50;
        ctx.fillStyle = "green";
        ctx.fillRect(btnX, btnY, 100, 50);
        ctx.fillStyle = "white";
        ctx.fillText("YES", canvas.width / 2, btnY + 35);
        ctx.textAlign = "start";
        return;
    }

    if (gameState === "INPUT_NAME") {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Enter your name:", canvas.width / 2, canvas.height / 2 - 50);
        ctx.fillStyle = "yellow";
        ctx.fillText(playerName + "_", canvas.width / 2, canvas.height / 2);
        ctx.textAlign = "start";
        return;
    }

    if (gameState === "DIFFICULTY_SELECT") {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("SELECT DIFFICULTY", canvas.width / 2, 100);
        const btnW = 200;
        const btnH = 50;
        const btnX = canvas.width / 2 - btnW / 2;
        ctx.font = "30px Arial";
        ctx.fillStyle = "green";
        ctx.fillRect(btnX, 200, btnW, btnH);
        ctx.fillStyle = "white";
        ctx.fillText("EASY", canvas.width / 2, 200 + 35);
        ctx.fillStyle = "orange";
        ctx.fillRect(btnX, 300, btnW, btnH);
        ctx.fillStyle = "white";
        ctx.fillText("MEDIUM", canvas.width / 2, 300 + 35);
        ctx.fillStyle = "red";
        ctx.fillRect(btnX, 400, btnW, btnH);
        ctx.fillStyle = "white";
        ctx.fillText("HARD", canvas.width / 2, 400 + 35);
        ctx.textAlign = "start";
        return;
    }

    if (gameState === "GAME_OVER") {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "red";
        ctx.font = "50px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 + 30);
        const btnX = canvas.width / 2 - 75;
        const btnY = canvas.height / 2 + 60;
        ctx.fillStyle = "gray";
        ctx.fillRect(btnX, btnY, 150, 50);
        ctx.fillStyle = "white";
        ctx.fillText("LEADERBOARD", canvas.width / 2, btnY + 35);
        ctx.textAlign = "start";
        return;
    }

    if (gameState === "LEADERBOARD") {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("LEADERBOARD", canvas.width / 2, 80);
        const highScores = JSON.parse(localStorage.getItem("leaderboard")) || [];
        ctx.font = "24px Arial";
        highScores.forEach((entry, index) => {
            ctx.fillText(
                `${index + 1}. ${entry.name} - ${entry.score} pts`,
                canvas.width / 2,
                140 + index * 40
            );
        });
        const btnX = canvas.width / 2 - 60;
        const btnY = canvas.height - 80;
        ctx.fillStyle = "green";
        ctx.fillRect(btnX, btnY, 120, 40);
        ctx.fillStyle = "white";
        ctx.fillText("RESTART", canvas.width / 2, btnY + 28);
        ctx.textAlign = "start";
        return;
    }

    ctx.save();
    if (shakeIntensity > 0) {
        let dx = (Math.random() - 0.5) * shakeIntensity;
        let dy = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(dx, dy);
    }

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            ctx.drawImage(
                tileset,
                bgLayer[r][c] * TILE_SRC_SIZE,
                0,
                TILE_SRC_SIZE,
                TILE_SRC_SIZE,
                c * TILE_DISPLAY_SIZE,
                r * TILE_DISPLAY_SIZE,
                TILE_DISPLAY_SIZE,
                TILE_DISPLAY_SIZE
            );
            if (wallLayer[r][c] !== -1)
                ctx.drawImage(
                    tileset,
                    wallLayer[r][c] * TILE_SRC_SIZE,
                    16,
                    TILE_SRC_SIZE,
                    TILE_SRC_SIZE,
                    c * TILE_DISPLAY_SIZE,
                    r * TILE_DISPLAY_SIZE,
                    TILE_DISPLAY_SIZE,
                    TILE_DISPLAY_SIZE
                );
        }
    }

    traps.forEach((trap) => {
        if (trap.revealed)
            ctx.drawImage(
                trapImg,
                trap.c * TILE_DISPLAY_SIZE,
                trap.r * TILE_DISPLAY_SIZE,
                TILE_DISPLAY_SIZE,
                TILE_DISPLAY_SIZE
            );
    });

    // NEW: Draw Items (Health Drops)
    items.forEach(item => {
        if (item.type === "health") {
            ctx.drawImage(heartImg, item.x, item.y, item.width, item.height);
        }
    });

    enemies.forEach((enemy) => {
        if (enemy.img) {
            if (enemy.facingRight) {
                ctx.save();
                ctx.translate(enemy.x + enemy.width, enemy.y);
                ctx.scale(-1, 1);
                ctx.drawImage(enemy.img, enemy.frameX * enemy.srcW, enemy.frameY * enemy.srcH, enemy.srcW, enemy.srcH, 0, 0, enemy.width, enemy.height);
                ctx.restore();
            } else {
                ctx.drawImage(enemy.img, enemy.frameX * enemy.srcW, enemy.frameY * enemy.srcH, enemy.srcW, enemy.srcH, enemy.x, enemy.y, enemy.width, enemy.height);
            }
        } else if (enemy.isBoss) {
            ctx.font = "60px Arial";
            ctx.fillText(enemy.emoji, enemy.x, enemy.y + 50);
        } else {
            ctx.font = "30px Arial";
            ctx.fillText(enemy.emoji, enemy.x, enemy.y + 25);
        }

        if (enemy.isBoss) {
            ctx.fillStyle = "black";
            ctx.fillRect(canvas.width / 2 - 152, 18, 304, 24);
            ctx.fillStyle = "red";
            ctx.fillRect(canvas.width / 2 - 150, 20, 300, 20);
            ctx.fillStyle = "#0f0";
            ctx.fillRect(canvas.width / 2 - 150, 20, 300 * (enemy.hp / enemy.maxHp), 20);
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(enemy.x, enemy.y + enemy.height + 5, enemy.width, 5);
            ctx.fillStyle = "#0f0";
            ctx.fillRect(enemy.x, enemy.y + enemy.height + 5, enemy.width * (enemy.hp / enemy.maxHp), 5);
        }
    });

    ctx.font = "20px Arial";
    projectiles.forEach((p) => {
        ctx.fillText("🔥", p.x - 10, p.y + 10);
    });
    enemyProjectiles.forEach((p) => {
        ctx.fillText("🔥", p.x - 10, p.y + 10);
    });

    particles.forEach((p) => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1.0;

    if (!player.isInvincible || Math.floor(Date.now() / 100) % 2) {
        if (!player.facingRight) {
            ctx.save();
            ctx.translate(player.x + player.width, player.y);
            ctx.scale(-1, 1);
            ctx.drawImage(playerImg, player.frameX * player.srcW, 0, player.srcW, player.srcH, 0, 0, player.width, player.height);
            ctx.restore();
        } else {
            ctx.drawImage(playerImg, player.frameX * player.srcW, 0, player.srcW, player.srcH, player.x, player.y, player.width, player.height);
        }
    }

    // NEW: Dash Cooldown Bar (under player)
    if (player.dashCooldown > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(player.x, player.y + player.height + 5, player.width, 4);
        ctx.fillStyle = "cyan";
        // Calculate remaining cooldown ratio (max cooldown is 60)
        let cdRatio = 1 - (player.dashCooldown / 60); 
        ctx.fillRect(player.x, player.y + player.height + 5, player.width * cdRatio, 4);
    }

    if (currentLevel === 1) drawFog();
    
    // NEW: Draw Floating Text (Over everything except UI)
    ctx.save();
    ctx.font = "bold 20px Arial";
    floatingTexts.forEach(ft => {
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillStyle = "black";
        ctx.fillText(ft.text, ft.x + 2, ft.y + 2);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.restore();

    ctx.restore(); // End Shake

    if (currentLevel === 2) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.01)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (let i = 0; i < player.lives; i++) {
        ctx.drawImage(heartImg, 10 + i * 35, 10, 30, 30);
    }

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score + "   Time: " + Math.floor(gameTime / 60) + "s", 10, 60);
    ctx.font = "14px Arial";
    ctx.fillText("[SHIFT] to Dash", 10, 80);

    if (gameWon) {
        ctx.fillStyle = "gold";
        ctx.font = "60px Arial";
        ctx.textAlign = "center";
        ctx.fillText("YOU WIN", canvas.width / 2, canvas.height / 2);
        ctx.textAlign = "start";
    }

    if (gameState === "SETTINGS") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2 - 100);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const btnW = 200;
        const btnH = 40;
        ctx.fillStyle = "gray";
        ctx.fillRect(cx - btnW / 2, cy - 60, btnW, btnH);
        ctx.fillStyle = "white";
        ctx.font = "24px Arial";
        ctx.fillText("CONTROLS", cx, cy - 32);
        ctx.fillStyle = "orange";
        ctx.fillRect(cx - btnW / 2, cy, btnW, btnH);
        ctx.fillStyle = "white";
        ctx.fillText("RESTART", cx, cy + 28);
        ctx.fillStyle = "red";
        ctx.fillRect(cx - btnW / 2, cy + 60, btnW, btnH);
        ctx.fillStyle = "white";
        ctx.fillText("QUIT", cx, cy + 88);
        ctx.textAlign = "start";
    }

    if (gameState === "SETTINGS_CONTROLS") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("CONTROLS", canvas.width / 2, canvas.height / 2 - 100);
        ctx.font = "24px Arial";
        ctx.fillText("WASD / Arrows : Move", canvas.width / 2, canvas.height / 2 - 40);
        ctx.fillText("SHIFT : Dash", canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText("Space : Shoot", canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText("Esc : Pause", canvas.width / 2, canvas.height / 2 + 50);
        ctx.fillStyle = "gray";
        ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 100, 200, 40);
        ctx.fillStyle = "white";
        ctx.fillText("BACK", canvas.width / 2, canvas.height / 2 + 128);
        ctx.textAlign = "start";
    }
}

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}
loadLevel(currentLevel);
let loaded = 0;
const checkLoad = () => {
    console.log("Asset loaded. Count:", loaded + 1);
    if (++loaded === 6) {
        console.log("All assets loaded. Starting Game Loop.");
        gameLoop();
    }
};

tileset.onload =
    playerImg.onload =
    trapImg.onload =
    heartImg.onload =
    enemy1Img.onload =
    enemy2Img.onload =
    bossImg.onload =
    checkLoad;

tileset.src = "assets/map0.png";
playerImg.src = "assets/space3.png";
heartImg.src = "assets/heart.png";
enemy1Img.src = "assets/monster2.png";
enemy2Img.src = "assets/monster5.png";
bossImg.src = "assets/bigmonster1.png";