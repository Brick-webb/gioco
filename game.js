const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
    sprout() { this.play(260, 'triangle', 0.22, 520, 0.12); },
    powerup() { [350, 440, 587, 784, 987].forEach((f, i) => setTimeout(() => this.play(f, 'sine', 0.11, null, 0.13), i * 55)); },
    fireball() { this.play(720, 'sawtooth', 0.12, 220, 0.11); },
    breakBlock() { this.play(140, 'square', 0.14, 45, 0.15); },
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
        speed: 4.8,
        jumpForce: -13.0,
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
        speed: 4.9,
        jumpForce: -14.3,
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
        speed: 6.6,
        jumpForce: -12.3,
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
        speed: 4.0,
        jumpForce: -13.5,
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
function drawAnimalSprite(ctx, charKey, x, y, w, h, facing, animTime, isGrounded, isDancing = false, danceProgress = 0, powerMode = 'normal', starTimer = 0) {
    const stats = CHARACTERS[charKey];
    ctx.save();

    const isBig = (powerMode === 'big' || powerMode === 'fire');
    let offsetX = 0;
    let offsetY = 0;
    let rotation = 0;
    let scaleX = facing * (isBig ? 1.16 : 1);
    let scaleY = isBig ? 1.16 : 1;

    if (isDancing && danceProgress > 0) {
        const t = danceProgress * Math.PI * 2;
        if (charKey === 'fox') {
            offsetY = -Math.abs(Math.sin(t * 2)) * 12;
            rotation = Math.sin(t * 2) * 0.22;
        } else if (charKey === 'rabbit') {
            offsetY = -Math.abs(Math.sin(t * 2)) * 18;
            scaleX = Math.cos(t * 2);
        } else if (charKey === 'cheetah') {
            offsetX = Math.sin(t * 3) * 14;
            rotation = Math.cos(t * 3) * 0.25;
            scaleX = (Math.cos(t * 3) >= 0 ? 1 : -1);
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

    // Colori dinamici se ha il Fiore di Fuoco o la Stella
    let mainCol = stats.mainColor;
    let bellyCol = stats.bellyColor;
    if (starTimer > 0) {
        const hue = (Date.now() * 0.8) % 360;
        mainCol = `hsl(${hue}, 95%, 58%)`;
        bellyCol = "#ffffff";
    } else if (powerMode === 'fire') {
        mainCol = "#ff3b30";
        bellyCol = "#ffe8d6";
    }

    const walkCycle = isDancing ? danceProgress * 18 : animTime;
    const legSwing = (!isGrounded && !isDancing) ? 4 : Math.sin(walkCycle) * 4.5;

    // 1. CODA
    ctx.save();
    const tailWag = Math.sin(walkCycle * 1.3) * 0.25;
    ctx.translate(-w * 0.35, -h * 0.32);
    ctx.rotate(tailWag);

    if (charKey === 'fox') {
        ctx.fillStyle = mainCol;
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
        ctx.strokeStyle = mainCol;
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
    ctx.fillStyle = mainCol;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.44, w * 0.44, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bellyCol;
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
        ctx.fillStyle = mainCol;
        ctx.beginPath();
        ctx.moveTo(-9, -h * 0.78);
        ctx.quadraticCurveTo(-8, -h * 1.08, -1, -h * 0.84);
        ctx.moveTo(2, -h * 0.84);
        ctx.quadraticCurveTo(9, -h * 1.08, 10, -h * 0.78);
        ctx.fill();
    } else if (charKey === 'rabbit') {
        ctx.fillStyle = mainCol;
        ctx.beginPath();
        ctx.ellipse(-5, -h * 1.02, 4.5, 13, -0.12, 0, Math.PI * 2);
        ctx.ellipse(4, -h * 1.02, 4.5, 13, 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bellyCol;
        ctx.beginPath();
        ctx.ellipse(-5, -h * 1.02, 2.2, 9, -0.12, 0, Math.PI * 2);
        ctx.ellipse(4, -h * 1.02, 2.2, 9, 0.12, 0, Math.PI * 2);
        ctx.fill();
    } else if (charKey === 'cheetah' || charKey === 'bear') {
        const earR = charKey === 'bear' ? 6.5 : 5;
        ctx.fillStyle = mainCol;
        ctx.beginPath();
        ctx.arc(-8, -h * 0.86, earR, 0, Math.PI * 2);
        ctx.arc(7, -h * 0.86, earR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bellyCol;
        ctx.beginPath();
        ctx.arc(-8, -h * 0.86, earR * 0.5, 0, Math.PI * 2);
        ctx.arc(7, -h * 0.86, earR * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // 5. TESTA
    ctx.fillStyle = mainCol;
    ctx.beginPath();
    ctx.ellipse(1, -h * 0.74, w * 0.42, h * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bellyCol;
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

    // Aura speciale per Poteri
    if (starTimer > 0 || powerMode === 'fire') {
        ctx.strokeStyle = starTimer > 0 ? "#ffffff" : "#ff9f1c";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.52, w * 0.62, h * 0.58, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

// --- MAPPE LUNGHE E RICCHE DI NEMICI E BLOCCHI POTERE ---
// Legenda:
// '#' = Terreno/Piattaforma
// 'B' = Mattone distruttibile (o con monete)
// '?' = Blocco Sorpresa -> Bacca Crescita (Big)
// 'M' = Blocco Sorpresa -> Fiore di Fuoco (Spara con F!)
// 'W' = Blocco Sorpresa -> Stella Invincibilità
// 'P' = Tubo/Ostacolo rialzato
// 'C' = Moneta
// 'E' = Fungo Camminatore
// 'S' = Riccio Spinoso (Non saltarci sopra! Usa il Fuoco o la Stella)
// 'F' = Gufo Volante
// 'J' = Rana Saltatrice
// 'L' = Lava / Fossa
// 'G' = Bandiera Fine Livello

const LEVELS = [
    {
        id: "1-1",
        name: "Mondo 1-1: Grande Prateria",
        bgStyle: "meadow",
        theme: { skyTop: "#38b6ff", skyBottom: "#caf0f8", ground: "#38b000", dirt: "#8d5524", block: "#f4a261", pipe: "#2b9348" },
        map: [
            "                                                                                                                                                                                                  ",
            "                                                                                                                                                                                                  ",
            "                                                                                                                C C C C C                                                                         ",
            "                                                            C C C                                             #############                                                                       ",
            "                                    M                     #########                                   W                                                 C C C                                     ",
            "                      ?   B?B                                               B?B                     #####                                             #########                 #                 ",
            "                                          C C                                                                               C C C                                             ###                ",
            "                ?   ###B?B###           #######                   P                   F                                   #########             BMB                       #####               ",
            "                                                                  P                                                                                                     #######               ",
            "        C C                         E               E   E         P             E   S   E               J   J                       E   E   S               E   E     #########           G   ",
            "       #####           E           ###             #######       ###           ###########             #######                     ###########             #######   ###########          #   ",
            "###########################################   #####################################################   #####################################   ####################################################",
            "###########################################LLL#####################################################LLL#####################################LLL####################################################"
        ]
    },
    {
        id: "1-2",
        name: "Mondo 1-2: Valle delle Cascate",
        bgStyle: "waterfall",
        theme: { skyTop: "#0096c7", skyBottom: "#ade8f4", ground: "#2b9348", dirt: "#6f4518", block: "#ff9f1c", pipe: "#007f5f" },
        map: [
            "                                                                                                                                                                                                      ",
            "                                                                                      C C C C                                                                                                         ",
            "                                                                                    ###########                                                     W                                                 ",
            "                                                F                                                                     F                           #####                       C C C                   ",
            "                            M                 #####                   C C C                                         #####                                                   #########                 ",
            "                        #########                                   #########               B?B                                         C C C                                                   #     ",
            "            C C                                       J                                                                               #########                 BMB                           ###    ",
            "          #######                                 #########                       P                   F                                                                                     #####    ",
            "                                      E                                           P                                       S   S                       E   E                               #######    ",
            "                 E   E               ###                         E   S            P             E   J   E               #########                   #########                           #########    ",
            "###########################################   ###############   #######         #####         #############                                 #####               #####################   #############",
            "###########################################LLL###############LLL#######LLLLLLLLL#####LLLLLLLLL#############LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL#####LLLLLLLLLLLLLLL#####################LLL#############"
        ]
    },
    {
        id: "2-1",
        name: "Mondo 2-1: Deserto delle Piramidi",
        bgStyle: "desert",
        theme: { skyTop: "#f77f00", skyBottom: "#ffe599", ground: "#e9c46a", dirt: "#bc6c25", block: "#e76f51", pipe: "#ca6702" },
        map: [
            "                                                                                                                                                                                                          ",
            "                                                                                                                                                                                                          ",
            "                                                                          B?B   BMB   B?B                                                       C C C C                                                   ",
            "                                                    C C C                                                                                     ###########                                                 ",
            "                                                  #########                                                     W                                                           B?B                           ",
            "                            ?                                                       F                         #####                   F                                                               #   ",
            "                        #########                                                 #####                                             #####                       C C C                                   ###  ",
            "                                         S   S                       J                                                      P                                 #########                                 ##### ",
            "                E   E                #############               #########                     S   E   S                    P                 J   J                                                   ####### ",
            "            #############                                                                   ###############                 P               #########               E   S   E                       #########",
            "#################################       #######################             #############                     ###################################       ###########################   ################",
            "#################################LLLLLLL#######################LLLLLLLLLLLLL#############LLLLLLLLLLLLLLLLLLLLL###################################LLLLLLL###########################LLL################"
        ]
    },
    {
        id: "2-2",
        name: "Mondo 2-2: Tempio del Tramonto",
        bgStyle: "temple",
        theme: { skyTop: "#9b2226", skyBottom: "#f4a261", ground: "#ca6702", dirt: "#5f0f40", block: "#ee9b00", pipe: "#9b2226" },
        map: [
            "                                                                                                                                                                                                              ",
            "                                                                     C C C C C                                                                                                                                ",
            "                                                                   #############                                                                W                                                             ",
            "                                            M                                               F                                                 #####                           C C C                           ",
            "                                C C       #####                                           #####                       BMB                                                   #########                         ",
            "                              #######                                       J                                                                                                                             #   ",
            "                      F                                                 #########                                               C C C                           P                                       ###  ",
            "                  #########                                 S   S                                       F                     #########                         P               S   S                   ##### ",
            "                                            E           #############                                 #####                                                     P           #############               #######",
            "            S   E   S                   #########                                   E   J   E                                                   E   S   E       P                                       #########",
            "#################################   ###################                     #######################                 #####################   #################   #################   ######################",
            "#################################LLL###################LLLLLLLLLLLLLLLLLLLLL#######################LLLLLLLLLLLLLLLLL#####################LLL#################LLL#################LLL######################"
        ]
    },
    {
        id: "3-1",
        name: "Mondo 3-1: Foresta Notturna",
        bgStyle: "night",
        theme: { skyTop: "#10002b", skyBottom: "#3c096c", ground: "#5a189a", dirt: "#240046", block: "#9d4edd", pipe: "#7b2cbf" },
        map: [
            "                                                                                                                                                                                                                  ",
            "                                                                                      C C C C                                                                                                                     ",
            "                                                          F                         ###########                                                 W                                                                 ",
            "                                              M                                                                   F                           #####                           C C C                               ",
            "                                  C C       #####                       S   S                       B?B         #####                                                       #########                             ",
            "                                #######                             #############                                                                     BMB                                                   #     ",
            "                        J                                                                                                       C C C                                                                     ###    ",
            "                    #########                               F                                   J   J                         #########                       P                   S   S                   #####   ",
            "                                                        #########                           #############                                                     P               #############               #######  ",
            "            E   S   E                                                           E   S   E                                                   E   J   E         P                                           ######### ",
            "#####################################   #############################   #########################                 #####################   #################   #####################   ##########################",
            "#####################################LLL#############################LLL#########################LLLLLLLLLLLLLLLLL#####################LLL#################LLL#####################LLL##########################"
        ]
    },
    {
        id: "3-2",
        name: "Mondo 3-2: Cratere Vulcanico",
        bgStyle: "volcano",
        theme: { skyTop: "#370617", skyBottom: "#d00000", ground: "#333533", dirt: "#1b1b1e", block: "#ffba08", pipe: "#6a040f" },
        map: [
            "                                                                                                                                                                                                                      ",
            "                                                                                                  C C C C C                                                                                                           ",
            "                                                                      F                         #############                                                     W                                                   ",
            "                                                          M                                                                       F                             #####                           C C C                 ",
            "                                              C C       #####                       J   J                           BMB         #####                                                         #########               ",
            "                                  F         #######                             #############                                                                                                                     #   ",
            "                              #######                                                                                                           C C C                                   P                       ###  ",
            "                      S   S                                             S   S                                       F                         #########                                 P           S   S       ##### ",
            "                  #############                                     #############                                 #####                                                                 P       #############   #######",
            "                                                E   S   E                                       E   S   E                                                   E   J   S   E               P                       #########",
            "#####################################       #########################                   #########################                 #####################   #####################       #################   #############",
            "#####################################LLLLLLL#########################LLLLLLLLLLLLLLLLLLL#########################LLLLLLLLLLLLLLLLL#####################LLL#####################LLLLLLL#################LLL#############"
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
        for (let i = 0; i < 18; i++) {
            const cx = ((i * 310) - camX * 0.15) % 3600;
            const cy = 75 + (i % 3) * 35;
            ctx.beginPath();
            ctx.arc(cx, cy, 26, 0, Math.PI * 2);
            ctx.arc(cx + 24, cy - 8, 32, 0, Math.PI * 2);
            ctx.arc(cx + 52, cy, 24, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = style === 'meadow' ? "rgba(82, 183, 136, 0.45)" : "rgba(64, 145, 108, 0.5)";
        for (let i = 0; i < 24; i++) {
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
        for (let i = 0; i < 16; i++) {
            const px = (i * 420) - (camX * 0.2);
            ctx.beginPath();
            ctx.moveTo(px - 130, 500);
            ctx.quadraticCurveTo(px, 230, px + 130, 500);
            ctx.fill();
        }

        ctx.fillStyle = "rgba(233, 196, 106, 0.65)";
        for (let i = 0; i < 22; i++) {
            const dx = (i * 300) - (camX * 0.35);
            ctx.beginPath();
            ctx.ellipse(dx, 510, 190, 90, 0, Math.PI, 0);
            ctx.fill();
        }
    } else if (style === 'temple') {
        ctx.fillStyle = "rgba(95, 15, 64, 0.35)";
        for (let i = 0; i < 28; i++) {
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
        for (let i = 0; i < 45; i++) {
            const sx = ((i * 197) - camX * 0.08) % 960;
            const sy = (i * 73) % 280;
            ctx.beginPath();
            ctx.arc(sx < 0 ? sx + 960 : sx, sy, (i % 2) + 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = "rgba(36, 0, 70, 0.65)";
        for (let i = 0; i < 24; i++) {
            const nx = (i * 240) - (camX * 0.28);
            ctx.beginPath();
            ctx.roundRect(nx, 240 + (i % 3) * 40, 65, 300, [32, 32, 0, 0]);
            ctx.fill();
        }
    } else if (style === 'volcano') {
        for (let i = 0; i < 16; i++) {
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
let powerItems = [];
let fireballs = [];
let goalFlag = null;
let levelWidth = 0;

const previewCanvases = document.querySelectorAll('.char-preview-canvas');
const danceTimers = { fox: 0, rabbit: 0, cheetah: 0, bear: 0 };
let menuTime = 0;

const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (gameState === 'PLAYING' && player) {
        if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !e.repeat) {
            player.jump();
        }
        if ((e.code === 'KeyF' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') && !e.repeat) {
            player.shootFireball();
        }
        if (e.code === 'KeyR') {
            loadLevel(currentLevelIdx);
        }
    }
});
window.addEventListener('keyup', e => {
    keys[e.code] = false;
});

// --- CLASSE OGGETTI POTERE CHE ESCONO DAI BLOCCHI ---
class PowerItem {
    constructor(x, y, kind) {
        this.x = x + 6;
        this.y = y;
        this.targetY = y - 34;
        this.w = 32;
        this.h = 32;
        this.kind = kind; // 'big' (Bacca Gigante), 'fire' (Fiore di Fuoco), 'star' (Stella Invincibilità)
        this.emerging = true;
        this.vx = kind === 'fire' ? 0 : 2.1;
        this.vy = 0;
        this.collected = false;
        this.anim = 0;
    }

    update() {
        if (this.collected) return;
        this.anim += 0.12;

        if (this.emerging) {
            this.y -= 1.6;
            if (this.y <= this.targetY) {
                this.y = this.targetY;
                this.emerging = false;
                if (this.kind === 'star') this.vy = -7.5;
            }
            return;
        }

        if (this.kind === 'big' || this.kind === 'star') {
            this.x += this.vx;
            for (let t of tiles) {
                if (t.type !== 'L' && rectIntersect(this, t)) {
                    if (this.vx > 0) this.x = t.x - this.w;
                    else this.x = t.x + t.w;
                    this.vx *= -1;
                }
            }
            if (this.x <= 0) this.vx *= -1;

            this.vy += 0.45;
            this.y += this.vy;

            for (let t of tiles) {
                if (t.type !== 'L' && rectIntersect(this, t)) {
                    if (this.vy > 0) {
                        this.y = t.y - this.h;
                        this.vy = this.kind === 'star' ? -8.5 : 0; // La stella rimbalza!
                    }
                }
            }
        }

        if (this.y > canvas.height + 60) {
            this.collected = true;
        }

        if (player && rectIntersect(player, this)) {
            this.collected = true;
            AudioSys.powerup();
            score += 500;
            spawnParticles(this.x + 16, this.y + 16, '#ffd166', 18);

            if (this.kind === 'big') {
                if (player.powerMode === 'normal') player.powerMode = 'big';
            } else if (this.kind === 'fire') {
                player.powerMode = 'fire';
            } else if (this.kind === 'star') {
                player.starTimer = 600; // 10 secondi a 60fps
            }
            updateHUD();
        }
    }

    draw() {
        if (this.collected) return;
        const dx = Math.floor(this.x - cameraX);
        const dy = Math.floor(this.y);
        if (dx < -50 || dx > canvas.width + 50) return;

        ctx.save();
        if (this.kind === 'big') {
            // Super Bacca Gigante (stile Super Fungo morbido)
            ctx.fillStyle = "#fff1e6";
            ctx.beginPath();
            ctx.roundRect(dx + 8, dy + 16, 16, 15, 7);
            ctx.fill();

            ctx.fillStyle = "#e63946";
            ctx.beginPath();
            ctx.ellipse(dx + 16, dy + 15, 16, 13, 0, Math.PI, 0);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(dx + 9, dy + 9, 4, 0, Math.PI * 2);
            ctx.arc(dx + 23, dy + 9, 4, 0, Math.PI * 2);
            ctx.arc(dx + 16, dy + 5, 3.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.kind === 'fire') {
            // Fiore di Fuoco
            ctx.fillStyle = "#38b000";
            ctx.beginPath();
            ctx.roundRect(dx + 13, dy + 16, 6, 15, 3);
            ctx.ellipse(dx + 9, dy + 23, 6, 3.5, -0.4, 0, Math.PI * 2);
            ctx.ellipse(dx + 23, dy + 23, 6, 3.5, 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ff5400";
            ctx.beginPath();
            ctx.ellipse(dx + 16, dy + 11, 14, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffbd00";
            ctx.beginPath();
            ctx.ellipse(dx + 16, dy + 11, 9, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.ellipse(dx + 16, dy + 11, 4.5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.kind === 'star') {
            // Stella Arcobaleno Rimbalzante
            const hue = (Date.now() * 0.6) % 360;
            ctx.fillStyle = `hsl(${hue}, 95%, 58%)`;
            ctx.translate(dx + 16, dy + 16);
            ctx.rotate(Math.sin(this.anim) * 0.25);
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * 16, -Math.sin((18 + i * 72) * Math.PI / 180) * 16);
                ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * 7, -Math.sin((54 + i * 72) * Math.PI / 180) * 7);
            }
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#111";
            ctx.fillRect(-4, -3, 2.5, 5);
            ctx.fillRect(2, -3, 2.5, 5);
        }
        ctx.restore();
    }
}

// --- CLASSE PALLE DI FUOCO DEL GIOCATORE ---
class Fireball {
    constructor(x, y, dir) {
        this.x = x;
        this.y = y;
        this.w = 14;
        this.h = 14;
        this.vx = dir * 8.5;
        this.vy = 2;
        this.active = true;
        this.bounces = 0;
    }

    update() {
        if (!this.active) return;
        this.x += this.vx;
        this.vy += 0.55;
        this.y += this.vy;

        for (let t of tiles) {
            if (rectIntersect(this, t)) {
                if (t.type === 'L') {
                    this.active = false;
                    return;
                }
                // Rimbalza sul pavimento, esplode contro un muro
                if (this.vy > 0 && (this.y + this.h - this.vy) <= t.y + 8) {
                    this.y = t.y - this.h;
                    this.vy = -7.2;
                    this.bounces++;
                } else {
                    this.active = false;
                    spawnParticles(this.x + 7, this.y + 7, '#ff6b00', 8);
                    return;
                }
            }
        }

        // Colpisce i nemici (anche quelli spinosi 'S'!)
        for (let e of enemies) {
            if (e.alive && rectIntersect(this, e)) {
                e.alive = false;
                this.active = false;
                score += 200;
                AudioSys.stomp();
                spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#ff5400', 14);
                updateHUD();
                return;
            }
        }

        if (this.bounces > 5 || Math.abs(this.x - player.x) > 850 || this.y > canvas.height + 50) {
            this.active = false;
        }
    }

    draw() {
        if (!this.active) return;
        const dx = Math.floor(this.x - cameraX);
        const dy = Math.floor(this.y);
        ctx.save();
        ctx.fillStyle = "#ff5400";
        ctx.beginPath();
        ctx.arc(dx + 7, dy + 7, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffbd00";
        ctx.beginPath();
        ctx.arc(dx + 7, dy + 7, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

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
        this.powerMode = 'normal'; // 'normal', 'big', 'fire'
        this.starTimer = 0;
        this.fireCooldown = 0;
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

    shootFireball() {
        if (this.powerMode !== 'fire' || this.fireCooldown > 0) return;
        if (fireballs.filter(f => f.active).length >= 3) return;
        const fx = this.facing === 1 ? this.x + this.w : this.x - 14;
        const fy = this.y + this.h * 0.45;
        fireballs.push(new Fireball(fx, fy, this.facing));
        this.fireCooldown = 16;
        AudioSys.fireball();
    }

    update() {
        if (this.invulnTimer > 0) this.invulnTimer--;
        if (this.fireCooldown > 0) this.fireCooldown--;
        if (this.starTimer > 0) {
            this.starTimer--;
            if (this.starTimer === 0) updateHUD();
        }

        const speedMult = this.starTimer > 0 ? 1.25 : 1.0;
        const currentSpeed = this.speed * speedMult;

        if (keys['ArrowLeft'] || keys['KeyA']) {
            this.vx = -currentSpeed;
            this.facing = -1;
            this.animFrame += 0.25;
        } else if (keys['ArrowRight'] || keys['KeyD']) {
            this.vx = currentSpeed;
            this.facing = 1;
            this.animFrame += 0.25;
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
        for (let i = tiles.length - 1; i >= 0; i--) {
            const t = tiles[i];
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
                        this.hitBlockFromBelow(t, i);
                    }
                }
            }
        }
    }

    hitBlockFromBelow(t, index) {
        if ((t.type === '?' || t.type === 'M' || t.type === 'W') && !t.used) {
            t.used = true;
            t.bounceY = -10;
            AudioSys.sprout();
            const itemKind = t.type === '?' ? 'big' : (t.type === 'M' ? 'fire' : 'star');
            powerItems.push(new PowerItem(t.x, t.y, itemKind));
            spawnParticles(t.x + t.w / 2, t.y, '#ffd166', 10);
        } else if (t.type === 'B') {
            if (this.powerMode !== 'normal' || this.starTimer > 0) {
                // Rompe il blocco mattone se sei potenziato!
                tiles.splice(index, 1);
                score += 50;
                AudioSys.breakBlock();
                spawnParticles(t.x + t.w / 2, t.y + t.h / 2, '#d97706', 14);
                updateHUD();
            } else {
                t.bounceY = -7;
                AudioSys.stomp();
            }
        }
    }

    takeDamage(instantDeath = false) {
        if (this.starTimer > 0 && !instantDeath) return;
        if (this.invulnTimer > 0 && !instantDeath) return;

        if (!instantDeath && this.powerMode !== 'normal') {
            // Scala gradualmente il potere: Fuoco -> Gigante -> Normale
            this.powerMode = this.powerMode === 'fire' ? 'big' : 'normal';
            this.invulnTimer = 95;
            AudioSys.hurt();
            spawnParticles(this.x + this.w / 2, this.y + this.h / 2, '#ff595e', 14);
            updateHUD();
            return;
        }

        AudioSys.hurt();
        lives--;
        this.powerMode = 'normal';
        this.starTimer = 0;
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
            this.powerMode,
            this.starTimer
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
        this.vx = type === 'F' ? -1.9 : -1.6;
        this.vy = 0;
        this.alive = true;
        this.timer = Math.random() * 100;
    }

    update() {
        if (!this.alive) return;
        // Attiva i nemici solo quando il giocatore si avvicina (come nel vero Mario!)
        if (player && Math.abs(this.x - player.x) > 950) return;

        this.timer += 0.06;

        if (this.type === 'F') {
            this.x += this.vx;
            this.y = this.startY + Math.sin(this.timer * 1.5) * 48;
            if (this.x < 50 || this.x > levelWidth - 100) this.vx *= -1;
        } else {
            this.x += this.vx;
            let hitWall = false;
            for (let t of tiles) {
                if (t.type !== 'L' && rectIntersect(this, t)) {
                    if (this.vx > 0) this.x = t.x - this.w;
                    else this.x = t.x + t.w;
                    hitWall = true;
                }
            }
            if (hitWall || this.x <= 0) this.vx *= -1;

            if (this.type === 'J' && Math.abs(this.vy) < 0.1 && Math.sin(this.timer) > 0.94) {
                this.vy = -10.8;
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
            if (player.starTimer > 0) {
                // Invincibilità Stella: spazza via ogni nemico!
                this.alive = false;
                score += 200;
                AudioSys.stomp();
                spawnParticles(this.x + this.w / 2, this.y + this.h / 2, '#ffd166', 14);
                updateHUD();
                return;
            }

            const isStomping = player.vy > 0 && (player.y + player.h - player.vy) <= this.y + 15;
            if (isStomping && this.type !== 'S') {
                this.alive = false;
                player.vy = -10.0;
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
    powerItems = [];
    fireballs = [];
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

            if (ch === '#' || ch === '?' || ch === 'M' || ch === 'W' || ch === 'B' || ch === 'P' || ch === 'L') {
                const isTop = r > 0 && lvl.map[r - 1][c] !== ch;
                const isLeftFree = c > 0 && lvl.map[r][c - 1] !== '#';
                const isRightFree = c < cols - 1 && lvl.map[r][c + 1] !== '#';
                tiles.push({ x, y, w: TILE_SIZE, h: TILE_SIZE, type: ch, used: false, bounceY: 0, isTop, isLeftFree, isRightFree });
            } else if (ch === 'C') {
                collectibles.push({ x: x + 12, y: y + 12, w: 20, h: 20, collected: false });
            } else if (ch === 'E' || ch === 'S' || ch === 'F' || ch === 'J') {
                enemies.push(new Enemy(x, y + (TILE_SIZE - 34), ch));
            } else if (ch === 'G') {
                goalFlag = { x: x + 10, y: y - 80, w: 24, h: 124 };
            }
        }
    }

    const oldPower = (gameState === 'PLAYING' && player) ? player.powerMode : 'normal';
    player = new Player(80, 200, selectedCharKey);
    player.powerMode = oldPower;
    updateHUD();
}

function updateHUD() {
    document.getElementById('hud-char').textContent = CHARACTERS[selectedCharKey].name;
    document.getElementById('hud-level').textContent = LEVELS[currentLevelIdx].id;
    document.getElementById('hud-coins').textContent = coins;
    document.getElementById('hud-lives').textContent = lives;
    document.getElementById('hud-score').textContent = score;

    const powerEl = document.getElementById('hud-power');
    if (player && player.starTimer > 0) {
        powerEl.textContent = "STELLA ★";
        powerEl.style.color = "#ffd166";
    } else if (player && player.powerMode === 'fire') {
        powerEl.textContent = "FUOCO (F)";
        powerEl.style.color = "#ff6b6b";
    } else if (player && player.powerMode === 'big') {
        powerEl.textContent = "GIGANTE";
        powerEl.style.color = "#4cc9f0";
    } else {
        powerEl.textContent = "NORMALE";
        powerEl.style.color = "#ffffff";
    }
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
            'normal',
            0
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

    // Recupero animazione rimbalzo blocchi colpiti da sotto
    for (let t of tiles) {
        if (t.bounceY < 0) {
            t.bounceY += 1.2;
            if (t.bounceY > 0) t.bounceY = 0;
        }
    }

    enemies.forEach(e => e.update());
    powerItems.forEach(p => p.update());
    fireballs.forEach(f => f.update());

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

    // Disegna prima gli oggetti potere che stanno spuntando dai blocchi
    powerItems.forEach(p => { if (p.emerging) p.draw(); });

    for (let t of tiles) {
        const dx = Math.floor(t.x - cameraX);
        if (dx < -TILE_SIZE || dx > canvas.width) continue;
        const dy = Math.floor(t.y + (t.bounceY || 0));

        if (t.type === '#') {
            const tl = (t.isTop && t.isLeftFree) ? 12 : 0;
            const tr = (t.isTop && t.isRightFree) ? 12 : 0;
            ctx.fillStyle = lvl.theme.dirt;
            ctx.beginPath();
            ctx.roundRect(dx, dy, t.w + 1, t.h + 1, [tl, tr, 4, 4]);
            ctx.fill();

            if (t.isTop) {
                ctx.fillStyle = lvl.theme.ground;
                ctx.beginPath();
                ctx.roundRect(dx, dy, t.w + 1, 13, [tl, tr, 6, 6]);
                ctx.fill();
            }
        } else if (t.type === 'B') {
            // Blocco Mattone morbido
            ctx.fillStyle = "#b5651d";
            ctx.beginPath();
            ctx.roundRect(dx + 1, dy + 1, t.w - 2, t.h - 2, 10);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 220, 180, 0.45)";
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (t.type === '?' || t.type === 'M' || t.type === 'W') {
            // Blocchi Sorpresa Poteri
            let boxCol = lvl.theme.block;
            let symbol = "?";
            if (t.type === 'M') { boxCol = "#ff595e"; symbol = "🔥"; }
            if (t.type === 'W') { boxCol = "#ffca3a"; symbol = "★"; }

            ctx.fillStyle = t.used ? "#6c757d" : boxCol;
            ctx.beginPath();
            ctx.roundRect(dx + 1, dy + 1, t.w - 2, t.h - 2, 12);
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 2;
            ctx.stroke();

            if (!t.used) {
                ctx.fillStyle = "#fff";
                ctx.font = t.type === 'M' ? "18px sans-serif" : "900 22px sans-serif";
                ctx.fillText(symbol, t.type === 'M' ? dx + 11 : dx + 14, dy + 30);
            }
        } else if (t.type === 'P') {
            // Tubo stile Super Mario con bordo superiore arrotondato
            ctx.fillStyle = lvl.theme.pipe || "#2b9348";
            ctx.beginPath();
            ctx.roundRect(dx + 3, dy, t.w - 6, t.h + 1, 4);
            ctx.fill();
            if (t.isTop) {
                ctx.fillStyle = "#55a630";
                ctx.beginPath();
                ctx.roundRect(dx - 2, dy, t.w + 4, 15, 7);
                ctx.fill();
            }
        } else if (t.type === 'L') {
            ctx.fillStyle = "#ff4d00";
            ctx.beginPath();
            ctx.roundRect(dx, dy + 8, t.w + 1, t.h - 8, [8, 8, 0, 0]);
            ctx.fill();
            ctx.fillStyle = "#ffbe0b";
            ctx.beginPath();
            ctx.roundRect(dx, dy + 8, t.w + 1, 7, 4);
            ctx.fill();
        }
    }

    // Poteri già usciti dai blocchi
    powerItems.forEach(p => { if (!p.emerging) p.draw(); });

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
    fireballs.forEach(f => f.draw());
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
