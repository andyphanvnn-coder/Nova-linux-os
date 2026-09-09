const boot = document.getElementById("boot");
const desktop = document.getElementById("desktop");
const terminalOutput = document.getElementById("terminalOutput");
const commandInput = document.getElementById("commandInput");
const pathLabel = document.getElementById("pathLabel");
const toast = document.getElementById("toast");
let currentDirectory = "~";
let fileManagerDirectory = "~";
let previewedDocument = null;
let toastTimer;
const files = { "~": { "README.txt": "Welcome to Nova Linux!", "hello.txt": "Hello from Nova Linux.", Documents: {}, Downloads: {} } };
let mines = [];
let revealedCells = new Set();
let gameOver = false;
let activeGame = "mines";
let clickScore = 0;
let memoryCards = [];
let memoryFlipped = [];
let matchedMemory = new Set();
const pacmanMap = [
    "#####################",
    "#.........#.........#",
    "#.###.###.#.###.###.#",
    "#...................#",
    "#.###.#.#####.#.###.#",
    "#.....#...#...#.....#",
    "#####.#.#.#.#.#.#####",
    "####..#.......#..####",
    "####..#.#####.#..####",
    "#......#.....#......#",
    "#.###.###.###.###.###",
    "#...................#",
    "#.###.#.#####.#.###.#",
    "#...#.#...#...#.#...#",
    "###.#.###.#.###.#.###",
    "#.....#.......#.....#",
    "#.###.#.#####.#.###.#",
    "#...................#",
    "#.###.###.#.###.###.#",
    "#.........#.........#",
    "#####################"
];
let pacmanPosition = { row: 1, column: 1 };
let ghostPosition = { row: 7, column: 7 };
let ghostPositions = [{ row: 9, column: 9 }, { row: 9, column: 10 }, { row: 9, column: 11 }];
let pacmanDots = new Set();
let pacmanScore = 0;
let pacmanCaught = false;
let dashY = 0;
let dashVelocity = 0;
let dashScore = 0;
let dashX = 48;
let dashRotation = 45;
let dashRunning = true;
const dashPlatforms = [{ start: 160, width: 72, height: 47 }, { start: 340, width: 72, height: 68 }, { start: 520, width: 72, height: 44 }];
let dashSpikeStarts = [180, 380, 580];

setTimeout(() => { boot.style.display = "none"; desktop.style.display = "block"; openWindow("terminal"); }, 1700);

function updateClock() { const now = new Date(); document.getElementById("clock").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); document.getElementById("topbarDate").textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }); }
setInterval(updateClock, 1000); updateClock();

function openWindow(id) { const element = document.getElementById(id); if (!element) return; element.style.display = "block"; if (id === "terminal") commandInput.focus(); }
function closeWindow(id) { const element = document.getElementById(id); if (element) element.style.display = "none"; }
function togglePanel(id) { const element = document.getElementById(id); element.style.display = element.style.display === "block" ? "none" : "block"; }
function showToast(message) { toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2200); }

function makeWindowsDraggable() {
    const workspaceRect = () => document.getElementById("workspace").getBoundingClientRect();

    document.querySelectorAll(".window").forEach(windowElement => {
        const titlebar = windowElement.querySelector(".window-titlebar");
        if (!titlebar) return;

        titlebar.addEventListener("pointerdown", event => {
            if (event.target.closest("button")) return;

            const windowRect = windowElement.getBoundingClientRect();
            const bounds = workspaceRect();
            windowElement.style.transform = "none";
            windowElement.style.left = `${windowRect.left - bounds.left}px`;
            windowElement.style.top = `${windowRect.top - bounds.top}px`;
            windowElement.style.zIndex = "6";
            titlebar.setPointerCapture(event.pointerId);

            const offsetX = event.clientX - windowRect.left;
            const offsetY = event.clientY - windowRect.top;

            const moveWindow = moveEvent => {
                const currentBounds = workspaceRect();
                const maxLeft = Math.max(0, currentBounds.width - windowElement.offsetWidth);
                const maxTop = Math.max(0, currentBounds.height - windowElement.offsetHeight);
                const nextLeft = Math.min(maxLeft, Math.max(0, moveEvent.clientX - currentBounds.left - offsetX));
                const nextTop = Math.min(maxTop, Math.max(0, moveEvent.clientY - currentBounds.top - offsetY));
                windowElement.style.left = `${nextLeft}px`;
                windowElement.style.top = `${nextTop}px`;
            };

            const stopMoving = () => {
                titlebar.removeEventListener("pointermove", moveWindow);
                titlebar.removeEventListener("pointerup", stopMoving);
                titlebar.removeEventListener("pointercancel", stopMoving);
            };

            titlebar.addEventListener("pointermove", moveWindow);
            titlebar.addEventListener("pointerup", stopMoving);
            titlebar.addEventListener("pointercancel", stopMoving);
        });
    });
}

makeWindowsDraggable();
renderFileManager();
resetGame();

document.addEventListener("click", event => {
    const openTarget = event.target.closest("[data-open]");
    const closeTarget = event.target.closest("[data-close]");
    const urlTarget = event.target.closest("[data-url]");
    if (openTarget) { openWindow(openTarget.dataset.open); document.getElementById("appLauncher").style.display = "none"; }
    if (openTarget && openTarget.dataset.gameMode) setGameMode(openTarget.dataset.gameMode);
    if (closeTarget) closeWindow(closeTarget.dataset.close);
    if (urlTarget) { window.open(urlTarget.dataset.url, "_blank", "noopener,noreferrer"); document.getElementById("appLauncher").style.display = "none"; }
    if (event.target.id === "launcherButton" || event.target.closest("#activitiesButton")) togglePanel("appLauncher");
    if (event.target.id === "quickSettingsButton") togglePanel("quickSettings");
    if (event.target.id === "lockButton") showToast("Session locked • click to continue");
    if (event.target.id === "rebootButton") location.reload();
    if (event.target.id === "trashButton") showToast("Trash is empty");
    const folderTarget = event.target.closest("[data-folder]");
    if (folderTarget) openFolder(folderTarget.dataset.folder);
    const fileTarget = event.target.closest("[data-file]");
    if (fileTarget) openDocument(fileTarget.dataset.file);
    if (event.target.id === "downloadDocument") downloadDocument();
    if (event.target.id === "resetGame") resetGame();
    if (activeGame === "dash" && event.target.closest("#dashTrack")) jumpDash();
    if (event.target.closest("[data-game-mode]")) setGameMode(event.target.closest("[data-game-mode]").dataset.gameMode);
    if (event.target.id === "clickTarget") { clickScore++; document.getElementById("clickScore").textContent = clickScore; }
    if (event.target.closest("[data-memory-index]")) flipMemoryCard(Number(event.target.closest("[data-memory-index]").dataset.memoryIndex));
    if (event.target.closest("[data-cell]")) revealCell(Number(event.target.closest("[data-cell]").dataset.cell));
    if (event.target.closest(".toggle")) event.target.closest(".toggle").classList.toggle("active");
    if (event.target.closest(".switch")) event.target.closest(".switch").classList.toggle("active");
    if (event.target.closest(".swatch")) { document.querySelectorAll(".swatch").forEach(swatch => swatch.classList.remove("active")); event.target.closest(".swatch").classList.add("active"); }
});

document.addEventListener("keydown", event => {
    if ((event.key === " " || event.key === "ArrowUp") && activeGame === "dash") { event.preventDefault(); jumpDash(); }
    if (activeGame !== "pacman" || pacmanCaught || document.getElementById("game").style.display !== "block") return;
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (!moves[event.key]) return;
    event.preventDefault();
    const [rowChange, columnChange] = moves[event.key];
    const nextRow = pacmanPosition.row + rowChange;
    const nextColumn = pacmanPosition.column + columnChange;
    if (pacmanMap[nextRow][nextColumn] === "#") return;
    pacmanPosition = { row: nextRow, column: nextColumn };
    pacmanDots.delete(`${nextRow},${nextColumn}`);
    pacmanScore++;
    document.getElementById("pacmanScore").textContent = String(pacmanScore * 10).padStart(4, "0");
    document.getElementById("gameResult").textContent = pacmanDots.size ? `Dots left: ${pacmanDots.size}` : "Maze cleared. You win!";
    renderPacman();
});

function jumpDash() {
    const supportHeight = getDashSupportHeight();
    if (dashRunning && (dashY === 0 || dashY === supportHeight)) {
        dashVelocity = 8.5;
        dashY = supportHeight + 0.5;
        renderDash();
    }
}

setInterval(() => {
    if (activeGame !== "dash" || !dashRunning || document.getElementById("game").style.display !== "block") return;
    dashVelocity -= 0.55;
    dashY = Math.max(0, dashY + dashVelocity);
    dashX += 5;
    dashRotation += 12;
    dashScore++;
    if (dashScore % 10 === 0) document.getElementById("dashScore").textContent = String(Math.floor(dashScore / 10)).padStart(3, "0");
    const player = document.getElementById("dashPlayer");
    player.style.bottom = `${dashY}px`;
    const cameraOffset = Math.max(0, dashX - 120);
    const playerScreenX = dashX - cameraOffset;
    player.style.left = `${playerScreenX}px`;
    player.style.transform = `rotate(${dashRotation}deg)`;
    while (dashSpikeStarts[dashSpikeStarts.length - 1] < dashX + 900) dashSpikeStarts.push(dashSpikeStarts[dashSpikeStarts.length - 1] + 180 + (dashSpikeStarts.length % 3) * 35);
    renderDashSpikes(cameraOffset);
    dashPlatforms.forEach((platform, index) => { document.querySelector(`.platform-${["one", "two", "three"][index]}`).style.left = `${dashObjectPosition(platform.start, cameraOffset)}px`; });
    const previousY = dashY;
    const playerLeft = playerScreenX + 4;
    const playerRight = playerScreenX + 20;
    dashPlatforms.forEach(platform => {
        const platformLeft = platform.start - cameraOffset;
        const platformRight = platformLeft + platform.width;
        const horizontalOverlap = playerRight > platformLeft && playerLeft < platformRight;
        if (!horizontalOverlap) return;
        if (dashVelocity <= 0 && previousY >= platform.height && dashY <= platform.height) {
            dashY = platform.height;
            dashVelocity = 0;
        }
    });
    const cubeHitbox = { left: playerScreenX + 4, right: playerScreenX + 20, bottom: dashY + 3, top: dashY + 20 };
    const hit = dashSpikeStarts.some(spikeStart => {
        const spikeLeft = dashObjectPosition(spikeStart, cameraOffset) + 6;
        const spikeRight = dashObjectPosition(spikeStart, cameraOffset) + 24;
        const spikeTop = 15;
        return cubeHitbox.right > spikeLeft && cubeHitbox.left < spikeRight && cubeHitbox.bottom < 26 && cubeHitbox.top > spikeTop;
    });
    if (hit) { dashRunning = false; document.getElementById("gameResult").textContent = "Crashed. Press New game to retry."; }
}, 50);

setInterval(() => {
    if (activeGame !== "pacman" || pacmanCaught || document.getElementById("game").style.display !== "block") return;
    ghostPositions = ghostPositions.map((ghost, index) => moveGhost(ghost, index));
    ghostPosition = ghostPositions[0];
    if (ghostPositions.some(ghost => ghost.row === pacmanPosition.row && ghost.column === pacmanPosition.column)) {
        pacmanCaught = true;
        document.getElementById("gameResult").textContent = "The ghost caught you. Start a new game.";
    }
    renderPacman();
}, 700);

function moveGhost(ghost, index) {
    const rowDistance = pacmanPosition.row - ghost.row;
    const columnDistance = pacmanPosition.column - ghost.column;
    const preferredMoves = Math.abs(rowDistance) >= Math.abs(columnDistance)
        ? [[Math.sign(rowDistance), 0], [0, Math.sign(columnDistance)]]
        : [[0, Math.sign(columnDistance)], [Math.sign(rowDistance), 0]];
    const alternateMoves = index % 2 ? [[0, -1], [0, 1], [-1, 0], [1, 0]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [rowChange, columnChange] of [...preferredMoves, ...alternateMoves]) {
        if (!rowChange && !columnChange) continue;
        const nextRow = ghost.row + rowChange;
        const nextColumn = ghost.column + columnChange;
        if (pacmanMap[nextRow]?.[nextColumn] !== "#") return { row: nextRow, column: nextColumn };
    }
    return ghost;
}

function dashObjectPosition(start, trackOffset) {
    return start - trackOffset;
}

function resetGame() {
    mines = [];
    revealedCells = new Set();
    gameOver = false;
    while (mines.length < 5) {
        const cell = Math.floor(Math.random() * 25);
        if (!mines.includes(cell)) mines.push(cell);
    }
    document.getElementById("gameStatus").textContent = "Find the safe cells.";
    document.getElementById("gameResult").textContent = "Clear every safe cell to win.";
    document.getElementById("mineCounter").textContent = "Mines: 5";
    clickScore = 0;
    document.getElementById("clickScore").textContent = "0";
    memoryCards = ["◆", "●", "★", "▲", "◆", "●", "★", "▲"].sort(() => Math.random() - 0.5);
    memoryFlipped = [];
    matchedMemory = new Set();
    pacmanPosition = { row: 1, column: 1 };
    ghostPosition = { row: 9, column: 9 };
    ghostPositions = [{ row: 9, column: 9 }, { row: 9, column: 10 }, { row: 9, column: 11 }];
    pacmanScore = 0;
    document.getElementById("pacmanScore").textContent = "0000";
    pacmanCaught = false;
    dashY = 0;
    dashVelocity = 0;
    dashScore = 0;
    dashX = 48;
    dashSpikeStarts = [180, 380, 580];
    dashRotation = 45;
    dashRunning = true;
    pacmanDots = new Set();
    pacmanMap.forEach((line, row) => [...line].forEach((tile, column) => { if (tile === ".") pacmanDots.add(`${row},${column}`); }));
    pacmanDots = new Set([...pacmanDots].filter(cell => reachablePacmanCells().has(cell)));
    pacmanDots.delete("1,1");
    renderGame();
    renderMemory();
    renderPacman();
    renderDash();
}

function reachablePacmanCells() {
    const reachable = new Set(["1,1"]);
    const queue = [[1, 1]];
    while (queue.length) {
        const [row, column] = queue.shift();
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([rowChange, columnChange]) => {
            const nextRow = row + rowChange;
            const nextColumn = column + columnChange;
            const key = `${nextRow},${nextColumn}`;
            if (pacmanMap[nextRow]?.[nextColumn] !== "#" && !reachable.has(key)) {
                reachable.add(key);
                queue.push([nextRow, nextColumn]);
            }
        });
    }
    return reachable;
}

function setGameMode(mode) {
    activeGame = mode;
    document.querySelectorAll(".game-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.gameMode === mode));
    document.getElementById("mineGrid").style.display = mode === "mines" ? "grid" : "none";
    document.getElementById("clickerGame").style.display = mode === "clicker" ? "block" : "none";
    document.getElementById("pacmanGame").style.display = mode === "pacman" ? "block" : "none";
    document.getElementById("dashGame").style.display = mode === "dash" ? "block" : "none";
    document.getElementById("gameTitle").textContent = mode === "mines" ? "Nova Mines" : mode === "clicker" ? "Click Rush" : mode === "memory" ? "Memory Match" : mode === "pacman" ? "Pac-Man" : "Geometry Dash";
    document.getElementById("gameStatus").textContent = mode === "mines" ? "Find the safe cells." : mode === "clicker" ? "Build your score." : mode === "memory" ? "Match every pair." : mode === "pacman" ? "Collect every dot." : "Jump the spikes.";
    document.getElementById("gameResult").textContent = mode === "mines" ? "Clear every safe cell to win." : mode === "clicker" ? "How fast can you click?" : mode === "memory" ? "Find all four pairs." : mode === "pacman" ? `Dots left: ${pacmanDots.size}` : "Jump the spikes.";
    if (mode === "memory") renderMemory();
    if (mode === "dash") renderDash();
}

function renderGame() {
    const grid = document.getElementById("mineGrid");
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 25 }, (_, cell) => {
        const revealed = revealedCells.has(cell);
        const mined = mines.includes(cell);
        const content = revealed ? (mined ? "✦" : "·") : "";
        return `<button class="mine-cell${revealed ? " revealed" : ""}${revealed && mined ? " mined" : ""}" data-cell="${cell}" aria-label="Cell ${cell + 1}">${content}</button>`;
    }).join("");
}

function revealCell(cell) {
    if (gameOver || revealedCells.has(cell)) return;
    revealedCells.add(cell);
    if (mines.includes(cell)) {
        gameOver = true;
        mines.forEach(mine => revealedCells.add(mine));
        document.getElementById("gameStatus").textContent = "A mine was triggered.";
        document.getElementById("gameResult").textContent = "Game over. Start a new game to try again.";
    } else if (revealedCells.size === 20) {
        gameOver = true;
        document.getElementById("gameStatus").textContent = "Sector cleared.";
        document.getElementById("gameResult").textContent = "You found every safe cell. Nice work.";
    } else {
        document.getElementById("mineCounter").textContent = `Mines: ${5 - Math.floor(revealedCells.size / 4)}`;
    }
    renderGame();
}

function renderMemory() {
    if (!memoryCards.length) memoryCards = ["◆", "●", "★", "▲", "◆", "●", "★", "▲"].sort(() => Math.random() - 0.5);
    document.getElementById("memoryGrid").innerHTML = memoryCards.map((card, index) => { const visible = memoryFlipped.includes(index) || matchedMemory.has(index); return `<button class="memory-card${visible ? " flipped" : ""}" data-memory-index="${index}">${visible ? card : "?"}</button>`; }).join("");
}

function flipMemoryCard(index) {
    if (memoryFlipped.includes(index) || memoryFlipped.length >= 2) return;
    memoryFlipped.push(index);
    renderMemory();
    if (memoryFlipped.length === 2) {
        const [first, second] = memoryFlipped;
        if (memoryCards[first] === memoryCards[second]) {
            matchedMemory.add(first);
            matchedMemory.add(second);
            memoryFlipped = [];
            if (matchedMemory.size === 8) document.getElementById("gameResult").textContent = "All pairs matched. You win.";
        } else {
            setTimeout(() => { memoryFlipped = []; renderMemory(); }, 650);
        }
    }
}

function renderPacman() {
    const board = document.getElementById("pacmanBoard");
    if (!board) return;
    board.innerHTML = pacmanMap.map((line, row) => [...line].map((tile, column) => {
        const key = `${row},${column}`;
        const player = pacmanPosition.row === row && pacmanPosition.column === column;
        const ghostIndex = ghostPositions.findIndex(ghost => ghost.row === row && ghost.column === column);
        const ghost = ghostIndex !== -1;
        return `<span class="pacman-tile ${tile === "#" ? "pacman-wall" : "pacman-floor"}${player ? " pacman-player" : ""}${ghost ? ` pacman-ghost ghost-${ghostIndex}` : ""}">${player ? "●" : ghost ? "◆" : pacmanDots.has(key) ? "·" : ""}</span>`;
    }).join("")).join("");
}

function renderDash() {
    const player = document.getElementById("dashPlayer");
    if (player) { const cameraOffset = Math.max(0, dashX - 120); player.style.bottom = `${dashY}px`; player.style.left = `${dashX - cameraOffset}px`; player.style.transform = `rotate(${dashRotation}deg)`; }
    const score = document.getElementById("dashScore");
    if (score) score.textContent = String(Math.floor(dashScore / 10)).padStart(3, "0");
}

function renderDashSpikes(cameraOffset) {
    const container = document.getElementById("dashSpikes");
    if (!container) return;
    container.innerHTML = dashSpikeStarts.map(start => `<div class="dash-spike" style="left:${dashObjectPosition(start, cameraOffset)}px"></div>`).join("");
}

function getDashSupportHeight() {
    const cameraOffset = Math.max(0, dashX - 120);
    return dashPlatforms.reduce((height, platform) => {
        const left = platform.start - cameraOffset;
        const playerScreenX = dashX - cameraOffset;
        const overlaps = playerScreenX + 20 > left && playerScreenX + 4 < left + platform.width;
        return overlaps && dashY === platform.height ? platform.height : height;
    }, 0);
}

function openFolder(name) {
    if (!files[name]) files[name] = {};
    fileManagerDirectory = name;
    document.querySelector(".location").textContent = name === "~" ? "Home" : name;
    document.querySelectorAll(".side-link").forEach(link => link.classList.toggle("active", link.dataset.folder === name));
    renderFileManager();
}

function renderFileManager() {
    const grid = document.getElementById("fileGrid");
    if (!grid) return;
    const directory = files[fileManagerDirectory] || {};
    grid.innerHTML = Object.entries(directory).map(([name, value]) => {
        const isFolder = typeof value === "object";
        const itemCount = isFolder ? `${Object.keys(value).length} items` : `${Math.max(1, Math.ceil(value.length / 1024))} KB`;
        return `<button class="${isFolder ? "folder-card" : "file-card"}" ${isFolder ? `data-folder="${escapeHTML(name)}"` : `data-file="${escapeHTML(name)}"`}><span class="${isFolder ? "large-folder" : "large-file"}">${isFolder ? "⌂" : "TXT"}</span><span>${escapeHTML(name)}</span><small>${itemCount}</small></button>`;
    }).join("") || '<p class="empty-folder">This folder is empty.</p>';
}

function openDocument(name) {
    const content = files[fileManagerDirectory][name];
    if (typeof content !== "string") return openFolder(name);
    previewedDocument = { name, content };
    document.getElementById("previewTitle").textContent = name;
    document.getElementById("previewContent").textContent = content;
    openWindow("documentPreview");
}

function downloadDocument() {
    if (!previewedDocument) return;
    const blob = new Blob([previewedDocument.content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = previewedDocument.name;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast(`${previewedDocument.name} downloaded`);
}

function print(text) { const line = document.createElement("div"); line.innerHTML = text; terminalOutput.appendChild(line); terminalOutput.scrollTop = terminalOutput.scrollHeight; }
commandInput.addEventListener("keydown", event => { if (event.key !== "Enter") return; const command = commandInput.value.trim(); print(`<span class="prompt">user@nova:${currentDirectory}$</span> ${escapeHTML(command)}`); commandInput.value = ""; if (command) runCommand(command); });

function runCommand(command) {
    const normalizedCommand = command.replace(/^\$\s*/, "");
    const parts = normalizedCommand.match(/(?:[^\s"]+|"[^"]*")+/g) || []; const cmd = parts[0]; const args = parts.slice(1).map(arg => arg.replace(/^"|"$/g, ""));
    switch (cmd) {
        case "help": print("<b>help</b>  show commands<br><b>ls</b>  list files<br><b>cd</b>  change directory<br><b>pwd</b>  show path<br><b>mkdir</b>  create folder<br><b>touch</b>  create file<br><b>cat</b>  read file<br><b>echo</b>  print text<br><b>game</b>  open Nova Mines<br><b>clear</b>  clear terminal<br><b>neofetch</b>  system info<br><b>sudo</b>  run a simulated admin command<br><b>apt</b>  show package actions<br><b>reboot</b>  restart Nova"); break;
        case "clear": terminalOutput.innerHTML = ""; break;
        case "ls": listFiles(); break;
        case "pwd": print("/home/user" + (currentDirectory === "~" ? "" : "/" + currentDirectory)); break;
        case "whoami": print("user"); break;
        case "uname": print("NovaLinux 2.4.0 x86_64"); break;
        case "date": print(new Date().toString()); break;
        case "echo": print(escapeHTML(args.join(" "))); break;
        case "youtube": openWindow("youtube"); break;
        case "chrome": openWindow("chrome"); break;
        case "google": if (args[0] && args[0].toLowerCase() === "chrome") openWindow("chrome"); else print(`${escapeHTML(cmd)}: command not found`); break;
        case "nova": if (args[0] && args[0].toLowerCase() === "mines") openWindow("game"); else print(`${escapeHTML(cmd)}: command not found`); break;
        case "game": openWindow("game"); break;
        case "memory": if (!args.length || args[0].toLowerCase() === "match") { openWindow("game"); setGameMode("memory"); } else print(`${escapeHTML(cmd)}: command not found`); break;
        case "dash": if (!args.length || args[0].toLowerCase() === "geometry") { openWindow("game"); setGameMode("dash"); } else print(`${escapeHTML(cmd)}: command not found`); break;
        case "open": openCommand(args); break;
        case "mkdir": makeDirectory(args[0]); break;
        case "touch": makeFile(args[0]); break;
        case "cat": readFile(args[0]); break;
        case "cd": changeDirectory(args[0]); break;
        case "neofetch": neofetch(); break;
        case "sudo": runSudo(args); break;
        case "apt": print("apt: simulated package manager. Try <b>sudo apt update</b> or <b>sudo apt install &lt;package&gt;</b>"); break;
        case "reboot": location.reload(); break;
        default: print(`${escapeHTML(cmd)}: command not found`);
    }
}
function openCommand(args) {
    if (args.length === 1 && args[0].toLowerCase() === "youtube") return openWindow("youtube");
    if (args.length === 1 && args[0].toLowerCase() === "chrome") return openWindow("chrome");
    if (args.length === 1 && args[0].toLowerCase() === "game") return openWindow("game");
    if (args.length === 1 && args[0].toLowerCase() === "memory") { openWindow("game"); return setGameMode("memory"); }
    if (args.length === 1 && args[0].toLowerCase() === "dash") { openWindow("game"); return setGameMode("dash"); }
    print(`open: ${escapeHTML(args.join(" ") || "missing target")}: not available in this simulation`);
}
function openExternal(url) {
    window.open(url, "_blank", "noopener,noreferrer");
    print(`Opening <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}
function runSudo(args) {
    if (!args.length) return print("usage: sudo &lt;command&gt;");
    const adminCommand = args[0];
    if (adminCommand === "whoami") return print("root");
    if (adminCommand === "youtube") return openWindow("youtube");
    if (adminCommand === "chrome") return openWindow("chrome");
    if (adminCommand === "game") return openWindow("game");
    if (adminCommand === "memory") { openWindow("game"); return setGameMode("memory"); }
    if (adminCommand === "dash") { openWindow("game"); return setGameMode("dash"); }
    if (adminCommand === "nova" && args[1] && args[1].toLowerCase() === "mines") return openWindow("game");
    if (adminCommand === "google" && args[1] && args[1].toLowerCase() === "chrome") return openWindow("chrome");
    if (adminCommand === "open" && args[1] && args[1].toLowerCase() === "youtube") return openWindow("youtube");
    if (adminCommand === "open" && args[1] && args[1].toLowerCase() === "chrome") return openWindow("chrome");
    if (adminCommand === "apt" && args[1] === "update") return print("[sudo] password for user: <span style=\"color:#86c7a9\">••••••••</span><br>Reading package lists... Done<br>Nova package sources are up to date.");
    if (adminCommand === "apt" && args[1] === "install") return print(`Preparing to install ${escapeHTML(args[2] || "a package")}...<br>Installed successfully in the Nova simulation.`);
    if (adminCommand === "shutdown") return print("shutdown: admin request accepted. Nova stays running in the browser.");
    if (adminCommand === "reboot") return location.reload();
    return print(`sudo: ${escapeHTML(adminCommand)}: command is not available in this simulation`);
}
function listFiles() { const directory = files[currentDirectory]; const names = Object.keys(directory); print(names.length ? names.map(name => typeof directory[name] === "object" ? `<span style="color:#efbd68">${escapeHTML(name)}/</span>` : escapeHTML(name)).join("    ") : "(empty)"); }
function makeDirectory(name) { if (!name) return print("mkdir: missing directory name"); const directory = files[currentDirectory]; if (directory[name]) return print(`mkdir: ${escapeHTML(name)} already exists`); directory[name] = {}; renderFileManager(); print(`Created directory: ${escapeHTML(name)}`); }
function makeFile(name) { if (!name) return print("touch: missing file name"); const directory = files[currentDirectory]; if (directory[name]) return print(`touch: ${escapeHTML(name)} already exists`); directory[name] = ""; renderFileManager(); print(`Created file: ${escapeHTML(name)}`); }
function readFile(name) { if (!name) return print("cat: missing file name"); const directory = files[currentDirectory]; if (!(name in directory)) return print(`cat: ${escapeHTML(name)}: No such file`); if (typeof directory[name] === "object") return print(`cat: ${escapeHTML(name)}: Is a directory`); print(escapeHTML(directory[name])); }
function changeDirectory(name) { if (!name || name === "~" || name === "..") { currentDirectory = "~"; } else if (files[currentDirectory][name] && typeof files[currentDirectory][name] === "object") { files[name] = files[currentDirectory][name]; currentDirectory = name; } else { print(`cd: ${escapeHTML(name)}: No such directory`); return; } pathLabel.textContent = currentDirectory; }
function neofetch() { print(`<pre>        .--.       <br>       |o_o |      <br>       |:_/ |      <br>      //   \\ \\     <br>     (|     | )    <br>    /'\\_   _/\`\\   <br>    \\___)=(___/    <br><br>OS:       Nova Linux<br>Kernel:   Nova 2.4.0<br>Shell:    Nova Shell<br>Arch:     x86_64<br>User:     user</pre>`); }
function escapeHTML(text) { return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }