const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- AUDIO SINTETIZZATO (Zero file esterni necessari) ---
const AudioSys = {
    ctx: null,
    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },
    play(freq, type, duration, slideTo = null) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    jump() { this.play(260, 'square', 0.18, 580); },
    coin() { this.play(987, 'sine', 0.08); setTimeout(() => this.play(1318, 'sine', 0.18), 70); },
    stomp() { this.play(180, 'sawtooth', 0.15, 60); },
    powerup() { this.play(330, 'triangle', 0.35, 880); },
    hurt() { this.play(220, 'sawtooth', 0.35, 55); },
    win() { [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => this.play(f, 'square', 0.15), i * 110)); }
};

// --- DEFINIZIONE PERSONAGGI GIOCABILI ---
const CHARACTERS = {
    balanced: {
        name: "LEO",
        speed: 4.6,
        jumpForce: -12.8,
        gravity: 0.55,
        width: 30,
        height: 42,
        hatColor: "#e63946",
        shirtColor: "#e63946",
        pantsColor: "#1d3557",
        hairColor: "#4a2c11",
        doubleJump: false
    },
    jumper: {
        name: "MIA",
        speed: 4.8,
        jumpForce: -14.2,
        gravity: 0.50,
        width: 28,
        height: 44,
        hatColor: "#2a9d8f",
        shirtColor: "#2a9d8f",
        pantsColor: "#264653",
        hairColor: "#e9c46a",
        doubleJump: true // Può fare il doppio salto!
    },
    speedster: {
        name: "KAI",
        speed: 6.4,
        jumpForce: -12.0,
        gravity: 0.58,
        width: 28,
        height: 40,
        hatColor: "#f4a261",
        shirtColor: "#f4a261",
        pantsColor: "#e76f51",
        hairColor: "#111111",
        doubleJump: false
    },
    tank: {
        name: "REX",
        speed: 3.7,
        jumpForce: -13.3,
        gravity: 0.62,
        width: 36,
        height: 46,
        hatColor: "#8338ec",
        shirtColor: "#8338ec",
        pantsColor: "#3a0ca3",
        hairColor: "#6c757d",
        doubleJump: false
    }
};

// --- MAPPE E MONDI ---
// Legenda caratteri mappa:
// '#' = Terreno/Mattone solido
// '?' = Blocco Sorpresa (Moneta o Power-up)
// 'B' = Blocco Distruttibile
// 'P' = Tubo/Ostacolo alto
// 'C' = Moneta
// 'E' = Nemico Camminatore (Tipo Fungetto/Blob)
// 'S' = Nemico Corazzato con Aculei (Non saltarci sopra!)
// 'F' = Nemico Volante (Pipistrello/Spettro oscillante)
// 'J' = Nemico Saltatore (Rana/Molleggio)
// 'L' = Lava / Fossa mortale
// 'G' = Bandiera Fine Livello

const LEVELS = [
    {
        id: "1-1",
        name: "Mondo 1-1: Prateria Verde",
        theme: { skyTop: "#3a86ff", skyBottom: "#a8dadc", ground: "#38b000", dirt: "#7f4f24", block: "#e09f3e" },
        map: [
            "                                                                                                    ",
            "                                                                                                    ",
            "                                                                                                    ",
            "                                              C C C                                                 ",
            "                                            #########                                               ",
            "                      ?   ?                                      ?                                  ",
            "                                    C C                     ###########                             ",
            "                ?   ###?###       #######                                            C C            ",
            "                                                        F                         #######           ",
            "        C C                                                                                     G   ",
            "       #####             E                  E   S               J           E    S              #   ",
            "###################################   #################################   ##########################",
            "###################################LLL#################################LLL##########################"
        ]
    },
    {
        id: "1-2",
        name: "Mondo 1-2: Colline Sospese",
        theme: { skyTop: "#4ea8de", skyBottom: "#caf0f8", ground: "#52b788", dirt: "#6f4518", block: "#f77f00" },
        map: [
            "                                                                                                          ",
            "                                                                      C C C                               ",
            "                                                 F                  #########                             ",
            "                                    C C                                                                   ",
            "                        ?         #######               ?   ?                        C C                  ",
            "                    #########                                                     #########               ",
            "            C C                                     #############                                         ",
            "          #######                         J                                   F                       G   ",
            "                                      #########                       S                           #####   ",
            "                 E                                       E        #########                               ",
            "################################   ################   #######                   ##########################",
            "################################LLL################LLL#######LLLLLLLLLLLLLLLLLLL##########################"
        ]
    },
    {
        id: "2-1",
        name: "Mondo 2-1: Dune del Deserto",
        theme: { skyTop: "#f77f00", skyBottom: "#fcbf49", ground: "#e9c46a", dirt: "#bc6c25", block: "#d62828" },
        map: [
            "                                                                                                              ",
            "                                                                                                              ",
            "                                                                      ?   ?   ?                               ",
            "                                                C C                                                           ",
            "                                              #######             #################                           ",
            "                        ?                                                                    C C C            ",
            "                    #########                                                              #########          ",
            "                                     S                   F                     J                              ",
            "            E                    #########                                 #########                      G   ",
            "        #########                                   E         S                                        ###### ",
            "#####################       ###################   #################   ########################################",
            "#####################LLLLLLL###################LLL#################LLL########################################"
        ]
    },
    {
        id: "2-2",
        name: "Mondo 2-2: Tempio Antico",
        theme: { skyTop: "#9b2226", skyBottom: "#ee9b00", ground: "#ca6702", dirt: "#5f0f40", block: "#bb3e03" },
        map: [
            "                                                                                                                ",
            "                                                         C C C                                                  ",
            "                                                       #########                                                ",
            "                                        ?                                     F                                 ",
            "                            C C       #####                       ?                       C C                   ",
            "                          #######                             #########                 #######                 ",
            "                  F                                   J                                                         ",
            "              #######                             #########             S       S                           G   ",
            "                                        E                               #############                    ###### ",
            "        S                           #########                                                                   ",
            "#################   ###########                     #####################           ############################",
            "#################LLL###########LLLLLLLLLLLLLLLLLLLLL#####################LLLLLLLLLLL############################"
        ]
    },
    {
        id: "3-1",
        name: "Mondo 3-1: Fortezza Oscura",
        theme: { skyTop: "#10002b", skyBottom: "#3c096c", ground: "#4a4e69", dirt: "#22223b", block: "#9d4edd" },
        map: [
            "                                                                                                                  ",
            "                                                                              C C C                               ",
            "                                                  F                         #########                             ",
            "                                      ?                                                                           ",
            "                          C C       #####                   S       S                       ?                     ",
            "                        #######                         #################               #########                 ",
            "                J                                                                                                 ",
            "            #########                       F                                   J                             G   ",
            "                                        #########                           #########                      ###### ",
            "        E           S                                           E   S                                             ",
            "#########################   #####################   #########################       ##############################",
            "#########################LLL#####################LLL#########################LLLLLLL##############################"
        ]
    },
    {
        id: "3-2",
        name: "Mondo 3-2: Cuore del Vulcano",
        theme: { skyTop: "#370617", skyBottom: "#9d0208", ground: "#2b2d42", dirt: "#14141f", block: "#f48c06" },
        map: [
            "                                                                                                                      ",
            "                                                                                          C C C                       ",
            "                                                              F                         #########                     ",
            "                                                  ?                                                                   ",
            "                                      C C       #####                   J       J                                     ",
            "                          F         #######                         #################               ?                 ",
            "                      #######                                                                   #########             ",
            "              S                                         S       S                                                 G   ",
            "          #########                                 #################                       S                  ###### ",
            "                                        E                                               #########                     ",
            "#################       #########################                       #############           ######################",
            "#################LLLLLLL#########################LLLLLLLLLLLLLLLLLLLLLLL#############LLLLLLLLLLL######################"
        ]
    }
];

// --- STATO GLOBALE DEL GIOCO ---
const TILE_SIZE = 44;
let selectedCharKey = 'balanced';
let currentLevelIdx = 0;
let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER, VICTORY
let score = 0;
let coins = 0;
let lives = 3;
let cameraX = 0;
let particles = [];

let player = null;
let tiles = [];
let enemies = [];
let collectibles = [];
let goalFlag = null;
let levelWidth = 0;

// Input da tastiera
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (gameState === 'PLAYING') {
        if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !e.repeat) {
            player.jump();
        }
        if (e.code === 'KeyR') {
            loadLevel(currentLevelIdx);
        }
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

// --- CLASSI ENTITÀ ---
class Player {
    constructor(x, y, charKey) {
        const stats = CHARACTERS[charKey];
        this.charKey = charKey;
        this.name = stats.name;
        this.x = x;
        this.y = y;
        this.w = stats.width;
        this.h = stats.height;
        this.vx = 0;
        this.vy = 0;
        this.speed = stats.speed;
        this.jumpForce = stats.jumpForce;
        this.gravity = stats.gravity;
        this.stats = stats;
        this.grounded = false;
        this.jumpsLeft = stats.doubleJump ? 2 : 1;
        this.facing = 1;
        this.invulnTimer = 0;
        this.poweredUp = false;
        this.animFrame = 0;
    }

    jump() {
        if (this.grounded || this.jumpsLeft > 0) {
            this.vy = this.jumpForce;
            this.grounded = false;
            this.jumpsLeft--;
            AudioSys.jump();
            spawnParticles(this.x + this.w / 2, this.y + this.h, '#ffffff', 6);
        }
    }

    update() {
        if (this.invulnTimer > 0) this.invulnTimer--;

        // Movimento orizzontale
        if (keys['ArrowLeft'] || keys['KeyA']) {
            this.vx = -this.speed;
            this.facing = -1;
            this.animFrame += 0.2;
        } else if (keys['ArrowRight'] || keys['KeyD']) {
            this.vx = this.speed;
            this.facing = 1;
            this.animFrame += 0.2;
        } else {
            this.vx *= 0.78;
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
            this.animFrame = 0;
        }

        // Applica X e collisioni orizzontali
        this.x += this.vx;
        if (this.x < 0) this.x = 0;
        this.checkTileCollisions('x');

        // Applica gravità e Y
        this.vy += this.gravity;
        if (this.vy > 15) this.vy = 15;
        this.y += this.vy;
        this.grounded = false;
        this.checkTileCollisions('y');

        if (this.grounded) {
            this.jumpsLeft = this.stats.doubleJump ? 2 : 1;
        }

        // Caduta nel vuoto
        if (this.y > canvas.height + 60) {
            this.takeDamage(true);
        }
    }

    checkTileCollisions(axis) {
        for (let t of tiles) {
            if (rectIntersect(this, t)) {
                if (t.type === 'L') {
                    this.takeDamage(true);
                    return;
                }
                if (axis === 'x') {
                    if (this.vx > 0) this.x = t.x - this.w;
                    else if (this.vx < 0) this.x = t.x + t.w;
                    this.vx = 0;
                } else {
                    if (this.vy > 0) {
                        this.y = t.y - this.h;
                        this.vy = 0;
                        this.grounded = true;
                    } else if (this.vy < 0) {
                        this.y = t.y + t.h;
                        this.vy = 0;
                        if (t.type === '?' && !t.used) {
                            t.used = true;
                            AudioSys.powerup();
                            coins++;
                            score += 200;
                            this.poweredUp = true;
                            spawnParticles(t.x + t.w / 2, t.y, '#ffd166', 12);
                            updateHUD();
                        }
                    }
                }
            }
        }
    }

    takeDamage(instantDeath = false) {
        if (this.invulnTimer > 0 && !instantDeath) return;

        if (this.poweredUp && !instantDeath) {
            this.poweredUp = false;
            this.invulnTimer = 90;
            AudioSys.hurt();
            spawnParticles(this.x + this.w / 2, this.y + this.h / 2, '#ff595e', 12);
            return;
        }

        AudioSys.hurt();
        lives--;
        updateHUD();
        if (lives <= 0) {
            endGame(false);
        } else {
            loadLevel(currentLevelIdx);
        }
    }

    draw() {
        if (this.invulnTimer > 0 && Math.floor(this.invulnTimer / 5) % 2 === 0) return;

        ctx.save();
        const drawX = Math.floor(this.x - cameraX);
        const drawY = Math.floor(this.y);
        const scale = this.poweredUp ? 1.12 : 1.0;

        ctx.translate(drawX + this.w / 2, drawY + this.h);
        ctx.scale(this.facing * scale, scale);

        // Gambe animate
        const legOffset = this.grounded ? Math.sin(this.animFrame) * 4 : 3;
        ctx.fillStyle = this.stats.pantsColor;
        ctx.fillRect(-this.w / 2 + 3, -14 + legOffset, 10, 14);
        ctx.fillRect(this.w / 2 - 13, -14 - legOffset, 10, 14);

        // Busto
        ctx.fillStyle = this.stats.shirtColor;
        ctx.fillRect(-this.w / 2 + 2, -28, this.w - 4, 16);

        // Testa
        ctx.fillStyle = "#ffcdb2";
        ctx.fillRect(-this.w / 2 + 4, -40, this.w - 8, 13);

        // Occhio
        ctx.fillStyle = "#000";
        ctx.fillRect(4, -36, 3, 4);

        // Cappello / Casco distintivo
        ctx.fillStyle = this.stats.hatColor;
        ctx.fillRect(-this.w / 2 + 2, -44, this.w - 2, 6);
        ctx.fillRect(0, -41, this.w / 2 + 4, 3); // Visiera

        // Aura se potenziato
        if (this.poweredUp) {
            ctx.strokeStyle = "#ffd166";
            ctx.lineWidth = 2;
            ctx.strokeRect(-this.w / 2, -this.h, this.w, this.h);
        }

        ctx.restore();
    }
}

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.startY = y;
        this.type = type; // 'E' (Camminatore), 'S' (Aculei), 'F' (Volante), 'J' (Saltatore)
        this.w = 34;
        this.h = 34;
        this.vx = type === 'F' ? -1.8 : -1.5;
        this.vy = 0;
        this.alive = true;
        this.timer = Math.random() * 100;
    }

    update() {
        if (!this.alive) return;
        this.timer += 0.06;

        if (this.type === 'F') {
            // Nemico Volante: movimento sinusoidale
            this.x += this.vx;
            this.y = this.startY + Math.sin(this.timer * 1.5) * 45;
            if (this.x < 50 || this.x > levelWidth - 100) this.vx *= -1;
        } else {
            // Nemici terrestri
            this.x += this.vx;

            // Controllo muri e baratri
            let hitWall = false;
            for (let t of tiles) {
                if (t.type !== 'L' && rectIntersect(this, t)) {
                    if (this.vx > 0) this.x = t.x - this.w;
                    else this.x = t.x + t.w;
                    hitWall = true;
                }
            }
            if (hitWall || this.x <= 0) this.vx *= -1;

            // Salto periodico per tipo 'J'
            if (this.type === 'J' && Math.abs(this.vy) < 0.1 && Math.sin(this.timer) > 0.95) {
                this.vy = -10.5;
            }

            this.vy += 0.55;
            this.y += this.vy;

            for (let t of tiles) {
                if (t.type !== 'L' && rectIntersect(this, t)) {
                    if (this.vy > 0) {
                        this.y = t.y - this.h;
                        this.vy = 0;
                    }
                }
            }
        }

        // Collisione col Giocatore
        if (rectIntersect(player, this)) {
            const isStomping = player.vy > 0 && (player.y + player.h - player.vy) <= this.y + 14;

            if (isStomping && this.type !== 'S') {
                // Schiacciato!
                this.alive = false;
                player.vy = -9.5;
                score += 150;
                AudioSys.stomp();
                spawnParticles(this.x + this.w / 2, this.y + this.h / 2, '#ffbe0b', 10);
                updateHUD();
            } else {
                // Il nemico ferisce il giocatore (anche se salti sopra 'S' con gli aculei!)
                player.takeDamage();
            }
        }
    }

    draw() {
        if (!this.alive) return;
        const dx = Math.floor(this.x - cameraX);
        const dy = Math.floor(this.y);
        if (dx < -50 || dx > canvas.width + 50) return;

        ctx.save();
        if (this.type === 'E') {
            // Design 1: Blob Fungo Viola-Marrone
            ctx.fillStyle = "#6d597a";
            ctx.beginPath();
            ctx.arc(dx + 17, dy + 16, 16, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = "#e56b6f";
            ctx.fillRect(dx + 7, dy + 16, 20, 14);
            // Occhi arrabbiati
            ctx.fillStyle = "#fff";
            ctx.fillRect(dx + 9, dy + 18, 5, 5);
            ctx.fillRect(dx + 20, dy + 18, 5, 5);
        } else if (this.type === 'S') {
            // Design 2: Guscio Corazzato Rosso con Aculei
            ctx.fillStyle = "#d90429";
            ctx.beginPath();
            ctx.arc(dx + 17, dy + 22, 16, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(dx + 1, dy + 22, 32, 10);
            // Aculei bianchi sopra
            ctx.fillStyle = "#ffffff";
            for (let i = 4; i <= 24; i += 10) {
                ctx.beginPath();
                ctx.moveTo(dx + i, dy + 10);
                ctx.lineTo(dx + i + 4, dy - 2);
                ctx.lineTo(dx + i + 8, dy + 10);
                ctx.fill();
            }
        } else if (this.type === 'F') {
            // Design 3: Spettro / Pipistrello Alato Ciano
            ctx.fillStyle = "#3a0ca3";
            ctx.beginPath();
            ctx.arc(dx + 17, dy + 17, 14, 0, Math.PI * 2);
            ctx.fill();
            // Ali animate
            const wingY = Math.sin(this.timer * 6) * 8;
            ctx.fillStyle = "#7209b7";
            ctx.fillRect(dx - 8, dy + 10 + wingY, 12, 8);
            ctx.fillRect(dx + 30, dy + 10 + wingY, 12, 8);
            // Occhi luminosi
            ctx.fillStyle = "#ffbe0b";
            ctx.fillRect(dx + 10, dy + 13, 4, 4);
            ctx.fillRect(dx + 20, dy + 13, 4, 4);
        } else if (this.type === 'J') {
            // Design 4: Rana / Molla Verde Acido
            ctx.fillStyle = "#38b000";
            ctx.fillRect(dx + 3, dy + 8, 28, 26);
            ctx.fillStyle = "#ccff33";
            ctx.fillRect(dx + 6, dy + 2, 8, 8);
            ctx.fillRect(dx + 20, dy + 2, 8, 8);
            ctx.fillStyle = "#000";
            ctx.fillRect(dx + 8, dy + 4, 4, 4);
            ctx.fillRect(dx + 22, dy + 4, 4, 4);
        }
        ctx.restore();
    }
}

// --- FUNZIONI DI UTILITÀ E CARICAMENTO ---
function rectIntersect(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.8) * 6,
            life: 25 + Math.random() * 15,
            color
        });
    }
}

function loadLevel(idx) {
    currentLevelIdx = idx;
    const lvl = LEVELS[idx];
    tiles = [];
    enemies = [];
    collectibles = [];
    particles = [];
    goalFlag = null;
    cameraX = 0;

    const rows = lvl.map.length;
    const cols = lvl.map[0].length;
    levelWidth = cols * TILE_SIZE;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const ch = lvl.map[r][c];
            const x = c * TILE_SIZE;
            const y = r * TILE_SIZE;

            if (ch === '#' || ch === '?' || ch === 'L') {
                tiles.push({ x, y, w: TILE_SIZE, h: TILE_SIZE, type: ch, used: false, isTop: r > 0 && lvl.map[r - 1][c] !== '#' });
            } else if (ch === 'C') {
                collectibles.push({ x: x + 12, y: y + 12, w: 20, h: 20, collected: false });
            } else if (ch === 'E' || ch === 'S' || ch === 'F' || ch === 'J') {
                enemies.push(new Enemy(x, y + (TILE_SIZE - 34), ch));
            } else if (ch === 'G') {
                goalFlag = { x: x + 10, y: y - 80, w: 24, h: 124 };
            }
        }
    }

    const oldPower = player ? player.poweredUp : false;
    player = new Player(80, 200, selectedCharKey);
    player.poweredUp = oldPower;
    updateHUD();
}

function updateHUD() {
    document.getElementById('hud-char').textContent = CHARACTERS[selectedCharKey].name;
    document.getElementById('hud-level').textContent = LEVELS[currentLevelIdx].id;
    document.getElementById('hud-coins').textContent = coins;
    document.getElementById('hud-lives').textContent = lives;
    document.getElementById('hud-score').textContent = score;
}

function endGame(victory) {
    gameState = victory ? 'VICTORY' : 'GAMEOVER';
    document.getElementById('hud').classList.add('hidden');
    const endScreen = document.getElementById('end-screen');
    endScreen.classList.remove('hidden');
    document.getElementById('end-title').textContent = victory ? "HAI COMPLETATO TUTTI I MONDI!" : "GAME OVER";
    document.getElementById('end-title').style.color = victory ? "#06d6a0" : "#ef476f";
    document.getElementById('end-stats').textContent = `Punteggio Finale: ${score} • Monete Raccolte: ${coins}`;
}

// --- LOOP PRINCIPALE ---
function update() {
    if (gameState !== 'PLAYING') return;

    player.update();

    // Telecamera fluida centrata sul giocatore
    const targetCamX = player.x - canvas.width * 0.35;
    cameraX += (targetCamX - cameraX) * 0.12;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > levelWidth - canvas.width) cameraX = levelWidth - canvas.width;

    // Aggiorna nemici
    enemies.forEach(e => e.update());

    // Raccolta monete
    collectibles.forEach(c => {
        if (!c.collected && rectIntersect(player, c)) {
            c.collected = true;
            coins++;
            score += 100;
            AudioSys.coin();
            spawnParticles(c.x + 10, c.y + 10, '#ffd166', 6);
            if (coins % 30 === 0) {
                lives++;
                AudioSys.powerup();
            }
            updateHUD();
        }
    });

    // Controllo Bandiera Fine Livello
    if (goalFlag && rectIntersect(player, goalFlag)) {
        AudioSys.win();
        score += 500;
        if (currentLevelIdx + 1 < LEVELS.length) {
            loadLevel(currentLevelIdx + 1);
        } else {
            endGame(true);
        }
    }

    // Particelle
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function draw() {
    const lvl = LEVELS[currentLevelIdx];

    // Sfondo gradiente del Mondo
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, lvl.theme.skyTop);
    grad.addColorStop(1, lvl.theme.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Montagne/Nuvolette decorative in parallasse
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    for (let i = 0; i < 15; i++) {
        const bgX = (i * 280) - (cameraX * 0.25);
        ctx.beginPath();
        ctx.arc(bgX, 460, 110, Math.PI, 0);
        ctx.fill();
    }

    // Disegna Blocchi e Terreno
    for (let t of tiles) {
        const dx = Math.floor(t.x - cameraX);
        if (dx < -TILE_SIZE || dx > canvas.width) continue;

        if (t.type === '#') {
            ctx.fillStyle = lvl.theme.dirt;
            ctx.fillRect(dx, t.y, t.w, t.h);
            if (t.isTop) {
                ctx.fillStyle = lvl.theme.ground;
                ctx.fillRect(dx, t.y, t.w, 10);
            }
            ctx.strokeStyle = "rgba(0,0,0,0.2)";
            ctx.strokeRect(dx, t.y, t.w, t.h);
        } else if (t.type === '?') {
            ctx.fillStyle = t.used ? "#6c757d" : lvl.theme.block;
            ctx.fillRect(dx, t.y, t.w, t.h);
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.strokeRect(dx, t.y, t.w, t.h);
            if (!t.used) {
                ctx.fillStyle = "#fff";
                ctx.font = "bold 24px sans-serif";
                ctx.fillText("?", dx + 15, t.y + 31);
            }
        } else if (t.type === 'L') {
            ctx.fillStyle = "#ff4d00";
            ctx.fillRect(dx, t.y + 8, t.w, t.h - 8);
            ctx.fillStyle = "#ffbe0b";
            ctx.fillRect(dx, t.y + 8, t.w, 6);
        }
    }

    // Monete
    collectibles.forEach(c => {
        if (c.collected) return;
        const dx = Math.floor(c.x - cameraX);
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.ellipse(dx + 10, c.y + 10, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#e09f3e";
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Bandiera Traguardo
    if (goalFlag) {
        const dx = Math.floor(goalFlag.x - cameraX);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(dx + 8, goalFlag.y, 6, goalFlag.h);
        ctx.fillStyle = "#06d6a0";
        ctx.beginPath();
        ctx.moveTo(dx + 14, goalFlag.y + 6);
        ctx.lineTo(dx + 54, goalFlag.y + 24);
        ctx.lineTo(dx + 14, goalFlag.y + 42);
        ctx.fill();
    }

    // Nemici & Giocatore
    enemies.forEach(e => e.draw());
    if (player) player.draw();

    // Particelle
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - cameraX, p.y, 5, 5);
    });
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// --- INIZIALIZZAZIONE INTERFACCIA MENU ---
const levelSelect = document.getElementById('level-select');
LEVELS.forEach((lvl, index) => {
    const opt = document.createElement('option');
    opt.value = index;
    opt.textContent = lvl.name;
    levelSelect.appendChild(opt);
});

document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedCharKey = card.dataset.char;
    });
});

document.getElementById('start-btn').addEventListener('click', () => {
    AudioSys.init();
    score = 0;
    coins = 0;
    lives = 3;
    const chosenLvl = parseInt(levelSelect.value, 10);
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    gameState = 'PLAYING';
    loadLevel(chosenLvl);
});

document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    gameState = 'MENU';
});

// Avvio rendering iniziale
loadLevel(0);
gameLoop();