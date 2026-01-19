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

const bgLayer = [];
const wallLayer = [];
const traps = [];
const enemies = [];
const projectiles = [];
const enemyProjectiles = [];
let solutionPathSet = new Set();
let solutionPathArr = [];
let currentLevel = 1;
let forestWave = 0;
let gameWon = false;
let gameState = "START";
let playerName = "";
let score = 0;

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
speed: 5.5,
  isMoving: false,
  lives: 3,
  isInvincible: false,
  invTimer: 0,
  lastDir: { x: 1, y: 0 },
  shootTimer: 0,
};

const keys = {};
window.addEventListener("keydown", (e) => {
  if (gameState === "INPUT_NAME") {
    if (e.key === "Enter") {
      if (playerName.length > 0) gameState = "PLAYING";
    } else if (e.key === "Backspace") {
      playerName = playerName.slice(0, -1);
    } else if (e.key.length === 1) {
      playerName += e.key;
    }
    return;
  }
  if (gameState !== "PLAYING") return;

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
  if (gameState === "LEADERBOARD") {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const btnX = canvas.width / 2 - 60;
    const btnY = canvas.height - 80;
    const btnW = 120;
    const btnH = 40;
    if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH) {
      location.reload(); // Simple reload to restart
    }
  }
});

function generateMaze() {
  solutionPathSet.clear();
  solutionPathArr = [];
  traps.length = 0;
  enemies.length = 0;
  projectiles.length = 0;
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

  // BFS PATHFINDING para sa "Solution Path"
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
  gameWon = false;

  for (let r = 0; r < ROWS; r++) {
    bgLayer[r] = [];
    wallLayer[r] = [];
    for (let c = 0; c < COLS; c++) {
      bgLayer[r][c] = 0;
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        wallLayer[r][c] = 5; // Tree tile (Index 5 from map0.png)
      } else {
        wallLayer[r][c] = -1;
      }
    }
  }
  player.x = TILE_DISPLAY_SIZE * 2;
  player.y = TILE_DISPLAY_SIZE * 2;

  // Spawn 10 Monsters
  for (let i = 0; i < 10; i++) {
    let ex, ey;
    // Find a random spot not too close to the player
    do {
      ex = Math.floor(Math.random() * (COLS - 2) + 1) * TILE_DISPLAY_SIZE;
      ey = Math.floor(Math.random() * (ROWS - 2) + 1) * TILE_DISPLAY_SIZE;
    } while (Math.abs(ex - player.x) < 150 && Math.abs(ey - player.y) < 150);

    enemies.push({
      x: ex,
      y: ey,
      width: 30,
      height: 30,
      speed: 1 + Math.random() * 1.5, // Random speed between 1 and 2.5
      hp: 1,
      maxHp: 1,
      emoji: "👹",
      points: 5,
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
  // return true;
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

function saveScore() {
  const highScores = JSON.parse(localStorage.getItem("leaderboard")) || [];
  highScores.push({ name: playerName, score: score });
  highScores.sort((a, b) => b.score - a.score);
  localStorage.setItem("leaderboard", JSON.stringify(highScores.slice(0, 5)));
}

function update() {
  if (gameState !== "PLAYING") return;
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
  }

  if (dy === -1) ny -= player.speed;
  if (dy === 1) ny += player.speed;
  if (dx === -1) nx -= player.speed;
  if (dx === 1) nx += player.speed;

  if (canMoveTo(nx, player.y)) player.x = nx;
  if (canMoveTo(player.x, ny)) player.y = ny;

  let pCol = Math.floor((player.x + player.width / 2) / TILE_DISPLAY_SIZE);
  let pRow = Math.floor((player.y + player.height / 2) / TILE_DISPLAY_SIZE);

  traps.forEach((trap) => {
    if (trap.r === pRow && trap.c === pCol) {
      trap.revealed = true;
      if (!player.isInvincible) {
        player.lives--;
        player.isInvincible = true;
        player.invTimer = 60;
        if (player.lives <= 0)
          setTimeout(() => { 
            saveScore(); gameState = "LEADERBOARD"; 
          }, 100);
      }
    }
  });

  // Shooting Logic
  if (player.shootTimer > 0) player.shootTimer--;
  if (keys[" "] && player.shootTimer <= 0) {
    player.shootTimer = 20; // Cooldown
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

    // Check Wall Collision / Out of Bounds
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
        if (e.hp <= 0) {
          score += e.points;
          if (e.isBoss) {
            gameWon = true;
            setTimeout(() => {
              saveScore();
              gameState = "LEADERBOARD";
            }, 3000);
          }
          enemies.splice(j, 1); // Kill enemy
        }
        projectiles.splice(i, 1); // Remove fireball
        break;
      }
    }
  }

  // Enemy Logic (Level 2)
  if (currentLevel === 2) {
    // Wave Logic: Spawn Wave 2 if Wave 1 is cleared
    if (enemies.length === 0 && forestWave === 1) {
      forestWave = 2;
      for (let i = 0; i < 5; i++) {
        let ex, ey;
        do {
          ex = Math.floor(Math.random() * (COLS - 2) + 1) * TILE_DISPLAY_SIZE;
          ey = Math.floor(Math.random() * (ROWS - 2) + 1) * TILE_DISPLAY_SIZE;
        } while (Math.abs(ex - player.x) < 150 && Math.abs(ey - player.y) < 150);

        enemies.push({
          x: ex,
          y: ey,
          width: 30,
          height: 30,
          speed: 1 + Math.random() * 1.5,
          hp: 2,
          maxHp: 2,
          emoji: "👾",
          points: 10,
        });
      }
    } else if (enemies.length === 0 && forestWave === 2) {
      forestWave = 3;
      enemies.push({
        x: (COLS * TILE_DISPLAY_SIZE) / 2 - 30,
        y: (ROWS * TILE_DISPLAY_SIZE) / 2 - 30,
        width: 60,
        height: 60,
        hp: 20,
        maxHp: 20,
        emoji: "🐉",
        isBoss: true,
        points: 30,
        shootTimer: 0,
      });
    }

    enemies.forEach((enemy) => {
      if (enemy.isBoss) {
        enemy.shootTimer--;
        if (enemy.shootTimer <= 0) {
          enemy.shootTimer = 60;
          let ex = enemy.x + enemy.width / 2;
          let ey = enemy.y + enemy.height / 2;
          let px = player.x + player.width / 2;
          let py = player.y + player.height / 2;
          let angle = Math.atan2(py - ey, px - ex);
          let speed = 4;
          enemyProjectiles.push({
            x: ex,
            y: ey,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
          });
        }
      } else {
        // Move towards player
        if (enemy.x < player.x) enemy.x += enemy.speed;
        if (enemy.x > player.x) enemy.x -= enemy.speed;
        if (enemy.y < player.y) enemy.y += enemy.speed;
        if (enemy.y > player.y) enemy.y -= enemy.speed;
      }

      // Collision with Player
      if (
        player.x < enemy.x + 30 &&
        player.x + player.width > enemy.x &&
        player.y < enemy.y + 30 &&
        player.y + player.height > enemy.y
      ) {
        if (!player.isInvincible) {
          player.lives--;
          player.isInvincible = true;
          player.invTimer = 60;
          if (player.lives <= 0) setTimeout(() => { 
             saveScore(); gameState = "LEADERBOARD"; 
          }, 100);
        }
      }
    });

    // Enemy Projectiles
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
        if (!player.isInvincible) {
          player.lives--;
          player.isInvincible = true;
          player.invTimer = 60;
          if (player.lives <= 0) setTimeout(() => { 
             saveScore(); gameState = "LEADERBOARD"; 
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

function drawFog() {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tCtx = tempCanvas.getContext("2d");
  tCtx.fillStyle = "rgba(0, 0, 0, 0.95)";
  tCtx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;
  const radius = 120;

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
    ctx.fillText(
      "Welcome, would you like to help the bear",
      canvas.width / 2,
      canvas.height / 2 - 50
    );
    ctx.fillText(
      "get revenge on the dragon?",
      canvas.width / 2,
      canvas.height / 2
    );
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

  // Draw Enemies (Emoji)
  enemies.forEach((enemy) => {
    if (enemy.isBoss) {
      ctx.font = "60px Arial";
      ctx.fillText(enemy.emoji, enemy.x, enemy.y + 50);
    } else {
      ctx.font = "30px Arial";
      ctx.fillText(enemy.emoji, enemy.x, enemy.y + 25);
    }

    // HP Bar
    ctx.fillStyle = "red";
    ctx.fillRect(enemy.x, enemy.y + enemy.height + 5, enemy.width, 5);
    ctx.fillStyle = "#0f0";
    ctx.fillRect(enemy.x, enemy.y + enemy.height + 5, enemy.width * (enemy.hp / enemy.maxHp), 5);
  });

  // Draw Projectiles (Emoji)
  ctx.font = "20px Arial";
  projectiles.forEach((p) => {
    ctx.fillText("🔥", p.x - 10, p.y + 10);
  });
  enemyProjectiles.forEach((p) => {
    ctx.fillText("🔥", p.x - 10, p.y + 10);
  });

  if (!player.isInvincible || Math.floor(Date.now() / 100) % 2) {
    ctx.drawImage(
      playerImg,
      player.frameX * player.srcW,
      0,
      player.srcW,
      player.srcH,
      player.x,
      player.y,
      player.width,
      player.height
    );
  }

  if (currentLevel === 1) drawFog();

  for (let i = 0; i < player.lives; i++) {
    ctx.drawImage(heartImg, 10 + i * 35, 10, 30, 30);
  }
  
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 10, 60);

  if (gameWon) {
    ctx.fillStyle = "gold";
    ctx.font = "60px Arial";
    ctx.textAlign = "center";
    ctx.fillText("YOU WIN", canvas.width / 2, canvas.height / 2);
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
  if (++loaded === 4) {
    console.log("All assets loaded. Starting Game Loop.");
    gameLoop();
  }
};

tileset.onload =
  playerImg.onload =
  trapImg.onload =
  heartImg.onload =
    checkLoad;

tileset.src = "assets/map0.png";
playerImg.src = "assets/space3.png";
trapImg.src = "assets/monster5.gif";
heartImg.src = "assets/heart.png";
