const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Mostra la versione corrente in basso a destra nel menu
const versionBadge = document.getElementById('version-badge');
if (versionBadge && typeof GAME_VERSION !== 'undefined') {
    versionBadge.textContent = `Build ${GAME_VERSION}`;
}

// --- AUDIO SINTETIZZATO ---
const AudioSys = {
    ctx: null,
    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    play(freq, type, duration, slideTo = null, vol = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    jump() { this.play(280, 'sine', 0.2, 620, 0.14); },
    coin() { this.play(987, 'sine', 0.08); setTimeout(() => this.play(1318, 'sine', 0.18), 70); },
    stomp() { this.play(190, 'triangle', 0.16, 65, 0.15); },
    powerup() { this.play(350, 'sine', 0.35, 920, 0.14); },
    hurt() { this.play(220, 'sawtooth', 0.32, 60, 0.1); },
    dance(charKey) {
        if (charKey === 'fox') { this.play(523, 'sine', 0.1); setTimeout(() => this.play(659, 'sine', 0.15), 90); }
        if (charKey === 'rabbit') { this.play(600, 'sine', 0.09, 900); setTimeout(() => this.play(650, 'sine', 0.12, 980), 120); }
        if (charKey === 'cheetah') { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.play(f, 'triangle', 0.07), i * 50)); }
        if (charKey === 'bear') { this.play(160, 'triangle', 0.14, 110, 0.16); setTimeout(() => this.play(196, 'triangle', 0.18, 130, 0.16), 130); }
    },
    win() { [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => this.play(f, 'sine', 0.16, null, 0.14), i * 110)); }
};

// --- DEFINIZIONE PERSONAGGI ANIMALI ---
const CHARACTERS = {
    fox: {
        name: "VOLPE",
        speed: 4.7,
        jumpForce: -12.8,
        gravity: 0.54,
        width: 32,
        height: 42,
        mainColor: "#f77f00",
        bellyColor: "#fff3e0",
        accentColor: "#2b2d42",
        doubleJump: false
    },
    rabbit: {
        name: "CONIGLIO",
        speed: 4.8,
        jumpForce: -14.2,
        gravity: 0.50,
        width: 30,
        height: 44,
        mainColor: "#f8f9fa",
        bellyColor: "#ffccd5",
        accentColor: "#ff758f",
        doubleJump: true
    },
    cheetah: {
        name: "GHEPARDO",
        speed: 6.5,
        jumpForce: -12.1,
        gravity: 0.56,
        width: 32,
        height: 40,
        mainColor: "#fcbf49",
        bellyColor: "#fefae0",
        accentColor: "#3d2c2e",
        doubleJump: false
    },
    bear: {
        name: "ORSO",
        speed: 3.8,
        jumpForce: -13.4,
        gravity: 0.60,
        width: 38,
        height: 46,
        mainColor: "#7f4f24",
        bellyColor: "#ddb892",
        accentColor: "#432818",
        doubleJump: false
    }
};

// --- DISEGNO MORBIDO DEI PERSONAGGI ANIMALI ---
function drawAnimalSprite(ctx, charKey, x, y, w, h, facing, animTime, isGrounded, isDancing = false, danceProgress = 0, poweredUp = false) {
    const stats = CHARACTERS[charKey];
    ctx.save();

    let offsetX = 0;
    let offsetY = 0;
    let rotation = 0;
    let scaleX = facing * (poweredUp ? 1.12 : 1);
    let scaleY = poweredUp ? 1.12 : 1;

    if (isDancing && danceProgress > 0) {
        const t = danceProgress * Math.PI * 2;
        if (charKey === 'fox') {
            offsetY = -Math.abs(Math.sin(t * 2)) * 12;
            rotation = Math.sin(t * 2) * 0.22;
        } else if (charKey === 'rabbit') {
            offsetY = -Math.abs(Math.sin(t * 2)) * 18;
            scaleX = Math.cos(t * 2) * (poweredUp ? 1.12 : 1);
        } else if (charKey === 'cheetah') {
            offsetX = Math.sin(t * 3) * 14;
            rotation = Math.cos(t * 3) * 0.25;
            scaleX = (Math.cos(t * 3) >= 0 ? 1 : -1) * (poweredUp ? 1.12 : 1);
        } else if (charKey === 'bear') {
            const bounce = Math.abs(Math.sin(t * 2));
            offsetY = -bounce * 10;
            scaleX = (1 + (1 - bounce) * 0.16) * facing;
            scaleY = 1 - (1 - bounce) * 0.14;
        }
    }

    ctx.translate(x + w / 2 + offsetX, y + h + offsetY);
    ctx.rotate(rotation);
    ctx.scale(scaleX, scaleY);

    const walkCycle = isDancing ? danceProgress * 18 : animTime;
    const legSwing = (!isGrounded && !isDancing) ? 4 : Math.sin(walkCycle) * 4.5;

    // 1. CODA
    ctx.save();
    const tailWag = Math.sin(walkCycle * 1.3) * 0.25;
    ctx.translate(-w * 0.35, -h * 0.32);
    ctx.rotate(tailWag);

    if (charKey === 'fox') {
        ctx.fillStyle = stats.mainColor;
        ctx.beginPath();
        ctx.ellipse(-10, -4, 13, 7, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(-18, -8, 6, 4.5, -0.4, 0, Math.PI * 2);
        ctx.fill();
    } else if (charKey === 'rabbit') {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-5, 0, 6.5, 0, Math.PI * 2);
        ctx.fill();
    } else if (charKey === 'cheetah') {
        ctx.strokeStyle = stats.mainColor;
        ctx.lineWidth = 4.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-14, -4, -18, -16);
        ctx.stroke();
    } else if (charKey === 'bear') {
        ctx.fillStyle = stats.accentColor;
        ctx.beginPath();
        ctx.arc(-4, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 2. ZAMPE
    ctx.fillStyle = stats.accentColor;
    ctx.beginPath();
    ctx.roundRect(-w * 0.32 + legSwing, -13, 10, 13, 5);
    ctx.roundRect(w * 0.05 - legSwing, -13, 10, 13, 5);
    ctx.fill();

    // 3. CORPO
    ctx.fillStyle = stats.mainColor;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.44, w * 0.44, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = stats.bellyColor;
    ctx.beginPath();
    ctx.ellipse(w * 0.12, -h * 0.42, w * 0.25, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    if (charKey === 'cheetah') {
        ctx.fillStyle = stats.accentColor;
        ctx.beginPath();
        ctx.arc(-6, -h * 0.48, 2.2, 0, Math.PI * 2);
        ctx.arc(-9, -h * 0.36, 2, 0, Math.PI * 2);
        ctx.arc(-2, -h * 0.55, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }

    // 4. ORECCHIE
    if (charKey === 'fox') {
        ctx.fillStyle = stats.mainColor;
        ctx.beginPath();
        ctx.moveTo(-9, -h * 0.78);
        ctx.quadraticCurveTo(-8, -h * 1.08, -1, -h * 0.84);
        ctx.moveTo(2, -h * 0.84);
        ctx.quadraticCurveTo(9, -h * 1.08, 10, -h * 0.78);
        ctx.fill();
    } else if (charKey === 'rabbit') {
        ctx.fillStyle = stats.mainColor;
        ctx.beginPath();
        ctx.ellipse(-5, -h * 1.02, 4.5, 13, -0.12, 0, Math.PI * 2);
        ctx.ellipse(4, -h * 1.02, 4.5, 13, 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = stats.bellyColor;
        ctx.beginPath();
        ctx.ellipse(-5, -h * 1.02, 2.2, 9, -0.12, 0, Math.PI * 2);
        ctx.ellipse(4, -h * 1.02, 2.2, 9, 0.12, 0, Math.PI * 2);
        ctx.fill();
    } else if (charKey === 'cheetah' || charKey === 'bear') {
        const earR = charKey === 'bear' ? 6.5 : 5;
        ctx.fillStyle = stats.mainColor;
        ctx.beginPath();
        ctx.arc(-8, -h * 0.86, earR, 0, Math.PI * 2);
        ctx.arc(7, -h * 0.86, earR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = stats.bellyColor;
        ctx.beginPath();
        ctx.arc(-8, -h * 0.86, earR * 0.5, 0, Math.PI * 2);
        ctx.arc(7, -h * 0.86, earR * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // 5. TESTA
    ctx.fillStyle = stats.mainColor;
    ctx.beginPath();
    ctx.ellipse(1, -h * 0.74, w * 0.42, h * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = stats.bellyColor;
    ctx.beginPath();
    ctx.ellipse(w * 0.24, -h * 0.69, w * 0.22, h * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = charKey === 'rabbit' ? "#ff758f" : "#1d1e2c";
    ctx.beginPath();
    ctx.arc(w * 0.38, -h * 0.71, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(w * 0.14, -h * 0.77, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(w * 0.16, -h * 0.785, 1.2, 0, Math.PI * 2);
    ctx.fill();

    if (poweredUp) {
        ctx.strokeStyle = "#ffd166";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.52, w * 0.6, h * 0.56, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

// --- MAPPE E MONDI ---
const LEVELS = [
    {
        id: "1-1",
        name: "Mondo 1-1: Prateria Soleggiata",
        bgStyle: "meadow",
        theme: { skyTop: "#38b6ff", skyBottom: "#caf0f8", ground: "#38b000", dirt: "#8d5524", block: "#f4a261" },
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
        name: "Mondo 1-2: Valle delle Cascate",
        bgStyle: "waterfall",
        theme: { skyTop: "#0096c7", skyBottom: "#ade8f4", ground: "#2b9348", dirt: "#6f4518", block: "#ff9f1c" },
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
        name: "Mondo 2-1: Dune e Piramidi",
        bgStyle: "desert",
        theme: { skyTop: "#f77f00", skyBottom: "#ffe599", ground: "#e9c46a", dirt: "#bc6c25", block: "#e76f51" },
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
        name: "Mondo 2-2: Tempio del Tramonto",
        bgStyle: "temple",
        theme: { skyTop: "#9b2226", skyBottom: "#f4a261", ground: "#ca6702", dirt: "#5f0f40", block: "#ee9b00" },
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
        name: "Mondo 3-1: Foresta Notturna",
        bgStyle: "night",
        theme: { skyTop: "#10002b", skyBottom: "#3c096c", ground: "#5a189a", dirt: "#240046", block: "#9d4edd" },
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
        name: "Mondo 3-2: Cratere Vulcanico",
        bgStyle: "volcano",
        theme: { skyTop: "#370617", skyBottom: "#d00000", ground: "#333533", dirt: "#1b1b1e", block: "#ffba08" },
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

function drawCustomBackground(lvl, camX) {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, lvl.theme.skyTop);
    grad.addColorStop(1, lvl.theme.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const style = lvl.bgStyle;

    if (style === 'meadow' || style === 'waterfall') {
        ctx.fillStyle = "rgba(255, 243, 176, 0.85)";
        ctx.beginPath();
        ctx.arc(800, 95, 48, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        for (let i = 0; i < 12; i++) {
            const cx = ((i * 310) - camX * 0.15) % 2400;
            const cy = 75 + (i % 3) * 35;
            ctx.beginPath();
            ctx.arc(cx, cy, 26, 0, Math.PI * 2);
            ctx.arc(cx + 24, cy - 8, 32, 0, Math.PI * 2);
            ctx.arc(cx + 52, cy, 24, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = style === 'meadow' ? "rgba(82, 183, 136, 0.45)" : "rgba(64, 145, 108, 0.5)";
        for (let i = 0; i < 16; i++) {
            const hx = (i * 260) - (camX * 0.25);
            ctx.beginPath();
            ctx.arc(hx, 520, 150, Math.PI, 0);
            ctx.fill();

            if (style === 'waterfall' && i % 2 === 0) {
                ctx.fillStyle = "rgba(144, 224, 239, 0.55)";
                ctx.beginPath();
                ctx.roundRect(hx - 18, 375, 36, 165, 12);
                ctx.fill();
                ctx.fillStyle = "rgba(64, 145, 108, 0.5)";
            }
        }
    } else if (style === 'desert') {
        ctx.fillStyle = "rgba(255, 250, 200, 0.7)";
        ctx.beginPath();
        ctx.arc(760, 110, 62, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(212, 163, 115, 0.55)";
        for (let i = 0; i < 10; i++) {
            const px = (i * 420) - (camX * 0.2);
            ctx.beginPath();
            ctx.moveTo(px - 130, 500);
            ctx.quadraticCurveTo(px, 230, px + 130, 500);
            ctx.fill();
        }

        ctx.fillStyle = "rgba(233, 196, 106, 0.65)";
        for (let i = 0; i < 15; i++) {
            const dx = (i * 300) - (camX * 0.35);
            ctx.beginPath();
            ctx.ellipse(dx, 510, 190, 90, 0, Math.PI, 0);
            ctx.fill();
        }
    } else if (style === 'temple') {
        ctx.fillStyle = "rgba(95, 15, 64, 0.35)";
        for (let i = 0; i < 18; i++) {
            const tx = (i * 220) - (camX * 0.25);
            ctx.beginPath();
            ctx.roundRect(tx, 160, 34, 380, 10);
            ctx.roundRect(tx - 10, 150, 54, 20, 8);
            ctx.fill();
        }
    } else if (style === 'night') {
        ctx.fillStyle = "#fdf0d5";
        ctx.beginPath();
        ctx.arc(810, 95, 42, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        for (let i = 0; i < 35; i++) {
            const sx = ((i * 197) - camX * 0.08) % 960;
            const sy = (i * 73) % 280;
            ctx.beginPath();
            ctx.arc(sx < 0 ? sx + 960 : sx, sy, (i % 2) + 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = "rgba(36, 0, 70, 0.65)";
        for (let i = 0; i < 16; i++) {
            const nx = (i * 240) - (camX * 0.28);
            ctx.beginPath();
            ctx.roundRect(nx, 240 + (i % 3) * 40, 65, 300, [32, 32, 0, 0]);
            ctx.fill();
        }
    } else if (style === 'volcano') {
        for (let i = 0; i < 10; i++) {
            const vx = (i * 380) - (camX * 0.22);
            ctx.fillStyle = "rgba(27, 27, 30, 0.65)";
            ctx.beginPath();
            ctx.moveTo(vx - 150, 540);
            ctx.lineTo(vx - 35, 230);
            ctx.lineTo(vx + 35, 230);
            ctx.lineTo(vx + 150, 540);
            ctx.fill();

            ctx.fillStyle = "rgba(255, 107, 0, 0.6)";
            ctx.beginPath();
            ctx.ellipse(vx, 232, 32, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// --- STATO GLOBALE DEL GIOCO ---
const TILE_SIZE = 44;
let selectedCharKey = 'fox';
let currentLevelIdx = 0;
let gameState = 'MENU';
let score = 0;
let coins = 0;
let lives = 3;
let cameraX = 0;
let particles = [];
let rafId = null;

let player = null;
let tiles = [];
let enemies = [];
let collectibles = [];
let goalFlag = null;
let levelWidth = 0;

const previewCanvases = document.querySelectorAll('.char-preview-canvas');
const danceTimers = { fox: 0, rabbit: 0, cheetah: 0, bear: 0 };
let menuTime = 0;

const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (gameState === 'PLAYING') {
        if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !e.repeat && player) {
            player.jump();
        }
        if (e.code === 'KeyR') {
            loadLevel(currentLevelIdx);
        }
    }
});
window.addEventListener('keyup', e => {
    keys[e.code] = false;
});

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
            spawnParticles(this.x + this.w / 2, this.y + this.h, '#ffffff', 7);
        }
    }

    update() {
        if (this.invulnTimer > 0) this.invulnTimer--;

        if (keys['ArrowLeft'] || keys['KeyA']) {
            this.vx = -this.speed;
            this.facing = -1;
            this.animFrame += 0.24;
        } else if (keys['ArrowRight'] || keys['KeyD']) {
            this.vx = this.speed;
            this.facing = 1;
            this.animFrame += 0.24;
        } else {
            this.vx *= 0.78;
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
            this.animFrame = 0;
        }

        this.x += this.vx;
        if (this.x < 0) this.x = 0;
        this.checkTileCollisions('x');

        this.vy += this.gravity;
        if (this.vy > 15) this.vy = 15;
        this.y += this.vy;
        this.grounded = false;
        this.checkTileCollisions('y');

        if (this.grounded) {
            this.jumpsLeft = this.stats.doubleJump ? 2 : 1;
        }

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
                            spawnParticles(t.x + t.w / 2, t.y, '#ffd166', 14);
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
        drawAnimalSprite(
            ctx,
            this.charKey,
            Math.floor(this.x - cameraX),
            Math.floor(this.y),
            this.w,
            this.h,
            this.facing,
            this.animFrame,
            this.grounded,
            false,
            0,
            this.poweredUp
        );
    }
}

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.startY = y;
        this.type = type;
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
            this.x += this.vx;
            this.y = this.startY + Math.sin(this.timer * 1.5) * 45;
            if (this.x < 50 || this.x > levelWidth - 100) this.vx *= -1;
        } else {
            this.x += this.vx;
            let hitWall = false;
            for (let t of tiles) {
                if (t.type !== 'L' && rectIntersect(this, t)) {
                    if (this.vx > 0) this.x = t.x - this.w;
                    else if (this.vx < 0) this.x = t.x + t.w;
                    hitWall = true;
                }
            }
            if (hitWall || this.x <= 0) this.vx *= -1;

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

        if (player && rectIntersect(player, this)) {
            const isStomping = player.vy > 0 && (player.y + player.h - player.vy) <= this.y + 14;
            if (isStomping && this.type !== 'S') {
                this.alive = false;
                player.vy = -9.5;
                score += 150;
                AudioSys.stomp();
                spawnParticles(this.x + this.w / 2, this.y + this.h / 2, '#ffbe0b', 10);
                updateHUD();
            } else {
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
            ctx.fillStyle = "#f4e285";
            ctx.beginPath();
            ctx.roundRect(dx + 8, dy + 16, 18, 16, 8);
            ctx.fill();
            ctx.fillStyle = "#bc4749";
            ctx.beginPath();
            ctx.ellipse(dx + 17, dy + 15, 17, 13, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(dx + 11, dy + 9, 3, 0, Math.PI * 2);
            ctx.arc(dx + 23, dy + 9, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#111";
            ctx.beginPath();
            ctx.arc(dx + 13, dy + 22, 2.2, 0, Math.PI * 2);
            ctx.arc(dx + 21, dy + 22, 2.2, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'S') {
            ctx.fillStyle = "#d90429";
            ctx.beginPath();
            ctx.arc(dx + 17, dy + 22, 16, Math.PI, 0);
            ctx.roundRect(dx + 1, dy + 18, 32, 14, 7);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            for (let i = 5; i <= 23; i += 9) {
                ctx.beginPath();
                ctx.moveTo(dx + i, dy + 11);
                ctx.quadraticCurveTo(dx + i + 3, dy - 3, dx + i + 6, dy + 11);
                ctx.fill();
            }
        } else if (this.type === 'F') {
            ctx.fillStyle = "#5a189a";
            ctx.beginPath();
            ctx.arc(dx + 17, dy + 17, 14, 0, Math.PI * 2);
            ctx.fill();
            const wingY = Math.sin(this.timer * 6) * 7;
            ctx.fillStyle = "#9d4edd";
            ctx.beginPath();
            ctx.ellipse(dx - 2, dy + 15 + wingY, 8, 5, -0.3, 0, Math.PI * 2);
            ctx.ellipse(dx + 36, dy + 15 + wingY, 8, 5, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffbe0b";
            ctx.beginPath();
            ctx.arc(dx + 12, dy + 14, 3, 0, Math.PI * 2);
            ctx.arc(dx + 22, dy + 14, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'J') {
            ctx.fillStyle = "#55a630";
            ctx.beginPath();
            ctx.roundRect(dx + 3, dy + 9, 28, 25, 12);
            ctx.fill();
            ctx.fillStyle = "#80b918";
            ctx.beginPath();
            ctx.arc(dx + 10, dy + 7, 5.5, 0, Math.PI * 2);
            ctx.arc(dx + 24, dy + 7, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#111";
            ctx.beginPath();
            ctx.arc(dx + 10, dy + 7, 2.5, 0, Math.PI * 2);
            ctx.arc(dx + 24, dy + 7, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

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
            size: 3 + Math.random() * 3,
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
                const isTop = r > 0 && lvl.map[r - 1][c] !== '#';
                const isLeftFree = c > 0 && lvl.map[r][c - 1] !== '#';
                const isRightFree = c < cols - 1 && lvl.map[r][c + 1] !== '#';
                tiles.push({ x, y, w: TILE_SIZE, h: TILE_SIZE, type: ch, used: false, isTop, isLeftFree, isRightFree });
            } else if (ch === 'C') {
                collectibles.push({ x: x + 12, y: y + 12, w: 20, h: 20, collected: false });
            } else if (ch === 'E' || ch === 'S' || ch === 'F' || ch === 'J') {
                enemies.push(new Enemy(x, y + (TILE_SIZE - 34), ch));
            } else if (ch === 'G') {
                goalFlag = { x: x + 10, y: y - 80, w: 24, h: 124 };
            }
        }
    }

    const oldPower = (gameState === 'PLAYING' && player) ? player.poweredUp : false;
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

function updateAndDrawMenuPreviews() {
    menuTime += 0.08;
    previewCanvases.forEach(pCanvas => {
        const cKey = pCanvas.dataset.char;
        const pCtx = pCanvas.getContext('2d');
        pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);

        pCtx.fillStyle = "rgba(0, 0, 0, 0.25)";
        pCtx.beginPath();
        pCtx.ellipse(45, 78, 18, 5, 0, 0, Math.PI * 2);
        pCtx.fill();

        let isDancing = false;
        let progress = 0;
        if (danceTimers[cKey] > 0) {
            isDancing = true;
            progress = 1 - (danceTimers[cKey] / 45);
            danceTimers[cKey]--;
        }

        const stats = CHARACTERS[cKey];
        drawAnimalSprite(
            pCtx,
            cKey,
            45 - stats.width / 2,
            76 - stats.height,
            stats.width,
            stats.height,
            1,
            menuTime,
            true,
            isDancing,
            progress,
            false
        );
    });
}

function update() {
    if (gameState === 'MENU') {
        updateAndDrawMenuPreviews();
        return;
    }
    if (gameState !== 'PLAYING' || !player) return;

    player.update();

    const targetCamX = player.x - canvas.width * 0.35;
    cameraX += (targetCamX - cameraX) * 0.12;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > Math.max(0, levelWidth - canvas.width)) cameraX = Math.max(0, levelWidth - canvas.width);

    enemies.forEach(e => e.update());

    collectibles.forEach(c => {
        if (!c.collected && rectIntersect(player, c)) {
            c.collected = true;
            coins++;
            score += 100;
            AudioSys.coin();
            spawnParticles(c.x + 10, c.y + 10, '#ffd166', 7);
            if (coins % 30 === 0) {
                lives++;
                AudioSys.powerup();
            }
            updateHUD();
        }
    });

    if (goalFlag && rectIntersect(player, goalFlag)) {
        AudioSys.win();
        score += 500;
        if (currentLevelIdx + 1 < LEVELS.length) {
            loadLevel(currentLevelIdx + 1);
        } else {
            endGame(true);
        }
    }

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
    drawCustomBackground(lvl, cameraX);

    for (let t of tiles) {
        const dx = Math.floor(t.x - cameraX);
        if (dx < -TILE_SIZE || dx > canvas.width) continue;

        if (t.type === '#') {
            const tl = (t.isTop && t.isLeftFree) ? 12 : 0;
            const tr = (t.isTop && t.isRightFree) ? 12 : 0;
            ctx.fillStyle = lvl.theme.dirt;
            ctx.beginPath();
            ctx.roundRect(dx, t.y, t.w + 1, t.h + 1, [tl, tr, 4, 4]);
            ctx.fill();

            if (t.isTop) {
                ctx.fillStyle = lvl.theme.ground;
                ctx.beginPath();
                ctx.roundRect(dx, t.y, t.w + 1, 13, [tl, tr, 6, 6]);
                ctx.fill();
            }
        } else if (t.type === '?') {
            ctx.fillStyle = t.used ? "#6c757d" : lvl.theme.block;
            ctx.beginPath();
            ctx.roundRect(dx + 1, t.y + 1, t.w - 2, t.h - 2, 12);
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.4)";
            ctx.lineWidth = 2;
            ctx.stroke();

            if (!t.used) {
                ctx.fillStyle = "#fff";
                ctx.font = "900 22px sans-serif";
                ctx.fillText("?", dx + 15, t.y + 30);
            }
        } else if (t.type === 'L') {
            ctx.fillStyle = "#ff4d00";
            ctx.beginPath();
            ctx.roundRect(dx, t.y + 8, t.w + 1, t.h - 8, [8, 8, 0, 0]);
            ctx.fill();
            ctx.fillStyle = "#ffbe0b";
            ctx.beginPath();
            ctx.roundRect(dx, t.y + 8, t.w + 1, 7, 4);
            ctx.fill();
        }
    }

    collectibles.forEach(c => {
        if (c.collected) return;
        const dx = Math.floor(c.x - cameraX);
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.arc(dx + 10, c.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff3b0";
        ctx.beginPath();
        ctx.arc(dx + 7, c.y + 7, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    if (goalFlag) {
        const dx = Math.floor(goalFlag.x - cameraX);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(dx + 8, goalFlag.y, 7, goalFlag.h, 4);
        ctx.fill();

        ctx.fillStyle = "#06d6a0";
        ctx.beginPath();
        ctx.moveTo(dx + 14, goalFlag.y + 6);
        ctx.quadraticCurveTo(dx + 45, goalFlag.y + 12, dx + 54, goalFlag.y + 24);
        ctx.quadraticCurveTo(dx + 45, goalFlag.y + 36, dx + 14, goalFlag.y + 42);
        ctx.fill();
    }

    enemies.forEach(e => e.draw());
    if (player && gameState !== 'MENU') player.draw();

    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - cameraX, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function gameLoop() {
    update();
    draw();
    rafId = requestAnimationFrame(gameLoop);
}

const levelSelect = document.getElementById('level-select');
LEVELS.forEach((lvl, index) => {
    const opt = document.createElement('option');
    opt.value = index;
    opt.textContent = lvl.name;
    levelSelect.appendChild(opt);
});

document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
        AudioSys.init();
        document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedCharKey = card.dataset.char;
        danceTimers[selectedCharKey] = 45;
        AudioSys.dance(selectedCharKey);
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
    player = null;
});

if (rafId) cancelAnimationFrame(rafId);
loadLevel(0);
gameLoop();