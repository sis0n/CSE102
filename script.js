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
tileset.src = "assets/map0.png";
const playerImg = new Image();
playerImg.src = "assets/space3.png";
const trapImg = new Image();
trapImg.src = "assets/monster5.gif";
const heartImg = new Image();
heartImg.src = "assets/heart.png";

const bgLayer = [];
const wallLayer = [];
const traps = [];
let solutionPathSet = new Set();
let solutionPathArr = [];

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
  speed: 2.5,
  isMoving: false,
  lives: 3,
  isInvincible: false,
  invTimer: 0,
};

const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  player.isMoving = true;
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
  if (!Object.values(keys).some((v) => v)) {
    player.isMoving = false;
    player.frameX = 0;
  }
});

function generateMaze() {
  solutionPathSet.clear();
  solutionPathArr = [];
  traps.length = 0;

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

  // --- LOGIC: ISANG TRAP LANG SA BAWAT BRANCH NA HINDI SOLUTION ---
  // Mag-iscan tayo ng mga tiles na dulo (dead-ends) na hindi parte ng solution
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (wallLayer[r][c] === -1 && !solutionPathSet.has(`${r},${c}`)) {
        // Tignan kung dead-end (isang daan lang ang bukas sa paligid nito)
        let openPaths = 0;
        if (wallLayer[r - 1] && wallLayer[r - 1][c] === -1) openPaths++;
        if (wallLayer[r + 1] && wallLayer[r + 1][c] === -1) openPaths++;
        if (wallLayer[r][c - 1] === -1) openPaths++;
        if (wallLayer[r][c + 1] === -1) openPaths++;

        if (openPaths === 1) {
          // Ito ay dulo ng maling daan
          traps.push({ r: r, c: c, revealed: false });
        }
      }
    }
  }

  // --- 2 TRAPS PA RIN SA ORIGINAL PATH (challenge) ---
  if (solutionPathArr.length > 10) {
    for (let i = 0; i < 2; i++) {
      let randomIndex =
        Math.floor(Math.random() * (solutionPathArr.length - 10)) + 5;
      let target = solutionPathArr[randomIndex];
      // Iwasan ang duplicate trap sa iisang spot
      if (!traps.some((t) => t.r === target.r && t.c === target.c)) {
        traps.push({ r: target.r, c: target.c, revealed: false });
      }
    }
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

function update() {
  if (player.lives <= 0) return;
  let nx = player.x,
    ny = player.y;
  if (keys["w"] || keys["arrowup"]) ny -= player.speed;
  if (keys["s"] || keys["arrowdown"]) ny += player.speed;
  if (keys["a"] || keys["arrowleft"]) nx -= player.speed;
  if (keys["d"] || keys["arrowright"]) nx += player.speed;
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
            alert("GAME OVER!");
            location.reload();
          }, 100);
      }
    }
  });

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
    alert("YOU WIN!");
    location.reload();
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

  drawFog();

  for (let i = 0; i < player.lives; i++) {
    ctx.drawImage(heartImg, 10 + i * 35, 10, 30, 30);
  }
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}
generateMaze();
let loaded = 0;
const checkLoad = () => {
  if (++loaded === 4) gameLoop();
};
tileset.onload =
  playerImg.onload =
  trapImg.onload =
  heartImg.onload =
    checkLoad;
