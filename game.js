(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  // The approved cyberpunk sprite sheet is decorative only, loaded once.
  // If AVIF is unsupported or still loading, the existing canvas labels remain.
  const cyberArt = typeof Image === "function" ? new Image() : null;
  if (cyberArt) cyberArt.src = "./assets/cyberpunk-ui.avif?v=0.3.13";
  // Four transparent 120x110 frames: armored turret, then three separate
  // shield charge arcs. Loaded once; the previous vector art remains fallback.
  const turretArt = typeof Image === "function" ? new Image() : null;
  if (turretArt) turretArt.src = "./assets/turret-atlas.webp?v=0.3.16";
  // Approved Warden concept, rendered as six transparent closed/open frames.
  // One compact asset is loaded once; the prior canvas boss remains fallback.
  const wardenArt = typeof Image === "function" ? new Image() : null;
  if (wardenArt) wardenArt.src = "./assets/warden-sprite.webp?v=0.3.19";
  // Six actual transparent 144x144 frames: Architect phases 1–3, sealed/open.
  // Decoded once; the original animated canvas spider remains fallback.
  const architectArt = typeof Image === "function" ? new Image() : null;
  if (architectArt) architectArt.src = "./assets/architect-atlas.webp?v=0.3.22";
  // Replacement five-frame high-detail lossless WebP sheet (240x180 each).
  // Retain the original AVIF as a backwards-compatible fallback until the
  // replacement asset is published alongside this game code.
  const leviathanArt = typeof Image === "function" ? new Image() : null;
  if (leviathanArt) leviathanArt.src = "./assets/leviathan-atlas-v2.webp?v=0.3.33";
  const leviathanLegacyArt = typeof Image === "function" ? new Image() : null;
  if (leviathanLegacyArt)
    leviathanLegacyArt.src = "./assets/leviathan-atlas.avif?v=0.3.29";
  function leviathanSheet() {
    if (leviathanArt?.complete &&
        leviathanArt.naturalWidth===1200 && leviathanArt.naturalHeight===180)
      return {image:leviathanArt,frameWidth:240,frameHeight:180};
    if (leviathanLegacyArt?.complete &&
        leviathanLegacyArt.naturalWidth===640 &&
        leviathanLegacyArt.naturalHeight===96)
      return {image:leviathanLegacyArt,frameWidth:128,frameHeight:96};
    return null;
  }
  // Dedicated first-class sprite: crisp 48px transparent yellow grin.
  // The canvas smile below is only a fallback if SVG assets are unavailable.
  const ottoArt=typeof Image==="function"?new Image():null;
  if(ottoArt)ottoArt.src="./assets/evil-otto.svg?v=0.3.36";
  const overlay = document.getElementById("overlay");
  const introArt = document.getElementById("intro-art");
  // Keep the original, accessible opening panel if the artwork is unavailable.
  if (introArt) {
    const syncIntroArtwork = () => overlay.classList.toggle(
      "has-intro-art", introArt.complete && introArt.naturalWidth > 0);
    introArt.addEventListener("load", syncIntroArtwork);
    introArt.addEventListener("error", syncIntroArtwork);
    syncIntroArtwork();
  }
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const overlayEyebrow = document.getElementById("overlay-eyebrow");
  const startButton = document.getElementById("start-btn");
  const pauseButton = document.getElementById("pause-btn");
  const soundButton = document.getElementById("sound-btn");
  const fireButton = document.getElementById("fire-btn");
  // The new analog wheel is a touch-only input surface. Keep the desktop
  // pointer, keyboard and eight-direction pad exactly as before.
  const touchAimWheel = document.getElementById("aim-wheel");
  const touchAimNeedle = document.getElementById("aim-wheel-needle");
  const touchPrimary = typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  let touchWheelPointer=null;
  const statusMessage = document.getElementById("status-message");
  const testWaveInput = document.getElementById("test-wave");
  const testStartButton = document.getElementById("test-start-btn");
  const padButtons = [...document.querySelectorAll("[data-dir]")];
  // Center the entire arena in the space between the 65px top and 677px bottom HUD.
  // The outer perimeter, stroke, and radial markers now stay inside both HUDs.
  const W = 960, H = 720, CX = 480, CY = 371, R = 276;
  const TAU = Math.PI * 2;
  const MODES = ["SPIN", "MORPH", "MELTDOWN"];
  const DURATIONS = [13, 13, 11];
  const HULL_CAPACITY = 3; // Projectile durability per life, separate from future shields.
  const SHOT_GRACE_SECONDS = .5; // Simultaneous volleys count as one hit.
  const SHIELD_MAX = 3, SHIELD_REGEN_SECONDS = 6;
  const SHIELD_CAPSULE_SPEED = 91, SHIELD_CAPSULE_KILL_THRESHOLD = .90;
  const WARDEN_HP = 3, WARDEN_CYCLE = 3.8;
  const ARCHITECT_HP = 4, ARCHITECT_CYCLE = 5.0;
  // Phase-specific reactor openings, progressively shorter but still fair.
  const WARDEN_OPEN_WINDOWS = [null,[.85,2.20],[1.0,1.98],[1.12,1.88]];
  const ARCHITECT_OPEN_WINDOWS = [null,[1.2,2.80],[1.30,2.45],[1.42,2.33]];
  const ARC_CANNON_COOLDOWN = 3.0, ARC_CANNON_RANGE = 92;
  const SHIELD_CAPSULE_RADIUS = 16;
  // One physical rotation speed and acceleration for every aiming method.
  const TURRET_MAX_SPEED = 5.6, TURRET_ACCEL = 25, TURRET_BRAKE = 65;
  const HEAVY_KILLS_REQUIRED = 8, RAILGUN_COOLDOWN = 4.5;
  const RAILGUN_DAMAGE = 3, RAILGUN_RADIUS = 8, RAILGUN_FLASH = .24;
  const SUPPLY_RADIUS = 18, SUPPLY_SPEED = 108;
  const POWERUP_DURATIONS = {triple:10,guardian:12,stasis:8};
  const POWERUP_TYPES = ["triple","guardian","stasis"];
  const STASIS_SCALE = .36;
  const EXTRA_LIFE_INTERVAL = 15000, MAX_LIVES = 5;
  const HULL_REPAIR_FULL_BONUS = 250;
  const OTTO_RADIUS=23, OTTO_SPEED=56, OTTO_LIFETIME=10.8;
  // Rare, unpredictable nuisance. Not part of the boss schedule or score.
  const OTTO_FIRST_ARRIVAL=[28,44], OTTO_RETURN=[57,86];
  const MINI_SENTINEL_HP = 8, MINI_BREAKER_HP = 14;
  const MINI_SENTINEL_GAP_HALF=1.04, MINI_BREAKER_FRONT_HALF=.98;
  const LEVIATHAN_POD_HP=5, LEVIATHAN_CORE_HP=8;
  const LEVIATHAN_REINFORCEMENT_CAP=4, LEVIATHAN_REINFORCEMENT_TOTAL=12;
  const LEVIATHAN_DEATH_SECONDS=2.4;
  // Display-only size: the real pod/core hitboxes and boss motion stay fixed.
  const LEVIATHAN_SPRITE_W=180, LEVIATHAN_SPRITE_H=135;
  // Pod positions are also the independent aimable hitboxes. Source sprite
  // is top-down, with forward pointing toward canvas -Y.
  const LEVIATHAN_PODS=[
    {x:-58,y:-7,name:"PORT",color:"#ff9e62"},
    {x:0,y:-31,name:"DORSAL",color:"#ffca72"},
    {x:58,y:-7,name:"STARBOARD",color:"#ff9e62"}
  ];
  // Mini-bosses appear on waves 3, 7, 11, 15... between the major boss waves.
  // Their presence requires victory before the next graduation.
  function miniTypeForWave(wave) {
    if(wave<3 || (wave-3)%4!==0)return null;
    return Math.floor((wave-3)/4)%2===0?"sentinel":"breaker";
  }
  function miniMaxHp(type,wave) {
    const tier=Math.max(0,Math.floor((wave-(type==="sentinel"?3:7))/8));
    return Math.min(type==="sentinel"?26:34,
      (type==="sentinel"?MINI_SENTINEL_HP:MINI_BREAKER_HP)+tier*3);
  }
  // Sector names match what players actually see, not unrelated generic
  // combat labels. Wave 10+ can retain the expanding endless-run title pool.
  const WAVE_NAMES = ["FIRST CONTACT", "RADAR SWEEP", "PRISM FRACTURE",
    "REACTOR FURNACE", "VECTOR GRID", "PHANTOM WORKS", "KALEIDOSCOPE",
    "PULSE CHAMBER", "COSMOS BREACH", "CRITICAL MASS"];
  const GRADUATIONS = [
    ["CERTIFICATE OF BASIC SURVIVAL","YOU HAVE LEARNED TO POINT A GUN."],
    ["DIPLOMA IN BALLISTICS","OCCASIONAL ACCURACY HAS BEEN OBSERVED."],
    ["ADVANCED ROBOT EVASION","YOUR SURVIVAL SURPRISES THE FACULTY."],
    ["HONORS WITH DISTINCTION","THE FACULTY DID NOT EXPECT THIS."],
    ["MASTER OF MAYHEM","THE ROBOTS REQUEST AN INVESTIGATION."],
    ["DOCTORATE IN IMPROBABILITY","THE EXAMINERS HAVE LEFT THE BUILDING."],
    ["FELLOWSHIP OF CHAOS","EUCLIDEAN GEOMETRY HAS RESIGNED."],
    ["DISTINGUISHED SURVIVOR","THE CURRICULUM NOW FEARS YOU."],
    ["PROFESSOR EMERITUS OF PANIC","THE ROBOTS ARE TAKING NOTES."],
    ["ACADEMY OF THE IMPOSSIBLE","GRADUATION CONTINUES INDEFINITELY."]
  ];
  function graduationFor(wave) {
    return GRADUATIONS[(wave-1)%GRADUATIONS.length];
  }
  const ROLES = ["scout", "flank", "gunner", "heavy", "rush"];
  const ROLE_COLORS = {scout:0, flank:1, gunner:3, heavy:4, rush:2};
  const WAVE_FEATURE = ["scout", "flank", "gunner", "heavy", "rush",
    "flank", "gunner", "rush", "heavy", "rush"];
  const keys = new Set();
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const dist = (x, y) => Math.hypot(x - CX, y - CY);
  const polar = (x, y) => Math.atan2(y - CY, x - CX);
  const colors = ["#2cf9f1", "#ff4baf", "#c1fa53", "#ffad43", "#a18aff"];
  const stars = Array.from({length: 100}, () => ({x:rnd(100,860), y:rnd(80,658), a:rnd(.1,.5)}));
  let soundOn = true, audio = null, pointerFiring = false, buttonFiring = false;
  let last = performance.now();

  function highScore() {
    try { return Number(localStorage.getItem("beyond-berzerk-high") || "0") || 0; }
    catch { return 0; }
  }
  function storeHigh() {
    if (state.testMode) return; // Test runs cannot modify the real record.
    try { localStorage.setItem("beyond-berzerk-high", String(state.high)); } catch {}
  }
  // Actual collision-wall architecture evolves with each sector. Three rings
  // remain bounded; count/span choices leave bot-sized lanes even at max morph.
  // [radius, segments, base angular span, physical wall width, rotation speed]
  const WALL_LAYOUTS = [
    [[116,6,.30,16,.36],[186,9,.225,16,-.28],[250,12,.145,16,.23]], // CONTACT
    [[114,7,.27,16,.36],[181,10,.18,15,-.29],[250,14,.12,14,.25]], // RADAR
    [[116,9,.19,15,.40],[184,8,.25,16,-.32],[248,13,.13,15,.26]], // PRISM
    [[120,10,.17,14,.46],[189,12,.16,16,-.38],[250,16,.09,12,.34]], // REACTOR: turbine teeth
    [[114,6,.32,17,.32],[183,12,.15,14,-.30],[250,14,.12,15,.24]], // VECTOR
    [[120,10,.14,14,.41],[187,9,.22,17,-.35],[251,16,.09,13,.30]], // PHANTOM
    [[115,8,.23,16,.35],[182,12,.16,14,-.37],[249,15,.105,14,.28]], // KALEIDOSCOPE
    [[114,4,.49,22,.19],[186,6,.34,20,-.19],[251,8,.24,18,.17]], // PULSE: massive capacitor plates
    [[116,9,.19,16,.38],[185,11,.17,16,-.31],[250,16,.09,14,.29]] // COSMOS
  ];
  function makeRings(wave=1,previous=null) {
    const layout=WALL_LAYOUTS[Math.min(9,Math.max(1,wave))-1];
    const phases=[.2,1.5,2.9], startAngles=[.14,.32,.09], hues=[178,306,47];
    return layout.map(([base,count,span,width,speed],i)=>({
      base,count,span,width,speed,phase:phases[i],hue:hues[i],
      angle:previous ? previous[i].angle : startAngles[i],
      spin:previous ? previous[i].spin : 1,
      reverseClock:8+i*4,warning:0,reversePending:false
    }));
  }
  function makeState() {
    return {
      phase:"ready", elapsed:0, modeIndex:0, modeClock:0,
      wave:1, testMode:false, testStartWave:1, score:0, high:highScore(), lives:3, hull:HULL_CAPACITY, shotGrace:0, twinCannons:false,
      shieldUnlocked:false, shieldCharges:0, shieldRegen:0,
      shieldFlash:0, shieldFlashArc:-1, heavyLaser:false,
      wave4DirectKills:0, penetrator:false, penCharge:0,
      railFlash:0, railAngle:0,
      arcCannon:false, arcCharge:0, arcLinks:[],
      supplyDrone:null,dropClock:rnd(14,24),powerup:null,
      nextExtraLifeScore:EXTRA_LIFE_INTERVAL,
      powerClock:0,lastPowerup:null,guardianClock:0,guardianAngle:0,
      waveElapsed:0, waveTotal:0, shieldCapsule:null, shieldCapsuleSeen:false,
      boss:null, bossState:"none", bossWarning:0, bossDefeated:false, clearBossShots:false,
      leviathanDeath:null, leviathanVictories:0,
      miniBoss:null, miniBossState:"none", miniBossSeen:false,
      miniBossWarning:0, clearMiniShots:false, miniRewardPending:null,
      otto:null,ottoClock:rnd(...OTTO_FIRST_ARRIVAL),ottoVisits:0,
      architectRingSpins:null,
      aim:6, aimTarget:null, aimVelocity:0,
      rings:makeRings(), bots:[], shots:[], particles:[],
      blasts:[], shockwaves:[], impacts:[], combo:0, comboClock:0,
      toSpawn:0, spawnClock:.4, waveClock:0, fireClock:0,
      invuln:1.8, flash:0, shake:0, announce:"", announceClock:0,
      revealClock:0,
      clearNearbyEnemyShots:false, turretKick:0, muzzleFlash:0,
      destroyed:0, spawnCount:0, chains:0
    };
  }
  let state = makeState();

  function setStatus(message) { statusMessage.textContent = state.testMode ? "TEST // "+message : message; }
  function flashShield(arc=-1,seconds=.45) {
    // Graphics-only timer: -1 flashes all live arcs, or a single gained/lost arc.
    state.shieldFlash=seconds;
    state.shieldFlashArc=arc;
  }
  function showOverlay(title, message, button, eyebrow) {
    overlayTitle.textContent = title;
    overlayText.innerHTML = message;
    overlayEyebrow.textContent = eyebrow;
    const finalTransmission = state.phase === "over" && !state.testMode;
    overlay.classList.toggle("is-end", finalTransmission);
    overlay.classList.toggle("is-intro", state.phase === "ready");
    const endArt = document.getElementById("end-transmission-art");
    if (endArt) endArt.hidden = !finalTransmission;
    startButton.querySelector("span").textContent = "↗";
    startButton.firstChild.textContent = button + " ";
    overlay.classList.remove("hidden");
  }
  function hideOverlay() { overlay.classList.add("hidden"); }

  function tone(freq, duration, kind="square", volume=.027, endFreq=0, delay=0) {
    if (!soundOn || !audio || audio.state !== "running") return;
    try {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const t = audio.currentTime + delay;
      oscillator.type = kind;
      oscillator.frequency.setValueAtTime(Math.max(40, freq), t);
      if (endFreq) oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t + duration);
      // The original firing level was nearly inaudible on normal speakers.
      const level = Math.min(.13, volume * 1.75);
      gain.gain.setValueAtTime(level, t);
      gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(t); oscillator.stop(t + duration + .01);
    } catch (error) {
      console.warn("Beyond Berzerk sound effect failed:", error);
    }
  }
  function audioChirp() {
    tone(740,.11,"square",.035,980);
    tone(980,.18,"triangle",.042,490);
  }
  function graduationFanfare(wave) {
    // A compact four-note victory flourish. Every wave graduates, including 1.
    // Higher waves get the same melody slightly brighter, not louder.
    const transpose = wave>=5 ? 1.12246 : 1;
    for (const [note,delay,length] of [[392,0,.16],[523.25,.17,.18],
      [659.25,.37,.19],[783.99,.59,.36]]) {
      tone(note*transpose,length,"triangle",.027,0,delay);
    }
  }
  function primeAudio(testChirp=false) {
    if (!soundOn) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        soundButton.textContent = "SOUND UNSUPPORTED";
        return;
      }
      audio ||= new AudioContextClass();
      const ready = () => {
        if (!soundOn) return;
        soundButton.textContent = "SOUND ON";
        if (testChirp) audioChirp();
      };
      if (audio.state === "running") ready();
      else audio.resume().then(ready).catch(error => {
        console.warn("Beyond Berzerk audio could not start:", error);
        soundButton.textContent = "SOUND BLOCKED";
      });
    } catch (error) {
      console.warn("Beyond Berzerk audio is unavailable:", error);
      soundButton.textContent = "SOUND UNAVAILABLE";
    }
  }

  function start(wave=1, testMode=false) {
    window.dispatchEvent(new Event("bb:run-start"));
    state = makeState();
    state.phase = "playing";
    state.testMode = testMode;
    state.wave = testMode ? wave : 1;
    state.rings = makeRings(state.wave);
    // Jumping into a later test wave includes rewards earned in earlier waves.
    state.twinCannons = state.wave >= 5;
    // Test wave jumps simulate earlier graduation rewards. Wave 4 itself
    // still requires eight direct kills before its Heavy Laser graduation.
    state.shieldUnlocked = state.wave >= 4;
    state.shieldCharges = state.shieldUnlocked ? SHIELD_MAX : 0;
    state.heavyLaser = state.wave >= 5;
    state.wave4DirectKills = state.heavyLaser ? HEAVY_KILLS_REQUIRED : 0;
    state.penetrator = state.wave >= 7;
    state.arcCannon = state.wave >= 9;
    state.testStartWave = state.wave;
    // Test jump can summon Otto without playing through several waves.
    if(testMode && state.wave>=2)state.ottoClock=rnd(7,12);
    state.toSpawn = state.wave===1 ? 15 : Math.min(120,10+state.wave*5);
    state.waveTotal=state.toSpawn;
    state.announce = (testMode ? "TEST // " : "") +
      "WAVE " + String(state.wave).padStart(2,"0") + " — " + waveName();
    state.announceClock = 2.2;
    state.revealClock = testMode ? 1.45 : 0;
    pointerFiring = buttonFiring = false;
    touchWheelPointer=null;
    if(touchAimWheel)touchAimWheel.classList.remove("aiming");
    fireButton.classList.remove("firing");
    // User's START click unlocks browser audio; the chirp confirms it is active.
    primeAudio(true);
    setStatus("CONTACT — WAVE "+String(state.wave).padStart(2,"0"));
    pauseButton.textContent = "PAUSE";
    hideOverlay();
    syncAimPad();
  }

  function pause() {
    if (state.phase === "playing") {
      state.phase = "paused";
      state.aimVelocity = 0;
      pointerFiring = buttonFiring = false;
      touchWheelPointer=null;
      if(touchAimWheel)touchAimWheel.classList.remove("aiming");
      fireButton.classList.remove("firing");
      showOverlay("PAUSED", "The robots are on their best behavior. For now.", "RESUME", "SYSTEM HOLD");
      pauseButton.textContent = "RESUME";
      setStatus("PAUSED");
    } else if (state.phase === "paused") {
      state.phase = "playing";
      hideOverlay();
      pauseButton.textContent = "PAUSE";
      setStatus("BACK IN THE FIGHT");
    }
  }

  function gameOver() {
    state.phase = "over";
    storeHigh(); // Guarded against test-mode writes.
    tone(310,.35,"sawtooth",.08,65);
    showOverlay(state.testMode ? "TEST COMPLETE" : "SYSTEM OVERRUN",
      "FINAL SCORE: <strong>" + state.score.toLocaleString() + "</strong><br>WAVE REACHED: " +
      state.wave + " &nbsp; • &nbsp; ROBOTS SCRAPPED: " + state.destroyed +
      (state.testMode ? "<br>TEST RUN // UNSCORED" : ""),
      state.testMode ? "NORMAL GAME" : "TRY AGAIN",
      state.testMode ? "SIMULATION TERMINATED" : "END OF TRANSMISSION");
    pauseButton.textContent = "PAUSE";
    setStatus("GAME OVER — INSERT COURAGE");
    // A real run alone may qualify for the Cloudflare world board.
    // Game Over (including test runs) still operates if the board is offline.
    if (!state.testMode) window.dispatchEvent(new CustomEvent("bb:game-over", {
      detail: {score:state.score,wave:state.wave,robots:state.destroyed,
        leviathan:state.leviathanVictories>0}
    }));
  }

  function modeName() { return MODES[state.modeIndex]; }
  function waveName() {
    return state.wave===12?"LEVIATHAN STRONGHOLD":
      WAVE_NAMES[(state.wave-1)%WAVE_NAMES.length];
  }
  function ringShape(ring) {
    const power = modeName() === "SPIN" ? .12 : modeName() === "MORPH" ? 1 : 1.15;
    const surge = state.wave >= 3 ? .5+.5*Math.sin(state.elapsed*.65 + ring.phase) : 0;
    // Dense turbine sectors must not seal every bot-sized passage in MORPH.
    const densitySwing=Math.min(1,12/ring.count);
    return {
      radius:ring.base + power * (8+state.wave*.32) * Math.sin(state.elapsed * 1.7 + ring.phase),
      span:Math.max(.055, ring.span + power * .075*densitySwing *
        Math.sin(state.elapsed * 1.25 + ring.phase) + surge*.085*densitySwing),
      width:ring.width
    };
  }
  function blockedAngle(ring, angle, padding=0) {
    const s = ringShape(ring);
    const pitch = TAU / ring.count;
    const n = Math.round((angle - ring.angle) / pitch);
    const center = ring.angle + n * pitch;
    return Math.abs(angleDiff(angle, center)) <= s.span / 2 + padding;
  }
  function wallHit(x, y, padding=0) {
    const radius = dist(x, y);
    const angle = polar(x, y);
    for (const ring of state.rings) {
      const s = ringShape(ring);
      if (Math.abs(radius - s.radius) <= s.width / 2 + padding &&
          blockedAngle(ring, angle, padding / Math.max(60, radius))) return true;
    }
    return false;
  }
  function bestGap(ring, angle, margin) {
    for (let n=0; n<=34; n++) {
      const step = n * .042;
      if (!blockedAngle(ring, angle+step, margin)) return angle+step;
      if (!blockedAngle(ring, angle-step, margin)) return angle-step;
    }
    return angle;
  }
  function updateArena(dt) {
    state.elapsed += dt;
    state.modeClock += dt;
    if (state.modeClock >= DURATIONS[state.modeIndex]) {
      state.modeClock -= DURATIONS[state.modeIndex];
      state.modeIndex = (state.modeIndex + 1) % MODES.length;
      state.announce = modeName() === "MELTDOWN" ? "MELTDOWN!" : "ARENA " + modeName();
      state.announceClock = 2;
      setStatus("ARENA " + modeName());
      tone(modeName()==="MELTDOWN" ? 180 : 420,.26,"sawtooth",.045,750);
    }
    const architectActive=state.wave===8 &&
      (state.bossState==="entering" || state.bossState==="active") &&
      state.boss?.type==="architect";
    for (const [index,ring] of state.rings.entries()) {
      // During the boss encounter, the Architect owns real ring reversals.
      // Otherwise keep the original staggered reversal schedule untouched.
      // Each ring has its own staggered reversal clock. The one-second
      // warning makes the change readable, not a surprise collision.
      if (state.wave >= 2 && !architectActive) {
        if (!ring.reversePending) {
          ring.reverseClock -= dt;
          if (ring.reverseClock <= 0) {
            ring.reversePending = true;
            ring.warning = 1.05;
          }
        } else {
          ring.warning -= dt;
          if (ring.warning <= 0) {
            ring.spin *= -1;
            ring.reversePending = false;
            ring.reverseClock = rnd(8.5,13) + index*2.6;
            ring.warning = 0;
            burst(CX+Math.cos(ring.angle)*ring.base,CY+Math.sin(ring.angle)*ring.base,
              "#ffe372",8,.4);
            tone(350+index*125,.12,"triangle",.018,180);
          }
        }
      }
      const boost = modeName() === "SPIN" ? 1 : modeName() === "MORPH" ? .12 : 1.65;
      const architectSpeed=architectActive && state.bossState==="active" &&
        state.boss.phase===3?2.0:1;
      ring.angle += ring.speed * ring.spin * boost * architectSpeed * dt *
        (1 + Math.min(.7,(state.wave - 1) * .045));
    }
  }

  function spawnBot(preview=false) {
    // Every themed wave favors a new kind of trouble, while keeping earlier
    // enemies in the mix. All opponents stay tiny and visually distinguishable.
    const allowed = ROLES.filter((role,index) => index <= Math.min(4,state.wave-1));
    const featured = WAVE_FEATURE[(state.wave-1)%WAVE_FEATURE.length];
    const type = preview ? "scout" : (Math.random()<.55 ? featured :
      allowed[Math.floor(Math.random()*allowed.length)]);
    const a = preview ? rnd(0,TAU) : Math.floor(rnd(0,8))*Math.PI/4;
    const r = preview ? rnd(145,R+2) : rnd(R+2,R+10);
    const heavy = type==="heavy";
    const factors = {scout:1, flank:1.12, gunner:.85, heavy:.72, rush:1.42};
    const bot = {
      x:CX+Math.cos(a)*r, y:CY+Math.sin(a)*r, size:heavy&&state.wave>=5?10.5:heavy?8.6:7.2,
      type, speed:(rnd(24,33) + Math.min(35,state.wave*2.1))*factors[type],
      hue:ROLE_COLORS[type],
      hp:heavy?(state.wave<5?2:Math.min(7,5+Math.floor(Math.max(0,state.wave-5)/5))):1,
      maxHp:heavy?(state.wave<5?2:Math.min(7,5+Math.floor(Math.max(0,state.wave-5)/5))):1,
      armored:heavy,
      shotClock: type==="gunner"?rnd(1.1,2.3):rnd(1.9,3.9),
      wobble:rnd(0,TAU), direction:Math.random()<.5?-1:1,
      panic:0, panicAngle:0, age:0
    };
    if (!preview && wallHit(bot.x,bot.y,bot.size)) return false;
    state.bots.push(bot);
    return true;
  }
  function burst(x, y, color, amount=12, force=1) {
    // Touch devices render fewer cosmetic particles. Collision, explosions,
    // scoring, damage and wall physics remain identical on every platform.
    const visibleAmount=touchPrimary?Math.max(1,Math.ceil(amount*.7)):amount;
    for (let i=0;i<visibleAmount;i++) {
      const a=rnd(0,TAU), speed=rnd(35,180)*force;
      state.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
        life:rnd(.22,.65),max:.65,color,size:rnd(1.1,3.4)});
    }
    const cap=touchPrimary?280:450;
    if (state.particles.length>cap) state.particles.splice(0,state.particles.length-cap);
  }
  function queueBlast(x,y,color,depth=0) {
    if (state.blasts.length >= 24 || depth > 3) return;
    state.blasts.push({x,y,color,depth,delay:.075});
    state.shockwaves.push({x,y,color,life:.38,maxLife:.38,radius:55});
    if (state.shockwaves.length>24) state.shockwaves.shift();
    burst(x,y,"#ffecc1",13,1.45);
    state.shake = Math.max(state.shake,3.5);
    tone(130+depth*47,.15,"sawtooth",.03,62);
  }
  function scrap(index, byWall=false, cause="shot", depth=0) {
    const bot = state.bots[index];
    if (!bot) return;
    burst(bot.x,bot.y,colors[bot.hue],byWall?9:17,byWall?.7:1.15);
    state.score += byWall?40:(cause==="chain"?140:bot.armored?180:100);
    if (cause==="chain") state.chains++;
    state.destroyed++;
    // Participation is direct, weapon-delivered kills in Wave 4 only.
    // Explosion chains and wall casualties never qualify.
    if (state.wave===4 && !byWall && cause==="shot") {
      state.wave4DirectKills++;
      if (state.wave4DirectKills===HEAVY_KILLS_REQUIRED)
        setStatus("MARKSMAN QUALIFIED — HEAVY LASER READY AT GRADUATION");
    }
    state.shake = Math.max(state.shake,byWall?1.4:2.5);
    if (!state.testMode && state.score > state.high) { state.high=state.score; storeHigh(); }
    if (!byWall && cause!=="chain") tone(rnd(110,190),.12,"sawtooth",.03,55);
    state.bots.splice(index,1);
    // A percentage of turret kills detonate; chained victims also detonate,
    // within a bounded depth so even huge crowds stay inexpensive to process.
    const detonates = !byWall && depth<3 && state.blasts.length<24 &&
      (cause==="chain" || Math.random()<(bot.armored?.60:.28));
    if (detonates) queueBlast(bot.x,bot.y,colors[bot.hue],depth);
  }
  function blastHasLine(x,y,bx,by) {
    const dx=bx-x,dy=by-y,len=Math.hypot(dx,dy);
    for (let d=7;d<len-5;d+=7) {
      if (wallHit(x+dx*d/len,y+dy*d/len,1.5)) return false;
    }
    return true;
  }
  function updateBlasts(dt) {
    // Move the current queue aside; chain explosions join the next frame,
    // never changing the array we're iterating.
    const queued=state.blasts.splice(0);
    for (const blast of queued) {
      blast.delay-=dt;
      if (blast.delay>0) {state.blasts.push(blast);continue;}
      let hits=0;
      for (let i=state.bots.length-1;i>=0;i--) {
        const bot=state.bots[i];
        const distance=Math.hypot(bot.x-blast.x,bot.y-blast.y);
        if (distance>116 || !blastHasLine(blast.x,blast.y,bot.x,bot.y)) continue;
        if (distance<=55 && hits<10) {
          hits++;
          scrap(i,false,"chain",blast.depth+1);
        } else {
          // The survivors scatter for a moment — sometimes into a wall.
          bot.panic=rnd(.55,1.15);
          bot.panicAngle=Math.atan2(bot.y-blast.y,bot.x-blast.x)+rnd(-.48,.48);
        }
      }
      if(hits>=2) {
        state.comboClock=1.3;
        state.combo=Math.max(state.combo,hits+1);
      }
    }
  }
  function playerHit(kind="shot") {
    // Otto is contact-like: shield removes ONE charge; without a charge he
    // takes one life, never whittles the hull down via a normal projectile.
    if (state.invuln>0 || state.phase!=="playing") return;
    const ottoImpact=kind==="otto";
    if(ottoImpact && state.shieldUnlocked && state.shieldCharges>0){
      state.shieldCharges--;
      state.shieldRegen=0;
      flashShield(state.shieldCharges,.55);
      state.shotGrace=SHOT_GRACE_SECONDS;
      state.flash=.13;state.shake=Math.max(state.shake,6);
      burst(CX,CY,"#fff13a",18,.6);
      tone(500,.17,"square",.055,140);
      setStatus("OTTO STOLE A SHIELD CHARGE — "+state.shieldCharges+
        "/"+SHIELD_MAX);
      return;
    }
    if(ottoImpact)kind="contact";
    if (kind==="shot") {
      if (state.shotGrace>0) return;
      if (state.shieldUnlocked && state.shieldCharges>0) {
        state.shieldCharges--;
        state.shieldRegen=0; // Six uninterrupted seconds to regrow one charge.
        flashShield(state.shieldCharges,.45); // Briefly illuminate the spent arc.
        state.shotGrace=SHOT_GRACE_SECONDS;
        state.flash=.08;state.shake=Math.max(state.shake,3);
        burst(CX,CY,"#57fdff",10,.45);
        tone(590,.11,"triangle",.038,330);
        setStatus("SHIELD ABSORBED HIT — "+state.shieldCharges+"/"+SHIELD_MAX);
        return;
      }
      state.hull--;
      if (state.hull>0) {
        state.shotGrace=SHOT_GRACE_SECONDS;
        state.flash=.12; state.shake=Math.max(state.shake,4);
        burst(CX,CY,"#ffb866",8,.5);
        tone(440,.11,"triangle",.043,210);
        setStatus("HULL HIT — "+state.hull+"/"+HULL_CAPACITY);
        return;
      }
    }
    state.lives--;
    state.hull=HULL_CAPACITY;
    if (state.shieldUnlocked) {
      state.shieldCharges=SHIELD_MAX;
      flashShield(-1,.45);
    }
    state.shieldRegen=0;
    state.shotGrace=0;
    state.invuln=3.5; // Preserve existing post-death invulnerability.
    state.flash=.26; state.shake=13;
    burst(CX,CY,"#ff3c91",34,1.8);
    // Defer projectile cleanup until updateShots has finished iterating.
    // Replacing the array mid-loop used to throw when a robot shot hit the turret.
    state.clearNearbyEnemyShots=true;
    tone(260,.35,"sawtooth",.09,52);
    if (state.lives<=0) gameOver();
    else setStatus((ottoImpact?"EVIL OTTO":kind==="contact"?
      "ROBOT CONTACT":"HULL BREACH")+" — "+state.lives+" LIVES");
  }
  function architectCoreOpen(b) {
    if(state.wave!==8 || state.bossState!=="active" ||
        b?.type!=="architect")return false;
    const clock=b.age%ARCHITECT_CYCLE;
    const [start,end]=ARCHITECT_OPEN_WINDOWS[b.phase];
    return clock>=start && clock<end;
  }
  function restoreArchitectRings() {
    if(!state.architectRingSpins)return;
    state.rings.forEach((r,i)=>{
      r.spin=state.architectRingSpins[i];
      r.reversePending=false;r.warning=0;
      r.reverseClock=7+i*2.7;
    });
    state.architectRingSpins=null;
  }
  function hitArchitect(b) {
    // Both direct turret shots and the Railgun can breach the visible core.
    // The auto Railgun ignores the Architect's rotating physical wall plates.
    if(!architectCoreOpen(b) || b.guard>0)return false;
    b.hp--;
    b.guard=.85;
    state.shake=Math.max(state.shake,8);
    burst(b.x,b.y,"#a4faff",19,1);
    tone(420+(ARCHITECT_HP-b.hp)*140,.19,"sawtooth",.065,980);
    if(b.hp<=0) {
      state.score+=3000;
      if(!state.testMode && state.score>state.high) {
        state.high=state.score;storeHigh();
      }
      restoreArchitectRings();
      state.boss=null;
      state.bossState="defeated";
      state.bossDefeated=true;
      state.clearBossShots=true;
      state.announce="THE ARCHITECT DESTROYED";
      state.announceClock=2.0;
      setStatus("ARCHITECT DEFEATED — ARC CANNON EARNED");
      burst(b.x,b.y,"#ff9fff",45,1.55);
      tone(125,.46,"sawtooth",.085,52);
    } else {
      b.phase=Math.min(3,ARCHITECT_HP-b.hp+1);
      b.age=0; // Restore a brief closed-core interval after each hit.
      b.reverseClock=b.phase===2?2.2:b.phase===3?1.5:b.reverseClock;
      b.laneClock=b.phase===2?1.8:.85;
      state.announce="ARCHITECT ARMOR FRACTURED // PHASE "+b.phase;
      state.announceClock=1.8;
      setStatus("ARCHITECT CORE HIT — "+b.hp+" REMAIN");
    }
    return true;
  }
  function collectSupplyDrone() {
    const drone=state.supplyDrone;
    if(!drone)return;
    // Special colored supplies grant instant benefits without cancelling
    // an existing timed weapon. The original gold mystery drone remains.
    state.supplyDrone=null;
    state.dropClock=rnd(18,29);
    if(drone.kind==="repair") {
      if(state.hull<HULL_CAPACITY) {
        state.hull=HULL_CAPACITY;
        state.announce="HULL REPAIRED // 3/3";
        setStatus("EMERGENCY REPAIR — HULL FULL");
      } else {
        state.score+=HULL_REPAIR_FULL_BONUS;
        if(!state.testMode && state.score>state.high){
          state.high=state.score;storeHigh();
        }
        state.announce="HULL FULL // +250 BONUS";
        setStatus("REPAIR SALVAGED — +250 POINTS");
      }
      burst(drone.x,drone.y,"#a1ffc2",17,.75);
      tone(480,.17,"triangle",.055,970);
      tone(790,.25,"triangle",.040,1280);
    } else if(drone.kind==="overcharge") {
      if(state.shieldUnlocked){
        state.shieldCharges=SHIELD_MAX;
        state.shieldRegen=0;
        flashShield(-1,.6);
      }
      if(state.penetrator)state.penCharge=0;
      state.announce="OVERCHARGE // SYSTEMS RECHARGED";
      setStatus("OVERCHARGE — SHIELDS FULL"+
        (state.penetrator?" + RAILGUN READY":""));
      burst(drone.x,drone.y,"#87c8ff",19,.85);
      tone(390,.24,"sawtooth",.046,920);
      tone(1120,.22,"triangle",.045,1780);
    } else {
      let pick=POWERUP_TYPES[Math.floor(Math.random()*POWERUP_TYPES.length)];
      // No back-to-back identical timed powers, even across instant supplies.
      if(pick===state.lastPowerup)
        pick=POWERUP_TYPES[(POWERUP_TYPES.indexOf(pick)+1+
          Math.floor(Math.random()*2))%POWERUP_TYPES.length];
      state.powerup=pick;
      state.lastPowerup=pick;
      state.powerClock=POWERUP_DURATIONS[pick];
      state.guardianClock=0;
      const title=pick==="triple"?"TRIPLE THREAT":
        pick==="guardian"?"GUARDIAN DRONES":"STASIS FIELD";
      state.announce=title+" ACTIVATED";
      setStatus("SUPPLY SECURED — "+title);
      burst(drone.x,drone.y,"#f8da7f",16,.72);
      tone(560,.13,"triangle",.052,1100);
      tone(940,.20,"triangle",.036,1540,.11);
    }
    state.announceClock=2.1;
    burst(drone.x,drone.y,"#ffffff",7,.4);
  }
  function awardScoreLives() {
    if(state.phase!=="playing")return;
    // One award at 15k, 30k, 45k, and every subsequent 15k milestone.
    // Milestones are consumed even at the five-life inventory cap.
    let earned=0;
    while(state.score>=state.nextExtraLifeScore) {
      state.nextExtraLifeScore+=EXTRA_LIFE_INTERVAL;
      if(state.lives<MAX_LIVES){
        state.lives++;
        earned++;
      }
    }
    if(!earned)return;
    state.announce="EXTRA LIFE! +"+earned;
    state.announceClock=2.8;
    setStatus("EXTRA LIFE! — "+state.lives+"/"+MAX_LIVES+" LIVES");
    burst(CX,CY,"#ffb6e2",24,.85);
    burst(CX,CY,"#ffe8a0",15,.55);
    tone(520,.16,"triangle",.06,760);
    tone(780,.25,"triangle",.055,1220,.13);
    tone(1040,.32,"triangle",.05,1570,.27);
  }
  function updateSupplyDrone(dt) {
    if(state.supplyDrone){
      state.supplyDrone.x+=state.supplyDrone.vx*dt;
      if(state.supplyDrone.x>CX+R+SUPPLY_RADIUS+14 ||
          state.supplyDrone.x<CX-R-SUPPLY_RADIUS-14){
        state.supplyDrone=null;
        state.dropClock=rnd(18,29);
      }
      return;
    }
    // A won mini-boss's reward has priority over ordinary random arrivals.
    // Spawn it even if all remaining small robots have been eliminated.
    if(state.miniRewardPending){
      const reward=state.miniRewardPending;
      state.miniRewardPending=null;
      state.supplyDrone={x:reward.x,y:reward.y,
        vx:(reward.x<CX?1:-1)*SUPPLY_SPEED,kind:"random"};
      state.announce="MINI-BOSS SUPPLY RELEASED // SHOOT TO CLAIM";
      state.announceClock=1.9;
      tone(780,.13,"triangle",.032,1100);
      return;
    }
    // No random drops in introductions, on empty cleared waves, or when a boss
    // is announcing/entering. A live boss may still draw a lucky supply.
    const combat=state.toSpawn>0 || state.bots.length>0 ||
      state.bossState==="active" || state.miniBossState==="active";
    if(!combat || state.waveClock>0 ||
        state.bossState==="warning" || state.bossState==="entering")return;
    state.dropClock-=dt;
    if(state.dropClock>0)return;
    const lanes=[-146,-104,-63,-25,38,83,132];
    const dir=Math.random()<.5?1:-1;
    const roll=Math.random();
    // 20% green repairs, 10% rare blue Overcharge after shield unlock.
    // The remaining crossings retain the original mystery weapon pool.
    const kind=roll<.20?"repair":
      roll<.30 && state.shieldUnlocked?"overcharge":"random";
    state.supplyDrone={
      x:CX-dir*(R+SUPPLY_RADIUS+10),
      y:CY+lanes[Math.floor(Math.random()*lanes.length)],
      vx:dir*SUPPLY_SPEED,kind
    };
    state.announce=kind==="repair"?"EMERGENCY REPAIR INBOUND":
      kind==="overcharge"?"OVERCHARGE INBOUND":
      "SUPPLY DRONE INBOUND // SHOOT TO CLAIM";
    state.announceClock=1.7;
    tone(720,.08,"square",.025,450);
  }
  function updateGuardians(dt) {
    if(state.powerup!=="guardian")return;
    state.guardianAngle+=dt*1.65;
    state.guardianClock-=dt;
    if(state.guardianClock>0)return;
    state.guardianClock=.43;
    if(state.shots.filter(shot=>shot.friendly).length>72)return;
    for(let i=0;i<2;i++){
      const a=state.guardianAngle+i*Math.PI;
      const x=CX+Math.cos(a)*58,y=CY+Math.sin(a)*58;
      let target=null,nearest=158;
      for(const bot of state.bots){
        const d=Math.hypot(bot.x-x,bot.y-y);
        if(d>=nearest || !arcPathClear(x,y,bot.x,bot.y))continue;
        nearest=d;target=bot;
      }
      const mini=state.miniBoss;
      if(mini && state.miniBossState==="active"){
        const d=Math.hypot(mini.x-x,mini.y-y);
        if(d<nearest && arcPathClear(x,y,mini.x,mini.y)){
          nearest=d;target=mini;
        }
      }
      if(!target)continue;
      const aim=Math.atan2(target.y-y,target.x-x);
      state.shots.push({x,y,vx:Math.cos(aim)*395,vy:Math.sin(aim)*395,
        life:.52,friendly:true,size:2.7,damage:1,
        color:"#9cfff2",guardian:true});
      burst(x,y,"#82ffe9",2,.13);
    }
  }
  function hostileScale(shot) {
    return !shot.friendly && state.powerup==="stasis"?STASIS_SCALE:1;
  }
  function fireRailgun(angle,dx,dy) {
    // A true rail blast, not one slightly thicker ordinary projectile.
    // Instant straight-line damage crosses every arena wall. Robots and
    // incoming projectiles are hit once each, regardless of wall position.
    const range=R+19;
    for(let k=state.bots.length-1;k>=0;k--) {
      const b=state.bots[k],rx=b.x-CX,ry=b.y-CY;
      const along=rx*dx+ry*dy;
      const offset=Math.abs(rx*dy-ry*dx);
      if(along<24 || along>range+b.size || offset>b.size+RAILGUN_RADIUS)continue;
      b.hp-=RAILGUN_DAMAGE;
      if(b.hp<=0)scrap(k,false);
      else burst(b.x,b.y,"#ffda72",8,.55);
    }
    const otto=state.otto;
    if(otto && otto.repelGrace<=0){
      const rx=otto.x-CX,ry=otto.y-CY,along=rx*dx+ry*dy;
      if(along>=22 && along<=R+OTTO_RADIUS &&
          Math.abs(rx*dy-ry*dx)<=OTTO_RADIUS+RAILGUN_RADIUS)
        repelOtto(3);
    }
    const mini=state.miniBoss;
    if(mini && state.miniBossState==="active"){
      const rx=mini.x-CX,ry=mini.y-CY,along=rx*dx+ry*dy;
      const radius=mini.type==="sentinel"?21:28;
      if(along>=24 && along<=range+radius &&
          Math.abs(rx*dy-ry*dx)<=radius+RAILGUN_RADIUS)
        // Railgun crosses walls but does not ignore miniboss armor.
        hitMiniBoss(RAILGUN_DAMAGE,false,Math.atan2(CY-mini.y,CX-mini.x));
    }
    const leviathan=state.boss;
    if(leviathan?.type==="leviathan" && state.bossState==="active"){
      // A rail shot may hit exactly one pod (or one core opening). It cannot
      // destroy the entire boss even if the beam crosses multiple parts.
      let target=null,nearest=Infinity;
      for(let i=0;i<3;i++){
        if(leviathan.pods[i].hp<=0)continue;
        const at=leviathanPodPosition(leviathan,i);
        const rx=at.x-CX,ry=at.y-CY,along=rx*dx+ry*dy;
        if(along>=24 && along<=range+21 &&
          Math.abs(rx*dy-ry*dx)<RAILGUN_RADIUS+15 &&
          along<nearest){target=i;nearest=along;}
      }
      if(target!==null)damageLeviathanPod(target,RAILGUN_DAMAGE);
      else if(leviathan.pods.every(p=>p.hp<=0) &&
          leviathanCoreOpen(leviathan)){
        const rx=leviathan.x-CX,ry=leviathan.y-CY;
        if(rx*dx+ry*dy>=24 && rx*dx+ry*dy<=range+20 &&
            Math.abs(rx*dy-ry*dx)<RAILGUN_RADIUS+18)
          damageLeviathanCore();
      }
    }
    const architect=state.boss;
    if(architect?.type==="architect" && state.bossState==="active") {
      const rx=architect.x-CX,ry=architect.y-CY;
      if(rx*dx+ry*dy>=24 && rx*dx+ry*dy<=range &&
          Math.abs(rx*dy-ry*dx)<=RAILGUN_RADIUS+13)
        hitArchitect(architect);
    }
    const drone=state.supplyDrone;
    let collectedOvercharge=false;
    if(drone) {
      const rx=drone.x-CX,ry=drone.y-CY;
      if(rx*dx+ry*dy>=24 && rx*dx+ry*dy<=range &&
          Math.abs(rx*dy-ry*dx)<=RAILGUN_RADIUS+SUPPLY_RADIUS){
        collectedOvercharge=drone.kind==="overcharge";
        collectSupplyDrone();
      }
    }
    // The old Penetrator could shoot down hostile bolts. Retain that advantage.
    state.shots=state.shots.filter(s=>{
      if(s.friendly)return true;
      const rx=s.x-CX,ry=s.y-CY;
      const along=rx*dx+ry*dy;
      const struck=along>=24 && along<=range+6 &&
        Math.abs(rx*dy-ry*dx)<=RAILGUN_RADIUS+s.size;
      if(struck)burst(s.x,s.y,"#fff3a8",5,.35);
      return !struck;
    });
    state.railAngle=angle;
    state.railFlash=RAILGUN_FLASH;
    // When this very rail blast collected Overcharge, its instant reset
    // must win over the railgun's ordinary firing cooldown.
    state.penCharge=collectedOvercharge?0:RAILGUN_COOLDOWN;
    state.shake=Math.max(state.shake,5.5);
    burst(CX+dx*46,CY+dy*46,"#ffe39c",10,.5);
    // Two layered low-frequency transients, triggered only by each rail shot.
    tone(120,.26,"sawtooth",.09,48);
    tone(510,.19,"triangle",.055,135);
  }
  function arcPathClear(x1,y1,x2,y2) {
    const steps=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)/5));
    for(let i=1;i<steps;i++){
      const t=i/steps;
      if(wallHit(x1+(x2-x1)*t,y1+(y2-y1)*t,2))return false;
    }
    return true;
  }
  function arcChain(start) {
    // A special primary shot chains to at most two nearby robots, one at
    // a time. Every hop checks the actual dynamic walls.
    const used=new Set();
    let source=start;
    for(let hop=0;hop<2;hop++){
      let target=null,nearest=ARC_CANNON_RANGE;
      for(const candidate of state.bots){
        if(used.has(candidate))continue;
        const d=Math.hypot(candidate.x-source.x,candidate.y-source.y);
        if(d<nearest && d>2 && arcPathClear(source.x,source.y,candidate.x,candidate.y)) {
          nearest=d;target=candidate;
        }
      }
      const mini=state.miniBoss;
      if(mini && state.miniBossState==="active" && !used.has(mini)){
        const d=Math.hypot(mini.x-source.x,mini.y-source.y);
        if(d<nearest && d>2 && arcPathClear(source.x,source.y,mini.x,mini.y)){
          nearest=d;target=mini;
        }
      }
      if(!target)break;
      used.add(target);
      state.arcLinks.push({x1:source.x,y1:source.y,x2:target.x,y2:target.y,life:.20});
      if(state.arcLinks.length>12)state.arcLinks.shift();
      if(target===mini)
        hitMiniBoss(1,false,Math.atan2(source.y-mini.y,source.x-mini.x));
      else target.hp--;
      burst(target.x,target.y,"#a9faff",4,.30);
      tone(770+hop*180,.085,"triangle",.026,1200+hop*50);
      if(target!==mini && target.hp<=0){
        const index=state.bots.indexOf(target);
        if(index>=0)scrap(index,false,"chain");
      }
      source={x:target.x,y:target.y};
    }
  }
  function firePlayer() {
    const angle=state.aim*Math.PI/4, dx=Math.cos(angle),dy=Math.sin(angle);
    // Normal front and rear streams stay completely unchanged. The railgun
    // is a separate automatic discharge on the regular FIRE cadence.
    const railReady=state.penetrator && state.penCharge<=0;
    const arcReady=state.arcCannon && state.arcCharge<=0;
    if(arcReady)state.arcCharge=ARC_CANNON_COOLDOWN;
    const damage=state.heavyLaser?2:1;
    const color=state.heavyLaser?"#dbadff":"#ecfdff";
    // Triple Threat retains the exact center shot (including Arc Cannon).
    // Additional +/- spread bullets behave like ordinary wall-blocked lasers.
    const spread=state.powerup==="triple"?[-.17,0,.17]:[0];
    for(const offset of spread){
      const a=angle+offset,fx=Math.cos(a),fy=Math.sin(a);
      state.shots.push({x:CX+fx*27,y:CY+fy*27,
        vx:fx*610,vy:fy*610,life:.7,friendly:true,size:3.3,
        color:arcReady&&offset===0?"#92eeff":color,
        damage,penetrating:false,arc:arcReady&&offset===0});
      if(state.twinCannons){
        state.shots.push({x:CX-fx*27,y:CY-fy*27,
          vx:-fx*610,vy:-fy*610,life:.7,friendly:true,size:3.3,
          color,damage,penetrating:false});
      }
    }
    burst(CX+dx*28,CY+dy*28,arcReady?"#c0ffff":"#90faff",2,.15);
    if(state.twinCannons)burst(CX-dx*28,CY-dy*28,"#90faff",2,.15);
    state.turretKick=1;
    state.muzzleFlash=.07;
    if(railReady)fireRailgun(angle,dx,dy);
    else tone(740,.055,"square",.033,420);
  }
  function fireBot(bot) {
    const raging=bot.armored && bot.maxHp>=5 && bot.hp<=bot.maxHp/2;
    const count=raging?3:1;
    if (state.shots.filter(s=>!s.friendly).length+count>65)return;
    const aim=Math.atan2(CY-bot.y,CX-bot.x)+rnd(-.08,.08);
    const speed=150+Math.min(100,state.wave*9)+(raging?15:0);
    for(let i=0;i<count;i++){
      const angle=aim+(i-(count-1)/2)*.19;
      state.shots.push({x:bot.x+Math.cos(angle)*12,y:bot.y+Math.sin(angle)*12,
        vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:2.6,
        friendly:false,size:3.2,color:raging?"#ff5d7d":"#ff7a4b"});
    }
    if(raging)tone(280,.12,"sawtooth",.025,115);
  }
  function clearShotPath(x,y) {
    const angle = polar(x,y), d=dist(x,y);
    for (const ring of state.rings) {
      const s = ringShape(ring);
      if (s.radius < d-5 && blockedAngle(ring,angle,.025)) return false;
    }
    return true;
  }

  function updateBots(dt) {
    for (let i=state.bots.length-1;i>=0;i--) {
      const b=state.bots[i];
      const botDt=dt*(state.powerup==="stasis"?STASIS_SCALE:1);
      b.age+=botDt;
      let d=dist(b.x,b.y), a=polar(b.x,b.y);
      const preferred = b.type==="gunner"?153:b.type==="flank"?108:
        b.type==="rush"?69:83;
      let heading=a+Math.PI;
      const raging=b.armored && b.maxHp>=5 && b.hp<=b.maxHp/2;
      let speed=b.speed*botDt*(raging?1.4:1);
      let nearest=null,distanceToRing=Infinity;
      for (const ring of state.rings) {
        const delta=d-ringShape(ring).radius;
        if (delta>-17 && delta<46 && Math.abs(delta)<distanceToRing) {
          nearest=ring;distanceToRing=Math.abs(delta);
        }
      }
      // Runners press inward; flankers orbit; gunners seek a firing lane.
      // Each role retains wall-avoiding behavior and a safe central pocket.
      if (b.panic>0) {
        b.panic=Math.max(0,b.panic-botDt);
        heading=b.panicAngle;
        speed*=1.5;
      } else if (d<preferred+6) {
        if (b.type==="flank" || b.type==="gunner") {
          heading=a+b.direction*Math.PI/2;
          if (d<preferred-13) heading=a;
        } else {
          speed=0;
        }
      } else if (b.type==="flank") {
        heading=a+Math.PI+b.direction*.45;
      } else {
        heading+=Math.sin(b.age*1.5+b.wobble)*.065;
      }
      if (nearest && blockedAngle(nearest,a,(b.size+7)/nearest.base)) {
        const target=bestGap(nearest,a,(b.size+7)/nearest.base);
        const turn=angleDiff(target,a);
        heading=a+(Math.abs(turn)<.025?b.direction:Math.sign(turn))*Math.PI/2;
      }
      let nx=b.x+Math.cos(heading)*speed,ny=b.y+Math.sin(heading)*speed;
      if (wallHit(nx,ny,b.size*.8)) {
        // Skirt around blocked corridors instead of pushing into walls.
        const turn = nearest ? Math.sign(angleDiff(bestGap(nearest,a,.16),a)) || b.direction : b.direction;
        const tangent=a+turn*Math.PI/2;
        nx=b.x+Math.cos(tangent)*speed*.83;
        ny=b.y+Math.sin(tangent)*speed*.83;
      }
      if (!wallHit(nx,ny,b.size*.75) && dist(nx,ny)<R+22 && dist(nx,ny)>38) {
        b.x=nx;b.y=ny;
      }
      if (wallHit(b.x,b.y,Math.max(1,b.size*.3))) {
        scrap(i,true);continue;
      }
      d=dist(b.x,b.y);
      if (d<30) {burst(b.x,b.y,"#ff4baf",12);state.bots.splice(i,1);playerHit("contact");continue;}
      b.shotClock-=botDt;
      const fireRange=b.type==="gunner"?190:b.type==="flank"?138:
        b.type==="rush"?94:raging?166:125;
      if (b.shotClock<=0 && d<fireRange && clearShotPath(b.x,b.y)) {
        fireBot(b);
        b.shotClock=(raging?rnd(1.2,1.9):
          b.type==="gunner"?rnd(1.5,2.6):rnd(2.8,4.6))/
          (1+Math.min(.35,state.wave*.025));
      } else if (b.shotClock<=0) b.shotClock=rnd(.25,.7);
    }
  }
  function shotPathClear(shot, seconds) {
    // All projectile path checks use the same Stasis scaling as movement.
    const factor=hostileScale(shot);
    if (shot.penetrating) {
      const x=shot.x+shot.vx*seconds*factor,y=shot.y+shot.vy*seconds*factor;
      return dist(x,y)<=R+21;
    }
    // Interceptions cannot occur through the arena's moving walls.
    const steps=Math.max(1,Math.ceil(Math.hypot(shot.vx,shot.vy)*seconds*factor/4));
    for (let i=1;i<=steps;i++) {
      const t=seconds*i*factor/steps;
      const x=shot.x+shot.vx*t,y=shot.y+shot.vy*t;
      if (dist(x,y)>R+21 || wallHit(x,y,shot.size)) return false;
    }
    return true;
  }
  function interceptShots(dt) {
    const friendly=state.shots.filter(s=>s.friendly && s.life>0);
    const hostile=state.shots.filter(s=>!s.friendly && s.life>0);
    if (!friendly.length || !hostile.length) return;

    // Solve relative projectile motion over this frame; checking only their
    // endpoints would miss fast shots crossing between animation frames.
    const possible=[];
    for (const a of friendly) {
      for (const b of hostile) {
        const rx=a.x-b.x, ry=a.y-b.y;
        const factor=hostileScale(b);
        const vx=a.vx-b.vx*factor, vy=a.vy-b.vy*factor;
        const limit=Math.min(dt,a.life,b.life);
        const t=clamp(-(rx*vx+ry*vy)/Math.max(1,vx*vx+vy*vy),0,limit);
        const dx=rx+vx*t, dy=ry+vy*t;
        const radius=a.size+b.size+1.2;
        if (dx*dx+dy*dy<=radius*radius) possible.push({a,b,t});
      }
    }
    possible.sort((a,b)=>a.t-b.t);
    const intercepted=new Set();
    for (const {a,b,t} of possible) {
      if (intercepted.has(a) || intercepted.has(b)) continue;
      if (!shotPathClear(a,t) || !shotPathClear(b,t)) continue;
      if (!a.penetrating) intercepted.add(a); // Penetrator survives interceptions.
      intercepted.add(b);
      const factor=hostileScale(b);
      const x=(a.x+a.vx*t+b.x+b.vx*t*factor)/2;
      const y=(a.y+a.vy*t+b.y+b.vy*t*factor)/2;
      burst(x,y,"#f6ffff",10,.72);
      burst(x,y,"#59eaff",5,.38);
      state.impacts.push({x,y,life:.23,maxLife:.23,color:"#d9ffff"});
      if (state.impacts.length>48) state.impacts.shift();
      tone(1030,.075,"triangle",.024,530);
    }
    // Remove matched pairs before updateShots starts iterating them.
    if (intercepted.size) state.shots=state.shots.filter(s=>!intercepted.has(s));
  }
  function updateShots(dt) {
    interceptShots(dt);
    for (let i=state.shots.length-1;i>=0;i--) {
      const s=state.shots[i];
      if (!s) continue; // Defensive guard if another combat event changes the list.
      const shotDt=dt*hostileScale(s);
      s.life-=shotDt;
      if (s.life<=0) {state.shots.splice(i,1);continue;}
      const steps=Math.max(1,Math.ceil(Math.hypot(s.vx,s.vy)*shotDt/5));
      let hit=false;
      for (let j=0;j<steps;j++) {
        s.x+=s.vx*shotDt/steps;s.y+=s.vy*shotDt/steps;
        const struckWall=!s.penetrating && wallHit(s.x,s.y,s.size);
        if (dist(s.x,s.y)>R+21 || struckWall) {
          burst(s.x,s.y,s.friendly?"#45fefa":"#ff9551",struckWall?8:5,.42);
          if(struckWall) {
            state.impacts.push({x:s.x,y:s.y,life:.19,maxLife:.19,
              color:s.friendly?"#72ffff":"#ffb16b"});
            if (state.impacts.length>48) state.impacts.shift();
          }
          hit=true;break;
        }
        if (s.friendly) {
          // Only real turret projectiles can collect the capsule; the projectile
          // has already passed the usual wall collision check above.
          const capsule=state.shieldCapsule;
          if (capsule && Math.hypot(s.x-capsule.x,s.y-capsule.y) <
              SHIELD_CAPSULE_RADIUS+s.size) {
            state.shieldCapsule=null;
            state.shieldCharges=SHIELD_MAX;
            state.shieldRegen=0;
            flashShield(-1,.55); // Shield pickup gives a quick three-arc ripple.
            state.announce="SHIELDS RECHARGED // 3/3";
            state.announceClock=1.8;
            setStatus("SHIELD CAPSULE HIT — SHIELDS FULL");
            burst(capsule.x,capsule.y,"#80ffff",18,.9);
            burst(capsule.x,capsule.y,"#ffffff",8,.4);
            tone(860,.13,"triangle",.045,1310);
            hit=true;break;
          }
          const drone=state.supplyDrone;
          if(drone && Math.hypot(s.x-drone.x,s.y-drone.y)<
              SUPPLY_RADIUS+s.size){
            collectSupplyDrone();
            hit=true;break;
          }
          // This is an indestructible collision, not a scoring kill.
          // Ordinary shots are still stopped by walls BEFORE this check.
          const otto=state.otto;
          if(otto && otto.repelGrace<=0 &&
              Math.hypot(s.x-otto.x,s.y-otto.y)<OTTO_RADIUS+s.size){
            repelOtto(s.damage||1);
            hit=true;break;
          }
          const boss=state.boss;
          if(boss?.type==="architect" && state.bossState==="active") {
            const d=Math.hypot(s.x-boss.x,s.y-boss.y);
            // Plate shutters block ordinary shots while closed. An exposed
            // reactor admits only the central bullseye (not the limbs).
            const open=architectCoreOpen(boss);
            if(d<(open?14:38)+s.size) {
              if(open && d<14+s.size) hitArchitect(boss);
              else {
                burst(s.x,s.y,"#ce8dff",3,.22);
                tone(210,.045,"triangle",.015,95);
              }
              hit=true;break;
            }
          }
          // When cyan, the outer armor opens a clear path to the reactor.
          // Otherwise the closed plate stops shots at the outer 35px radius.
          // Only the Warden uses this historical hitbox. The Architect
          // and Leviathan have their own dedicated hit tests above.
          if (boss && !boss.type && state.bossState==="active" &&
              Math.hypot(s.x-boss.x,s.y-boss.y)<
                (wardenCoreOpen(boss)?11:47)+s.size) {
            const core=Math.hypot(s.x-boss.x,s.y-boss.y)<11+s.size;
            if (core && wardenCoreOpen(boss) && boss.guard<=0) {
              boss.hp--;
              boss.guard=.70;
              burst(boss.x,boss.y,"#b8fcff",17,.9);
              tone(470+(WARDEN_HP-boss.hp)*150,.16,"sawtooth",.06,1050);
              state.shake=Math.max(state.shake,7);
              if (boss.hp<=0) {
                state.score+=1500;
                if (!state.testMode && state.score>state.high) {
                  state.high=state.score;storeHigh();
                }
                state.boss=null;state.bossDefeated=true;
                state.bossState="defeated";
                state.clearBossShots=true; // Defer array changes until after loop.
                state.announce="THE WARDEN DESTROYED";
                state.announceClock=2;
                setStatus("WARDEN DEFEATED — TWIN CANNONS EARNED");
                burst(boss.x,boss.y,"#ffac66",42,1.5);
                tone(130,.4,"sawtooth",.07,55);
              } else {
                boss.phase=WARDEN_HP-boss.hp+1;
                boss.age=Math.ceil(boss.age/WARDEN_CYCLE)*WARDEN_CYCLE;
                if(boss.phase>=2)boss.turnClock=boss.phase===3?1.5:3.0;
                state.announce=boss.phase===3?"WARDEN // FINAL ASSAULT":
                  "ARMOR BREACHED // PHASE "+boss.phase;
                state.announceClock=1.5;
                setStatus("WARDEN CORE HIT — "+boss.hp+" REMAIN");
              }
            } else {
              burst(s.x,s.y,"#ff9d64",3,.25);
              tone(165,.045,"triangle",.012,130);
            }
            hit=true;break;
          }
          const leviathan=state.boss;
          if(leviathan?.type==="leviathan" && state.bossState==="active"){
            if(leviathanTargetShot(leviathan,s.x,s.y,s.damage||1)){
              hit=true;break;
            }
          }
          const mini=state.miniBoss;
          if(mini && state.miniBossState==="active"){
            const d=Math.hypot(s.x-mini.x,s.y-mini.y);
            const radius=mini.type==="sentinel"?21:28;
            if(d<radius+s.size){
              const accurate=d<12+s.size;
              const landed=hitMiniBoss(s.damage||1,accurate,
                Math.atan2(s.y-mini.y,s.x-mini.x));
              if(s.arc && landed)arcChain({x:mini.x,y:mini.y});
              hit=true;break;
            }
          }
          for (let k=state.bots.length-1;k>=0;k--) {
            const b=state.bots[k];
            if (Math.hypot(s.x-b.x,s.y-b.y)<b.size+4) {
              b.hp-=s.damage||1;
              burst(s.x,s.y,s.penetrating?"#ffe9ab":"#ffffff",4,.27);
              if (b.hp<=0) scrap(k,false,s.guardian?"guardian":"shot");
              else tone(170,.07,"triangle",.025,110);
              if(s.arc)arcChain({x:b.x,y:b.y});
              if (!s.penetrating) {hit=true;break;}
              // A Penetrator continues through the rest of the swarm.
              // Its lethal damage removes each bot immediately, so none can
              // be struck twice by the same projectile.
              break;
            }
          }
        } else if (dist(s.x,s.y)<16 && state.invuln<=0) {
          playerHit("shot");
          hit=true;
        }
        if (hit) break;
      }
      if (hit) state.shots.splice(i,1);
    }
    if (state.clearNearbyEnemyShots) {
      state.shots = state.shots.filter(s=>s.friendly || Math.hypot(s.x-CX,s.y-CY)>140);
      state.clearNearbyEnemyShots = false;
    }
    if (state.clearBossShots) {
      state.shots=state.shots.filter(s=>s.friendly);
      state.clearBossShots=false;
    }
    if(state.clearMiniShots){
      state.shots=state.shots.filter(s=>!s.mini);
      state.clearMiniShots=false;
    }
  }

  // EVIL OTTO — an homage to the 1980 original, not another HP enemy.
  // He phases through walls, hops toward the stationary turret and leaves
  // after a short visit. Hits bounce him away; no amount of fire kills him.
  function positionOtto(o) {
    const bob=Math.abs(Math.sin(o.age*10.2))*11;
    const sideways=Math.sin(o.age*1.65+o.seed)*7;
    o.x=CX+Math.cos(o.angle)*o.radius-Math.sin(o.angle)*sideways;
    o.y=CY+Math.sin(o.angle)*o.radius+Math.cos(o.angle)*sideways-bob;
  }
  function repelOtto(power=1) {
    const o=state.otto;
    if(!o)return false;
    const kick=100+Math.min(45,power*14);
    o.radius=Math.min(R+34,Math.max(45,o.radius+kick));
    o.repelGrace=.22;
    o.flash=.25;
    positionOtto(o);
    burst(o.x,o.y,"#fff64b",10,.45);
    tone(380,.13,"square",.036,690);
    setStatus("EVIL OTTO REPELLED // NOT DESTROYED");
    return true;
  }
  function updateOtto(dt) {
    const noBossEncounter=state.bossState==="none" &&
      !state.leviathanDeath && state.waveClock===0;
    // Respect the major boss presentation; Otto doesn't clutter their
    // entrances or the graduation ceremony.
    if(!noBossEncounter){
      state.otto=null;
      return;
    }
    const o=state.otto;
    if(!o){
      state.ottoClock-=dt;
      if(state.wave<2 || state.ottoClock>0)return;
      state.ottoClock=rnd(...OTTO_RETURN);
      const angle=rnd(-Math.PI,Math.PI);
      state.otto={angle,seed:rnd(0,TAU),radius:R+25,age:0,
        life:OTTO_LIFETIME,repelGrace:0,flash:0,
        x:CX+Math.cos(angle)*(R+25),y:CY+Math.sin(angle)*(R+25)};
      state.ottoVisits++;
      state.announce="EVIL OTTO // UNINVITED";
      state.announceClock=1.25;
      setStatus("OTTO INBOUND — YOU CANNOT KILL THAT GRIN");
      tone(330,.12,"square",.043,540);
      tone(550,.16,"square",.032,330,.11);
      return;
    }
    o.age+=dt;
    o.life-=dt;
    if(o.life<=0){
      state.otto=null;
      return;
    }
    o.repelGrace=Math.max(0,o.repelGrace-dt);
    o.flash=Math.max(0,o.flash-dt);
    o.radius-= (OTTO_SPEED+Math.min(18,state.wave*1.5))*dt;
    positionOtto(o);
    // Periodic deliberately obnoxious ORIGINAL boing; no sample files.
    // Keep soundOn handling in tone(), which respects mute.
    if(Math.floor((o.age-dt)*3.1)!==Math.floor(o.age*3.1))
      tone(260,.115,"square",.022,495);
    if(Math.hypot(o.x-CX,o.y-CY)<=OTTO_RADIUS+15){
      playerHit("otto");
      state.otto=null; // Exactly one collision per visit, even if invulnerable.
    }
  }
  function drawOtto() {
    const o=state.otto;
    if(!o)return;
    ctx.save();
    const fade=Math.min(1,o.life*2,(o.age+.12)*3);
    ctx.globalAlpha=fade;
    // Subtle bounce shadow and tiny crisp lemon halo, not an expensive blur.
    const bounce=Math.abs(Math.sin(o.age*10.2));
    ctx.fillStyle="rgba(255,220,20,.17)";
    ctx.beginPath();ctx.ellipse(o.x,o.y+21,18-5*bounce,4,0,0,TAU);ctx.fill();
    ctx.translate(Math.round(o.x),Math.round(o.y));
    const size=55+2*bounce+(o.flash>0?3:0);
    if(ottoArt?.complete && ottoArt.naturalWidth>0){
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(ottoArt,-size/2,-size/2,size,size);
    }else{
      // Same bright-yellow face if the sprite file cannot load.
      ctx.fillStyle="#fff200";ctx.strokeStyle="#ffbc00";ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,0,OTTO_RADIUS,0,TAU);ctx.fill();ctx.stroke();
      ctx.fillStyle="#121019";
      ctx.fillRect(-12,-10,6,10);ctx.fillRect(6,-10,6,10);
      ctx.beginPath();ctx.arc(0,-1,16,.17,Math.PI-.17);
      ctx.lineWidth=5;ctx.strokeStyle="#121019";ctx.stroke();
    }
    ctx.restore();
  }

  function beginMiniBoss() {
    const type=miniTypeForWave(state.wave);
    if(!type || state.miniBossSeen)return;
    state.miniBossSeen=true;
    state.miniBossState="warning";
    state.miniBossWarning=1.4;
    state.announce=(type==="sentinel"?"SENTINEL":"BREAKER")+
      " // HEAVY CONTACT INCOMING";
    state.announceClock=1.8;
    setStatus("MINI-BOSS WARNING — "+type.toUpperCase());
    tone(155,.34,"sawtooth",.045,90);
    tone(470,.21,"triangle",.032,210,.14);
  }
  function miniEnraged(b) {
    return b.hp<=b.maxHp/2;
  }
  function miniSentinelGapAngle(b) {
    // Continuous independent rotation; a bright arc shows the real gap.
    return .45-b.age*1.35;
  }
  function miniBreakerFacing(b) {
    // The guns track the turret independently of the heavy hull. The
    // ram locks its plated nose toward the turret while charging.
    const towardPlayer=Math.atan2(CY-b.y,CX-b.x);
    if(b.chargeWarning>0 || b.chargeTime>0)return towardPlayer;
    const swing=miniEnraged(b)?2.32:1.58;
    return towardPlayer+swing*Math.sin(b.age*.84+.70);
  }
  function miniArmorOpen(b,incomingAngle) {
    if(b.type==="sentinel")
      return Math.abs(angleDiff(incomingAngle,miniSentinelGapAngle(b)))<=
        MINI_SENTINEL_GAP_HALF;
    // Side and rear ports are the weak points, frontal prow is armored.
    return Math.abs(angleDiff(incomingAngle,miniBreakerFacing(b)))>
      MINI_BREAKER_FRONT_HALF;
  }
  function hitMiniBoss(damage=1,precise=false,incomingAngle=null) {
    const b=state.miniBoss;
    if(!b || state.miniBossState!=="active")return false;
    if(b.guard>0)return false;
    const incoming=incomingAngle===null?
      Math.atan2(CY-b.y,CX-b.x):incomingAngle;
    if(!miniArmorOpen(b,incoming)){
      b.guard=.09; // Distinct brief armor clang, not a successful hit.
      burst(b.x,b.y,b.type==="sentinel"?"#a6d6ff":"#ffdfa3",5,.28);
      tone(255,.055,"triangle",.025,110);
      return false;
    }
    const critical=b.type==="breaker" && miniEnraged(b) && precise;
    b.hp-=damage+(critical?1:0);
    b.guard=.13;
    burst(b.x,b.y,critical?"#fff3b6":"#ffba8a",8,.45);
    state.shake=Math.max(state.shake,critical?5:3);
    tone(240,.08,"triangle",.029,110);
    if(b.hp<=0){
      const points=(b.type==="sentinel"?850:1350)+
        Math.max(0,Math.floor((state.wave-3)/4))*150;
      state.score+=points;
      if(!state.testMode && state.score>state.high){
        state.high=state.score;storeHigh();
      }
      state.miniBoss=null;
      state.miniBossState="defeated";
      state.clearMiniShots=true;
      state.announce=b.type.toUpperCase()+" DESTROYED // +"+points;
      state.announceClock=2.4;
      setStatus("MINI-BOSS DOWN — "+points+" BONUS / SUPPLY RELEASED");
      burst(b.x,b.y,b.type==="sentinel"?"#fb667e":"#ffc07c",40,1.45);
      burst(b.x,b.y,"#f4ffff",20,.82);
      state.shake=Math.max(state.shake,8);
      tone(125,.38,"sawtooth",.068,47);
      tone(690,.24,"triangle",.04,130,.15);
      // Keep the guaranteed shoot-to-collect reward and its queue.
      if(!state.supplyDrone){
        state.supplyDrone={x:b.x,y:b.y,
          vx:(b.x<CX?1:-1)*SUPPLY_SPEED,kind:"random"};
      }else state.miniRewardPending={x:b.x,y:b.y};
      state.dropClock=rnd(18,29);
    }else if(miniEnraged(b) && !b.enragedOnce){
      b.enragedOnce=true;
      state.announce=b.type.toUpperCase()+" // ARMOR BREACHED";
      state.announceClock=1.7;
      if(b.type==="breaker"){
        b.counterPending=true;
        b.counterClock=.65; // Visible warning before the reprisal.
        setStatus("BREAKER ARMOR FRACTURED — COUNTER BARRAGE INCOMING");
      }else{
        b.turnClock=Math.min(b.turnClock,.45);
        setStatus("SENTINEL ENRAGED — WATCH FOR REVERSALS");
      }
      tone(340,.21,"sawtooth",.042,550);
    }
    return true;
  }
  function fireMiniBoss(b,attack="normal") {
    const angry=miniEnraged(b);
    const count=b.type==="sentinel"?(angry?5:3):
      attack==="counter"?8:attack==="charge"?(angry?7:5):(angry?6:4);
    if(state.shots.filter(s=>!s.friendly).length+count>65)return false;
    const aim=Math.atan2(CY-b.y,CX-b.x);
    const speed=(b.type==="sentinel"?190:215)+
      Math.min(90,Math.max(0,state.wave-3)*5)+(attack==="charge"?36:0);
    for(let k=0;k<count;k++){
      const offset=b.type==="sentinel"?
        (k-(count-1)/2)*(angry?.18:.20):
        (k-(count-1)/2)*(attack==="charge"?.135:
          attack==="counter"?.115:.095);
      const angle=aim+offset;
      const muzzle=b.type==="breaker"?25:19;
      state.shots.push({x:b.x+Math.cos(angle)*muzzle,
        y:b.y+Math.sin(angle)*muzzle,
        vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
        life:2.7,friendly:false,size:3.5,mini:true,
        color:attack==="charge"?"#fff0aa":attack==="counter"?"#ff7860":
          b.type==="sentinel"?"#ff647e":"#ffb26d"});
    }
    if(attack!=="normal"){
      b.chargeBurstFlash=.24;
      burst(b.x,b.y,attack==="charge"?"#ffe7a5":"#ff805f",12,.7);
      state.shake=Math.max(state.shake,attack==="charge"?6:4);
      tone(attack==="charge"?110:170,.32,"sawtooth",.066,45);
    }else tone(b.type==="sentinel"?260:180,.17,"sawtooth",.048,86);
    return true;
  }
  function updateMiniBoss(dt) {
    if(state.miniBossState==="warning"){
      state.miniBossWarning=Math.max(0,state.miniBossWarning-dt);
      if(state.miniBossWarning<=0){
        const type=miniTypeForWave(state.wave);
        if(!type)return;
        const angle=type==="sentinel"?-2.15:-.87;
        const radius=type==="sentinel"?151:211;
        const hp=miniMaxHp(type,state.wave);
        state.miniBoss={type,hp,maxHp:hp,age:0,guard:0,
          angle,radius,baseRadius:radius,
          x:CX+Math.cos(angle)*radius,y:CY+Math.sin(angle)*radius,
          orbitDir:1,fireClock:1.35,fireWarning:0,
          chargeClock:4.1,chargeWarning:0,chargeTime:0,
          chargeBurstFired:false,chargeBurstFlash:0,
          counterPending:false,counterClock:0,
          turnClock:rnd(1.7,3.2),turnWarning:0,enragedOnce:false};
        state.miniBossState="active";
        state.announce=type.toUpperCase()+" // TARGET THE ARMORED HUNTER";
        state.announceClock=2.1;
        setStatus(type.toUpperCase()+" ENGAGED — "+hp+" ARMOR");
      }
      return;
    }
    const b=state.miniBoss;
    if(!b || state.miniBossState!=="active")return;
    b.age+=dt;
    b.guard=Math.max(0,b.guard-dt);
    b.chargeBurstFlash=Math.max(0,b.chargeBurstFlash-dt);
    const angry=miniEnraged(b);
    if(b.type==="breaker"){
      if(b.chargeWarning>0){
        b.chargeWarning=Math.max(0,b.chargeWarning-dt);
        if(!b.chargeWarning){
          b.chargeTime=1.05;
          b.chargeBurstFired=false;
          tone(135,.24,"sawtooth",.043,280);
        }
      }else if(b.chargeTime>0){
        b.chargeTime=Math.max(0,b.chargeTime-dt);
        if(!b.chargeTime)b.chargeClock=angry?3.1:4.7;
      }else{
        b.chargeClock-=dt;
        if(b.chargeClock<=0){
          b.chargeWarning=.95;
          state.announce="BREAKER // RAM CHARGE INCOMING";
          state.announceClock=1.1;
          tone(400,.20,"triangle",.035,160);
        }
      }
      // Real inward charge; the turret does not take unavoidable contact
      // damage. Instead, a close-range fan fires when the ram reaches 108px.
      const target=b.chargeTime>0?94:b.baseRadius;
      const speed=b.chargeTime>0?275:180;
      b.radius+=clamp(target-b.radius,-speed*dt,speed*dt);
      if(b.counterPending)b.counterClock-=dt;
    }else{
      b.radius=b.baseRadius+10*Math.sin(b.age*.74);
      if(angry){
        if(b.turnWarning>0){
          b.turnWarning=Math.max(0,b.turnWarning-dt);
          if(!b.turnWarning){
            b.orbitDir*=-1;
            b.turnClock=rnd(1.65,3.55);
            tone(640,.10,"triangle",.025,290);
          }
        }else{
          b.turnClock-=dt;
          if(b.turnClock<=0){
            b.turnWarning=.32;
            setStatus("SENTINEL // DIRECTION REVERSAL");
          }
        }
      }
    }
    const speed=(b.type==="sentinel"?.65:.40)*
      (angry?1.43:1)*Math.min(1.6,1+Math.max(0,state.wave-7)*.018);
    b.angle+=b.orbitDir*speed*dt;
    b.x=CX+Math.cos(b.angle)*b.radius;
    b.y=CY+Math.sin(b.angle)*b.radius;
    if(b.type==="breaker"){
      if(b.chargeTime>0 && b.radius<=108 && !b.chargeBurstFired &&
        clearShotPath(b.x,b.y) && fireMiniBoss(b,"charge"))
        b.chargeBurstFired=true;
      if(b.counterPending && b.counterClock<=0){
        if(clearShotPath(b.x,b.y) && fireMiniBoss(b,"counter"))
          b.counterPending=false;
        else b.counterClock=.20; // Retry only when a real lane is open.
      }
    }
    if(b.fireWarning>0){
      b.fireWarning=Math.max(0,b.fireWarning-dt);
      if(!b.fireWarning){
        if(clearShotPath(b.x,b.y) && fireMiniBoss(b)){
          b.fireClock=b.type==="sentinel"?(angry?1.45:2.15):
            (angry?1.2:1.85);
        }else b.fireClock=.32;
      }
    }else{
      b.fireClock-=dt;
      if(b.fireClock<=0){
        b.fireWarning=b.type==="sentinel"?.58:.72;
        setStatus(b.type.toUpperCase()+" — WEAPONS CHARGING");
        tone(b.type==="sentinel"?640:480,.11,"triangle",.025,210);
      }
    }
  }
  function wardenCoreOpen(boss) {
    if(state.bossState!=="active")return false;
    const clock=boss.age%WARDEN_CYCLE;
    const [start,end]=WARDEN_OPEN_WINDOWS[boss.phase];
    return clock>=start && clock<end;
  }
  function fireWarden(boss) {
    const count=boss.phase===1?2:boss.phase===2?3:6;
    if(state.shots.filter(s=>!s.friendly).length+count>65)return;
    const angle=Math.atan2(CY-boss.y,CX-boss.x);
    const speed=165+boss.phase*19+(boss.phase===3?22:0);
    for(let i=0;i<count;i++) {
      const spread=(i-(count-1)/2)*(boss.phase===1?.19:.17);
      const a=angle+spread;
      state.shots.push({
        x:boss.x+Math.cos(a)*27,y:boss.y+Math.sin(a)*27,
        vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
        life:2.4,friendly:false,size:3.2,color:"#ff7258"
      });
    }
    tone(205+boss.phase*35,.085,"sawtooth",.026,90);
  }
  function updateWarden(dt) {
    if(state.wave!==4)return;
    if(state.bossState==="warning") {
      state.bossWarning-=dt;
      if(state.bossWarning<=0) {
        state.bossState="entering";
        state.boss={
          x:CX+Math.cos(-1.0)*(R+40),y:CY+Math.sin(-1.0)*(R+40),
          angle:-1.0,age:0,phase:1,hp:WARDEN_HP,
          guard:0,entry:1.15,fireClock:2.0,
          orbitDir:1,turnClock:5.5,turnWarning:0
        };
        state.announce="THE WARDEN APPROACHES";
        state.announceClock=1.7;
        setStatus("THE WARDEN — INBOUND");
        tone(100,.55,"sawtooth",.055,250);
      }
      return;
    }
    if(!state.boss)return;
    const b=state.boss;
    if(state.bossState==="entering") {
      b.entry=Math.max(0,b.entry-dt);
      const progress=1-b.entry/1.15;
      const radius=R+40-(R+40-210)*progress;
      b.x=CX+Math.cos(b.angle)*radius;
      b.y=CY+Math.sin(b.angle)*radius;
      if(b.entry<=0) {
        state.bossState="active";
        b.age=0;
        state.announce="THE WARDEN // SHOOT THE CYAN CORE";
        state.announceClock=2.4;
        setStatus("BOSS ENGAGED — TARGET THE CYAN CORE");
      }
      return;
    }
    if(state.bossState!=="active")return;
    b.age+=dt;b.guard=Math.max(0,b.guard-dt);
    // Later phases telegraph and reverse their orbits, giving the player
    // a visible cue without a cheap instantaneous teleport.
    if(b.phase>=2){
      if(b.turnWarning>0){
        b.turnWarning=Math.max(0,b.turnWarning-dt);
        if(!b.turnWarning){
          b.orbitDir*=-1;
          b.turnClock=b.phase===3?3.4:5.3;
          burst(b.x,b.y,"#ffb36c",8,.34);
        }
      }else{
        b.turnClock-=dt;
        if(b.turnClock<=0){
          b.turnWarning=.60;
          state.announce="WARDEN // FLANK REVERSAL";
          state.announceClock=.95;
          tone(360,.13,"triangle",.030,180);
        }
      }
    }
    const speed=b.phase===3?.94:b.phase===2?.62:.38;
    b.angle+=b.orbitDir*speed*dt;
    const radius=210+(b.phase===1?7:14)*Math.sin(b.age*(b.phase===3?1.05:.73))+
      (b.phase===3?7*Math.sin(b.age*1.93+.9):0);
    b.x=CX+Math.cos(b.angle)*radius;
    b.y=CY+Math.sin(b.angle)*radius;
    b.fireClock-=dt;
    if(b.fireClock<=0) {
      // Enemy volleys obey the existing wall hitboxes and firing lanes.
      if(clearShotPath(b.x,b.y)) {
        fireWarden(b);
        b.fireClock=[0,2.65,1.9,1.12][b.phase];
      } else b.fireClock=.28;
    }
  }
  function fireArchitect(b) {
    const count=b.phase===1?2:b.phase===2?3:6;
    if(state.shots.filter(s=>!s.friendly).length+count>62)return;
    const aim=Math.atan2(CY-b.y,CX-b.x);
    const speed=180+b.phase*21+(b.phase===3?20:0);
    for(let i=0;i<count;i++){
      const a=aim+(i-(count-1)/2)*.18;
      state.shots.push({x:b.x+Math.cos(a)*42,y:b.y+Math.sin(a)*42,
        vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
        life:2.6,friendly:false,size:3.5,color:"#c47bff"});
    }
    tone(260+b.phase*45,.12,"sawtooth",.035,75);
  }
  function updateArchitect(dt) {
    if(state.wave!==8)return;
    if(state.bossState==="warning") {
      state.bossWarning-=dt;
      if(state.bossWarning<=0) {
        state.bossState="entering";
        state.architectRingSpins=state.rings.map(r=>r.spin);
        state.rings.forEach(r=>{r.reversePending=false;r.warning=0;});
        state.boss={type:"architect",phase:1,hp:ARCHITECT_HP,
          x:CX,y:CY-R-45,angle:-Math.PI/2,age:0,guard:0,
          entry:1.45,fireClock:1.7,reverseClock:5.5,reverseWarning:0,
          reverseTime:0,radius:170,laneTarget:170,laneClock:4.4,
          orbitDir:1};
        state.announce="THE ARCHITECT // ARENA OVERRIDE";
        state.announceClock=2.2;
        setStatus("BOSS INBOUND — THE ARCHITECT");
        tone(96,.65,"sawtooth",.06,235);
      }
      return;
    }
    const b=state.boss;
    if(!b || b.type!=="architect")return;
    if(state.bossState==="entering") {
      b.entry=Math.max(0,b.entry-dt);
      const radius=R+45-(R+45-171)*(1-b.entry/1.45);
      b.x=CX+Math.cos(b.angle)*radius;
      b.y=CY+Math.sin(b.angle)*radius;
      if(b.entry<=0) {
        state.bossState="active";
        b.age=0;
        state.announce="THE ARCHITECT // TARGET VIOLET CORE";
        state.announceClock=2.3;
        setStatus("ARCHITECT ENGAGED — CORE EXPOSES PERIODICALLY");
      }
      return;
    }
    if(state.bossState!=="active")return;
    b.age+=dt;b.guard=Math.max(0,b.guard-dt);
    if(b.phase>=2) {
      b.laneClock-=dt;
      if(b.laneClock<=0){
        // The Architect moves between wall rings rather than camping on
        // one orbit. No teleport: translate radially at a capped speed.
        b.laneTarget=b.laneTarget<175?196:147;
        b.laneClock=b.phase===3?2.75:4.1;
        b.orbitDir*=-1;
        state.announce="ARCHITECT // SECTOR SHIFT";
        state.announceClock=1.1;
        tone(290,.16,"triangle",.030,520);
      }
      const radialSpeed=b.phase===3?42:30;
      b.radius+=clamp(b.laneTarget-b.radius,-radialSpeed*dt,radialSpeed*dt);
    }
    const orbitSpeed=b.phase===3?.84:b.phase===2?.50:.24;
    b.angle+=b.orbitDir*orbitSpeed*dt;
    const radius=b.radius+(b.phase===1?8:5)*Math.sin(b.age*.9);
    b.x=CX+Math.cos(b.angle)*radius;
    b.y=CY+Math.sin(b.angle)*radius;
    // Unlike the Warden, this boss operates the real wall state. A warning
    // comes before each timed reversal. All speeds revert upon victory.
    if(b.reverseTime>0) {
      b.reverseTime=Math.max(0,b.reverseTime-dt);
      if(!b.reverseTime) {
        state.rings.forEach((r,i)=>r.spin=state.architectRingSpins[i]);
        b.reverseClock=b.phase===3?2.9:5.0;
        state.announce="WALL CONTROL RESTORED";
        state.announceClock=1;
      }
    } else if(b.phase>=2 && b.reverseWarning>0) {
      b.reverseWarning=Math.max(0,b.reverseWarning-dt);
      state.rings.forEach(r=>r.warning=b.reverseWarning);
      if(!b.reverseWarning) {
        state.rings.forEach(r=>{r.spin*=-1;r.reversePending=false;r.warning=0;});
        b.reverseTime=b.phase===3?2.7:2.2;
        state.announce="RING REVERSAL // THE ARCHITECT";
        state.announceClock=1.6;
        tone(140,.28,"sawtooth",.045,310);
      }
    } else if(b.phase>=2) {
      b.reverseClock-=dt;
      if(b.reverseClock<=0) {
        b.reverseWarning=.95;
        state.rings.forEach(r=>{r.reversePending=true;r.warning=.95;});
        state.announce="WARNING // RINGS REVERSING";
        state.announceClock=1.1;
        setStatus("ARCHITECT OVERRIDE — RING REVERSAL IMMINENT");
        tone(410,.22,"triangle",.037,230);
      }
    }
    b.fireClock-=dt;
    if(b.fireClock<=0) {
      if(clearShotPath(b.x,b.y)) {
        fireArchitect(b);
        b.fireClock=b.phase===1?2.15:b.phase===2?1.75:1.10;
      } else b.fireClock=.25;
    }
  }
  function leviathanRotation(b) {
    // Sprite points upward at zero rotation; nose follows inward travel.
    return Math.atan2(CY-b.y,CX-b.x)+Math.PI/2;
  }
  function leviathanPodPosition(b,index) {
    const p=LEVIATHAN_PODS[index],rot=leviathanRotation(b);
    return {x:b.x+p.x*Math.cos(rot)-p.y*Math.sin(rot),
      y:b.y+p.x*Math.sin(rot)+p.y*Math.cos(rot)};
  }
  function leviathanThreatTier(b) {
    // A genuine mid-fight escalation after two pods (~60% total armor).
    // The final tier begins below 25% of the original combined armor.
    return b.phase==="fury"?2:
      b.phase!=="pods" || b.pods.filter(p=>p.hp<=0).length>=2?1:0;
  }
  function leviathanCoreOpen(b) {
    if(state.wave!==12 || state.bossState!=="active" ||
       !b || b.type!=="leviathan" || b.pods.some(p=>p.hp>0))return false;
    const cycle=b.phase==="fury"?2.9:3.4;
    const t=b.age%cycle;
    return t>=(b.phase==="fury"?.74:1.08) &&
      t<=(b.phase==="fury"?2.23:2.60);
  }
  function destroyLeviathan() {
    const b=state.boss;
    if(!b || b.type!=="leviathan")return;
    state.score+=4000;
    state.leviathanVictories++;
    if(!state.testMode && state.score>state.high){
      state.high=state.score;storeHigh();
    }
    // Keep a separate, visible wreck after the boss is removed from combat.
    // This is cosmetic; all targeting, rewards and encounter logic stay intact.
    state.leviathanDeath={x:b.x,y:b.y,rotation:leviathanRotation(b),age:0,stage:0};
    state.boss=null;state.bossState="defeated";state.bossDefeated=true;
    state.clearBossShots=true;
    // Reinforcement robots cease functioning when their command core dies.
    for(let k=state.bots.length-1;k>=0;k--){
      if(!state.bots[k].leviathanReinforcement)continue;
      burst(state.bots[k].x,state.bots[k].y,"#ffbb83",10,.5);
      state.bots.splice(k,1);
    }
    state.announce="THE LEVIATHAN DESTROYED // +4000";
    state.announceClock=3.1;
    setStatus("LEVIATHAN DEFEATED — COMMAND SYSTEMS COLLAPSE");
    state.shake=12;state.flash=.35;
    for(let i=0;i<3;i++){
      const a=i*TAU/3;
      burst(b.x+Math.cos(a)*40,b.y+Math.sin(a)*30,
        i%2?"#ffb34e":"#ff4e78",18,1.15);
    }
    tone(91,.62,"sawtooth",.09,36);
    tone(175,.49,"triangle",.05,64,.17);
    tone(530,.42,"triangle",.045,160,.36);
  }
  function updateLeviathanDeath(dt) {
    const d=state.leviathanDeath;
    if(!d)return;
    d.age+=dt;
    // Stagger the reactor explosions rather than spending the entire effect
    // on the same animation frame. The final core blast is the largest.
    const stages=[
      {at:.35,dx:-52,dy:-27,color:"#ffb44a",count:20},
      {at:.75,dx:55,dy:22,color:"#ff567e",count:20},
      {at:1.20,dx:0,dy:0,color:"#fff2b4",count:42},
      {at:1.65,dx:-8,dy:15,color:"#ff8054",count:21}
    ];
    while(d.stage<stages.length && d.age>=stages[d.stage].at){
      const step=stages[d.stage];
      const finale=d.stage===2;
      burst(d.x+step.dx,d.y+step.dy,step.color,step.count,
        finale?2:1.35);
      if(finale){
        state.flash=Math.max(state.flash,.75);
        state.shake=Math.max(state.shake,15);
        state.shockwaves.push({x:d.x,y:d.y,color:"#ffb46b",
          life:1,maxLife:1,radius:210});
        tone(75,.7,"sawtooth",.08,32);
      }else tone(160-d.stage*30,.20,"sawtooth",.035,65);
      d.stage++;
    }
    if(d.age>=LEVIATHAN_DEATH_SECONDS)state.leviathanDeath=null;
  }
  function damageLeviathanPod(index,damage=1) {
    const b=state.boss;
    if(!b || b.type!=="leviathan" || state.bossState!=="active")return false;
    const p=b.pods[index];
    if(!p || p.hp<=0)return false;
    if(p.guard>0)return true;
    p.hp=Math.max(0,p.hp-damage);p.guard=.15;
    const where=leviathanPodPosition(b,index);
    burst(where.x,where.y,p.hp?"#ffe1ab":"#ff865a",p.hp?9:22,p.hp?.55:1.15);
    state.shake=Math.max(state.shake,p.hp?3:7);
    tone(p.hp?360:120,.18,"sawtooth",.055,p.hp?155:53);
    if(p.hp===0){
      const destroyed=b.pods.filter(p=>p.hp<=0).length;
      b.stage=destroyed;
      b.age=0; // Reset core vulnerability timing on armor removal.
      state.announce="LEVIATHAN // POD "+index+" DISABLED";
      state.announceClock=1.75;
      if(destroyed===3){
        b.phase="core";b.coreFireClock=1.0;b.coreWarning=0;
        state.announce="LEVIATHAN REACTOR EXPOSED // "+LEVIATHAN_CORE_HP+" HITS";
        state.announceClock=2.4;
        setStatus("PODS ELIMINATED — SHOOT THE OPEN RED REACTOR");
      } else if(destroyed===2){
        b.barrageClock=Math.min(b.barrageClock,.35);
        state.announce="LEVIATHAN // COUNTERATTACK SYSTEMS ONLINE";
        state.announceClock=1.9;
        setStatus("WARNING — LEVIATHAN FIREPOWER INCREASING");
      } else {
        setStatus("WEAPON POD DESTROYED — "+(3-destroyed)+" REMAIN");
      }
    }
    return true;
  }
  function damageLeviathanCore() {
    const b=state.boss;
    if(!leviathanCoreOpen(b) || b.coreGuard>0)return false;
    // Each successful, accurately placed hit counts as ONE reactor hit.
    // Powerful weapons help break the pods, but cannot skip the boss phases.
    b.coreHp--;b.coreGuard=.45;
    burst(b.x,b.y,"#fff3a8",23,.95);
    state.shake=Math.max(state.shake,8);
    tone(470+(LEVIATHAN_CORE_HP-b.coreHp)*70,.20,"sawtooth",.065,1100);
    if(b.coreHp<=0){
      destroyLeviathan();
    }else if(b.coreHp<=5 && b.phase!=="fury"){
      b.phase="fury";b.stage=4;b.age=0;
      b.chargeClock=1.65;b.chargeWarning=0;b.chargeTime=0;
      b.coreFireClock=.4;b.coreWarning=0;
      b.barrageClock=.25;b.laneClock=.2;b.surgeTime=1.0;
      b.jukeWarning=0;
      state.announce="LEVIATHAN // FINAL ASSAULT";
      state.announceClock=2.2;
      setStatus("REACTOR CRITICAL — LEVIATHAN ENRAGED");
    }else{
      state.announce="REACTOR HIT // "+b.coreHp+" REMAIN";
      state.announceClock=1.25;
      setStatus("LEVIATHAN CORE — "+b.coreHp+"/"+LEVIATHAN_CORE_HP);
    }
    return true;
  }
  function leviathanTargetShot(b,x,y,damage=1,beam=false) {
    // Normal shots collide with a localized pod or the reactor, not
    // the full visual silhouette. Railgun uses the same actual hitboxes.
    if(!b || b.type!=="leviathan" || state.bossState!=="active")
      return false;
    for(let i=0;i<3;i++){
      const pod=b.pods[i];if(pod.hp<=0)continue;
      const at=leviathanPodPosition(b,i);
      if(Math.hypot(x-at.x,y-at.y)<(beam?20:17)){
        damageLeviathanPod(i,damage);return true;
      }
    }
    if(Math.hypot(x-b.x,y-b.y)<(beam?22:18)){
      if(b.pods.some(p=>p.hp>0)){
        burst(x,y,"#ff9569",3,.20);return true;
      }
      if(leviathanCoreOpen(b))damageLeviathanCore();
      else burst(x,y,"#ff9767",3,.22);
      return true;
    }
    return false;
  }
  function fireLeviathanVolley(x,y,count,speed,color,spread,aimOffset=0) {
    // Hard cap keeps simultaneous cannon batteries inexpensive on Chromebooks.
    const active=state.shots.reduce((n,s)=>n+(!s.friendly?1:0),0);
    if(active+count>65)return false;
    const direction=Math.atan2(CY-y,CX-x)+aimOffset;
    for(let i=0;i<count;i++){
      const a=direction+(i-(count-1)/2)*spread;
      state.shots.push({x:x+Math.cos(a)*21,y:y+Math.sin(a)*21,
        vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
        life:2.65,friendly:false,size:3.5,
        color,leviathan:true});
    }
    tone(count>=5?155:245,.14,"sawtooth",.032,90);
    return true;
  }
  function fireLeviathanHullGuns(b,tier) {
    // Emergency hull batteries remain operational even after the big pods
    // have been destroyed. Two offset muzzles fire crossing aimed fans.
    const rot=leviathanRotation(b),c=Math.cos(rot),s=Math.sin(rot);
    let fired=false;
    for(const side of [-1,1]){
      const dx=side*38,dy=-8;
      const x=b.x+dx*c-dy*s,y=b.y+dx*s+dy*c;
      if(!clearShotPath(x,y))continue;
      fired=fireLeviathanVolley(x,y,tier===2?5:3,
        tier===2?302:tier===1?270:238,
        tier===2?"#ff527d":"#ffbd7b",tier===2?.15:.19,
        side*(tier===2?.035:0))||fired;
    }
    if(fired)b.hullPulse=.22;
    return fired;
  }
  function updateLeviathan(dt) {
    if(state.wave!==12)return;
    if(state.bossState==="warning"){
      state.bossWarning-=dt;
      if(state.bossWarning<=0){
        const pods=LEVIATHAN_PODS.map((p,i)=>({
          hp:LEVIATHAN_POD_HP,maxHp:LEVIATHAN_POD_HP,
          guard:0,clock:1.05+i*.26,warning:0
        }));
        state.boss={type:"leviathan",x:CX,y:CY-R-50,
          angle:-Math.PI/2,radius:R+50,entry:1.6,
          age:0,stage:0,phase:"pods",pods,coreHp:LEVIATHAN_CORE_HP,
          coreGuard:0,coreFireClock:1.0,coreWarning:0,
          reinforceClock:4.1,reinforcements:0,
          chargeClock:2.6,chargeWarning:0,chargeTime:0,
          orbitDir:1,laneTarget:160,laneClock:2.6,
          jukeClock:2.8,jukeWarning:0,surgeTime:0,
          barrageClock:1.0,hullPulse:0,threatTier:0};
        state.bossState="entering";
        state.announce="THE LEVIATHAN APPROACHES";
        state.announceClock=2.4;
        setStatus("WAVE 12 — STRATEGIC WAR PLATFORM INBOUND");
        tone(78,.75,"sawtooth",.075,190);
      }
      return;
    }
    const b=state.boss;
    if(!b || b.type!=="leviathan")return;
    if(state.bossState==="entering"){
      b.entry=Math.max(0,b.entry-dt);
      b.radius=R+50-(R+50-160)*(1-b.entry/1.6);
      b.x=CX+Math.cos(b.angle)*b.radius;
      b.y=CY+Math.sin(b.angle)*b.radius;
      if(!b.entry){
        b.age=0;state.bossState="active";
        state.announce="LEVIATHAN // DESTROY THREE WEAPON PODS";
        state.announceClock=3;
        setStatus("BOSS ENGAGED — TARGET WEAPON PODS");
      }
      return;
    }
    if(state.bossState!=="active")return;
    // Only Wave 12 changes. Boss timers remain immune to Stasis; spawned
    // ordinary reinforcements still obey the normal slowdown rules.
    b.age+=dt;
    b.coreGuard=Math.max(0,b.coreGuard-dt);
    b.hullPulse=Math.max(0,b.hullPulse-dt);
    for(const p of b.pods)p.guard=Math.max(0,p.guard-dt);
    const tier=leviathanThreatTier(b),furious=tier===2;
    if(tier>b.threatTier){
      b.threatTier=tier;
      b.barrageClock=Math.min(b.barrageClock,.4);
      b.laneClock=Math.min(b.laneClock,.3);
      b.surgeTime=Math.max(b.surgeTime,.8);
    }
    b.surgeTime=Math.max(0,b.surgeTime-dt);

    // Predatory orbit: lane changes force new aim, feints reverse direction,
    // and short acceleration bursts punish parking the reticle in one spot.
    b.laneClock-=dt;
    if(b.laneClock<=0){
      b.laneTarget=b.laneTarget<150?172:furious?120:132;
      b.laneClock=furious?1.65:tier===1?2.25:3.0;
    }
    if(!furious){
      if(b.jukeWarning>0){
        b.jukeWarning=Math.max(0,b.jukeWarning-dt);
        if(!b.jukeWarning){
          b.orbitDir*=-1;
          b.surgeTime=1.1;
          b.jukeClock=tier===1?rnd(1.8,2.6):rnd(2.9,4.2);
        }
      }else{
        b.jukeClock-=dt;
        if(b.jukeClock<=0){
          b.jukeWarning=.32; // Visible brief feint before reversing.
          tone(420,.11,"triangle",.027,210);
        }
      }
    }else{
      if(b.chargeWarning>0){
        b.chargeWarning=Math.max(0,b.chargeWarning-dt);
        if(!b.chargeWarning){
          b.chargeTime=1.05;
          b.orbitDir*=-1;
          b.surgeTime=1.5;
          tone(100,.3,"sawtooth",.052,250);
        }
      }else if(b.chargeTime>0){
        b.chargeTime=Math.max(0,b.chargeTime-dt);
        if(!b.chargeTime)b.chargeClock=2.15;
      }else{
        b.chargeClock-=dt;
        if(b.chargeClock<=0){
          b.chargeWarning=.68;
          state.announce="LEVIATHAN // RAMMING RUN";
          state.announceClock=1.1;
          setStatus("DANGER — LEVIATHAN CHARGE WARNING");
          tone(390,.24,"triangle",.035,110);
        }
      }
    }
    const baseSpeed=furious?1.22:tier===1?.86:.57;
    const warningScale=b.jukeWarning>0?.72:1;
    b.angle+=b.orbitDir*baseSpeed*(b.surgeTime>0?1.48:1)*
      warningScale*dt;
    const desired=furious && b.chargeTime>0?108:b.laneTarget;
    const radialSpeed=furious?100:tier===1?68:42;
    b.radius+=clamp(desired-b.radius,-radialSpeed*dt,radialSpeed*dt);
    const oscillation=5*Math.sin(b.age*1.4);
    b.x=CX+Math.cos(b.angle)*(b.radius+oscillation);
    b.y=CY+Math.sin(b.angle)*(b.radius+oscillation);

    // Every surviving weapon pod now fires frequently. At stage two the
    // batteries switch to wider five-shot attacks, not just more hit points.
    if(b.phase==="pods"){
      for(let i=0;i<3;i++){
        const p=b.pods[i];if(p.hp<=0)continue;
        const origin=leviathanPodPosition(b,i);
        if(p.warning>0){
          p.warning=Math.max(0,p.warning-dt);
          if(!p.warning){
            const shots=tier>=1?5:3;
            if(clearShotPath(origin.x,origin.y) &&
                fireLeviathanVolley(origin.x,origin.y,shots,
                  tier>=1?285:i===1?282:248,
                  i===1?"#fff09d":"#ff8e78",
                  tier>=1?.15:i===1?.11:.20)){
              p.clock=tier>=1?1.35:i===1?1.7:1.95;
            }else p.clock=.38;
          }
        }else{
          p.clock-=dt;
          if(p.clock<=0){
            p.warning=tier>=1?.30:.38;
            tone(480+i*80,.10,"triangle",.022,270);
          }
        }
      }
    }else{
      if(b.coreWarning>0){
        b.coreWarning=Math.max(0,b.coreWarning-dt);
        if(!b.coreWarning){
          if(clearShotPath(b.x,b.y) &&
            fireLeviathanVolley(b.x,b.y,furious?7:5,
              furious?315:274,furious?"#ff5179":"#ff956c",
              furious?.15:.14)){
            b.coreFireClock=furious?.78:1.25;
          }else b.coreFireClock=.25;
        }
      }else{
        b.coreFireClock-=dt;
        if(b.coreFireClock<=0){
          b.coreWarning=furious?.26:.40;
          tone(furious?710:510,.12,"triangle",.032,200);
        }
      }
    }
    // Additional twin emergency batteries continue throughout the fight,
    // including after all three destructible pods are gone.
    b.barrageClock-=dt;
    if(b.barrageClock<=0){
      if(fireLeviathanHullGuns(b,tier))
        b.barrageClock=furious?.92:tier===1?1.50:2.55;
      else b.barrageClock=.28;
    }
    // Reinforcements remain strictly limited in count and do not inflate
    // waveTotal or toSpawn. No new effects or physics loops per projectile.
    if(b.reinforcements<LEVIATHAN_REINFORCEMENT_TOTAL){
      b.reinforceClock-=dt;
      if(b.reinforceClock<=0){
        const active=state.bots.filter(x=>x.leviathanReinforcement).length;
        if(active<LEVIATHAN_REINFORCEMENT_CAP){
          const before=state.bots.length;
          if(spawnBot()){
            const minion=state.bots[state.bots.length-1];
            if(minion && state.bots.length>before){
              minion.leviathanReinforcement=true;
              b.reinforcements++;
              burst(minion.x,minion.y,"#f16e83",7,.35);
              b.reinforceClock=furious?2.5:tier===1?3.0:3.6;
            }
          }else b.reinforceClock=.65;
        }else b.reinforceClock=.7;
      }
    }
  }
  function updateShieldCapsule(dt) {
    if (state.wave!==4) return;
    // Once 90% of robots have been eliminated, exactly one capsule flies by.
    // The threshold is based on enemy count, not elapsed time or play speed.
    state.waveElapsed+=dt;
    const eliminated=state.waveTotal-(state.toSpawn+state.bots.length);
    if (!state.shieldCapsuleSeen && state.bossState==="none" &&
        state.waveTotal>0 &&
        eliminated>=Math.ceil(state.waveTotal*SHIELD_CAPSULE_KILL_THRESHOLD)) {
      state.shieldCapsuleSeen=true;
      state.shieldCapsule={
        x:CX-R-24, y:CY-82, vx:SHIELD_CAPSULE_SPEED
      };
      state.announce="SHIELD CAPSULE INBOUND — SHOOT TO RECHARGE";
      state.announceClock=2;
    }
    const capsule=state.shieldCapsule;
    if (!capsule) return;
    capsule.x+=capsule.vx*dt; // No wallHit: the capsule phases through walls.
    if (capsule.x>CX+R+24) state.shieldCapsule=null;
  }
  function updateParticles(dt) {
    for (let i=state.particles.length-1;i>=0;i--) {
      const p=state.particles[i];p.life-=dt;
      if (p.life<=0) {state.particles.splice(i,1);continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      p.vx*=Math.max(0,1-2*dt);p.vy*=Math.max(0,1-2*dt);
    }
  }
  function updateWave(dt) {
    if (state.toSpawn>0 && state.bots.length<Math.min(68,34+state.wave*3)) {
      state.spawnClock-=dt;
      if (state.spawnClock<=0) {
        if (spawnBot()) state.toSpawn--;
        state.spawnClock=Math.max(.16,rnd(.31,.52)-state.wave*.008);
      }
    }
    const miniType=miniTypeForWave(state.wave);
    if(miniType && !state.miniBossSeen && state.waveTotal>0 &&
       state.waveTotal-(state.toSpawn+state.bots.length)>=
       Math.ceil(state.waveTotal*.5))beginMiniBoss();
    if (!state.toSpawn && !state.bots.length) {
      // A mini-boss may arrive halfway through the wave. Clearing the
      // small robots cannot skip its encounter or trigger graduation.
      if(miniType && (state.miniBossState!=="defeated" ||
          state.miniRewardPending))return;
      if((state.wave===4 || state.wave===8 || state.wave===12) &&
          !state.bossDefeated) {
        if(state.wave===4 && (!state.shieldCapsuleSeen || state.shieldCapsule))
          return;
        // Boss waves cannot graduate until the corresponding boss dies.
        if(state.bossState==="none") {
          state.bossState="warning";
          state.bossWarning=state.wave===12?3.0:state.wave===8?2.7:2.35;
          state.shots=state.shots.filter(s=>s.friendly);
          state.announce=state.wave===12?"WARNING: STRATEGIC THREAT APPROACHING":
            state.wave===8?"WARNING: ARENA CONTROL COMPROMISED":
            "WARNING: SECTOR NOT CLEARED";
          state.announceClock=state.bossWarning;
          state.flash=.14;
          tone(185,.28,"sawtooth",.055,120);
          setStatus(state.announce);
        }
        return;
      }
      // Let the Leviathan's death play out before the graduation plaque can
      // cover the wreck. The ordinary two-second ceremony is unchanged.
      if(state.leviathanDeath)return;
      if (state.waveClock===0) {
        // Begin a single, two-second graduation for every cleared wave.
        // Decorative only: no changes to rings, hitboxes or combat timing.
        graduationFanfare(state.wave);
        const color="hsl("+visualEvolution(state.wave).hue+",95%,72%)";
        burst(CX-158,CY+8,color,15,.85);
        burst(CX+158,CY+8,"#ffe2a0",15,.85);
        burst(CX,CY-100,"#f5fdff",12,.7);
        setStatus("WAVE "+String(state.wave).padStart(2,"0")+
          " CLEARED — GRADUATION CEREMONY");
      }
      state.waveClock+=dt;
      if (state.waveClock>2) {
        state.wave++;
        state.waveElapsed=0;
        state.shieldCapsule=null;state.shieldCapsuleSeen=false;
        state.supplyDrone=null; // A missed pass does not cross graduation.
        state.boss=null;state.bossState="none";
        state.bossWarning=0;state.bossDefeated=false;
        state.leviathanDeath=null;
        state.miniBoss=null;state.miniBossState="none";
        state.miniBossWarning=0;state.miniBossSeen=false;
        state.clearMiniShots=false;state.miniRewardPending=null;
        state.otto=null; // No carried-over visit during graduations.
        state.architectRingSpins=null;
        // Changing sectors changes real walls as well as the decorative field.
        // Preserve their angular orientation so the handoff feels continuous.
        state.rings=makeRings(state.wave,state.rings);
        if (state.wave===5) state.twinCannons=true;
        if (state.wave===4) {
          state.shieldUnlocked=true;
          state.shieldCharges=SHIELD_MAX;
          state.shieldRegen=0;
          flashShield(-1,.50);
        }
        if (state.wave===5 && state.wave4DirectKills>=HEAVY_KILLS_REQUIRED)
          state.heavyLaser=true;
        if (state.wave===7) {
          state.penetrator=true;
          state.penCharge=0;
        }
        if (state.wave===9) {
          state.arcCannon=true;
          state.arcCharge=0;
        }
        state.toSpawn=Math.min(120,10+state.wave*5);
        state.waveTotal=state.toSpawn;
        state.spawnClock=.35;
        state.waveClock=0;
        state.invuln=Math.max(state.invuln,.8);
        state.score+=500;
        if (!state.testMode && state.score>state.high) {state.high=state.score;storeHigh();}
        state.announce="WAVE " + String(state.wave).padStart(2,"0") + " — " + waveName();
        state.announceClock=2.5;
        state.revealClock=1.45; // Purely visual sector handoff.
        const gained=state.wave===4?" — SHIELD ONLINE":
          state.wave===5?" — TWIN CANNONS ONLINE"+
            (state.heavyLaser?" + HEAVY LASER ONLINE":""):
          state.wave===7?" — RAILGUN ONLINE":
          state.wave===9?" — ARC CANNON ONLINE":"";
        setStatus("WAVE " + String(state.wave).padStart(2,"0") + " — " + waveName()+gained);
        if (state.wave%3===0) state.rings.forEach((ring,i)=>{
          ring.reverseClock=Math.min(ring.reverseClock,2+i*1.3);
        });
        tone(450,.14,"triangle",.06,750);
      }
    } else state.waveClock=0;
  }
  function updateAim(dt) {
    // Arrow/Q/E keys supply a direction. Mouse, touch, WASD and the pad supply
    // a destination, but ALL steering shares one capped angular velocity.
    const ccw = keys.has("ArrowLeft") || keys.has("ArrowUp") || keys.has("q") || keys.has("Q");
    const cw = keys.has("ArrowRight") || keys.has("ArrowDown") || keys.has("e") || keys.has("E");
    const manual = ccw !== cw;
    let error = 0, desiredVelocity = 0;
    if (manual) {
      state.aimTarget = null; // Manual keys take over from the last pointer target.
      desiredVelocity = cw ? TURRET_MAX_SPEED : -TURRET_MAX_SPEED;
    } else if (state.aimTarget !== null) {
      error = angleDiff(state.aimTarget * Math.PI/4, state.aim * Math.PI/4);
      // Approach smoothly; never bypass the speed limit for a new target.
      const approachSpeed = Math.sqrt(2 * TURRET_BRAKE * Math.abs(error));
      desiredVelocity = Math.sign(error) * Math.min(TURRET_MAX_SPEED, approachSpeed);
      if (Math.abs(error) < .001) desiredVelocity = 0;
    }
    const slowing = Math.abs(desiredVelocity) < Math.abs(state.aimVelocity) ||
      (desiredVelocity && state.aimVelocity && Math.sign(desiredVelocity) !== Math.sign(state.aimVelocity));
    const maxChange = (slowing ? TURRET_BRAKE : TURRET_ACCEL) * dt;
    state.aimVelocity += clamp(desiredVelocity - state.aimVelocity, -maxChange, maxChange);
    let turn = state.aimVelocity * dt;
    if (!manual && state.aimTarget !== null && Math.sign(turn) === Math.sign(error) &&
        Math.abs(turn) >= Math.abs(error)) {
      // The small final step lands on target rather than jumping across it.
      turn = error;
      state.aimVelocity = 0;
    }
    if (turn !== 0) {
      state.aim = ((state.aim + turn * 4 / Math.PI) % 8 + 8) % 8;
      syncAimPad();
    }
  }

  function update(dt) {
    updateAim(dt);
    updateArena(dt);
    state.invuln=Math.max(0,state.invuln-dt);
    state.shotGrace=Math.max(0,state.shotGrace-dt);
    if(state.shieldUnlocked && state.shieldCharges<SHIELD_MAX) {
      state.shieldRegen+=dt;
      if(state.shieldRegen>=SHIELD_REGEN_SECONDS) {
        state.shieldCharges++;
        state.shieldRegen-=SHIELD_REGEN_SECONDS;
        flashShield(state.shieldCharges-1,.45); // One restored shield segment.
      }
    } else state.shieldRegen=0;
    if(state.penetrator) state.penCharge=Math.max(0,state.penCharge-dt);
    if(state.arcCannon) state.arcCharge=Math.max(0,state.arcCharge-dt);
    for(let i=state.arcLinks.length-1;i>=0;i--){
      state.arcLinks[i].life-=dt;
      if(state.arcLinks[i].life<=0)state.arcLinks.splice(i,1);
    }
    state.railFlash=Math.max(0,state.railFlash-dt);
    state.fireClock-=dt;
    if(state.powerup){
      state.powerClock=Math.max(0,state.powerClock-dt);
      if(state.powerClock===0){
        state.powerup=null;
        state.guardianClock=0;
      }
    }
    state.announceClock=Math.max(0,state.announceClock-dt);
    state.revealClock=Math.max(0,state.revealClock-dt);
    state.flash=Math.max(0,state.flash-dt);
    state.shake=Math.max(0,state.shake-dt*22);
    state.turretKick=Math.max(0,state.turretKick-dt*10);
    state.muzzleFlash=Math.max(0,state.muzzleFlash-dt);
    state.shieldFlash=Math.max(0,state.shieldFlash-dt);
    state.comboClock=Math.max(0,state.comboClock-dt);
    if (!state.comboClock) state.combo=0;
    if ((keys.has(" ")||keys.has("Enter")||pointerFiring||buttonFiring) && state.fireClock<=0) {
      firePlayer();
      state.fireClock=.115;
    }
    updateWave(dt);
    updateSupplyDrone(dt);
    updateBots(dt);
    updateMiniBoss(dt);
    updateOtto(dt);
    updateGuardians(dt);
    if (state.phase==="playing") {
      updateShieldCapsule(dt);
      updateWarden(dt);
      updateArchitect(dt);
      updateLeviathan(dt);
      updateLeviathanDeath(dt);
      updateShots(dt);
    }
    updateBlasts(dt);
    awardScoreLives(); // Include kills, chain reactions, boss and wave bonuses.
    updateParticles(dt);
    for (let i=state.shockwaves.length-1;i>=0;i--) {
      state.shockwaves[i].life-=dt;
      if (state.shockwaves[i].life<=0) state.shockwaves.splice(i,1);
    }
    for (let i=state.impacts.length-1;i>=0;i--) {
      state.impacts[i].life-=dt;
      if (state.impacts[i].life<=0) state.impacts.splice(i,1);
    }
  }

  function line(x1,y1,x2,y2,color,width=1) {
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();
    ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }
  // Decorative only. A distinct sector composition arrives on EVERY wave.
  // Visual complexity stops growing after Wave 9, leaving GPU headroom for
  // planned shields, extra cannons, powerups and explosions.
  function visualEvolution(wave=state.wave) {
    const stage=Math.min(9,Math.max(1,wave));
    const names=["CONTACT","RADAR","PRISM","REACTOR","VECTOR","PHANTOM","KALEIDOSCOPE","PULSE","COSMOS"];
    const hues=[225,176,295,23,147,207,273,46,329];
    const growth=(Math.pow(1.37,stage-1)-1)/(Math.pow(1.37,8)-1);
    return {
      stage, level:wave, name:names[stage-1],
      hue:(hues[stage-1]+Math.max(0,wave-9)*37)%360,
      power:stage===1?0:.40+.60*growth,
      tempo:1+Math.min(1.3,(wave-1)*.09)
    };
  }

  // Bright sector motifs are BELOW solid walls, robots and shots. The inner
  // 72px stays clear for the turret and its future weapon/shield hardware.
  function drawEvolutionField(v) {
    if(v.stage<2)return;
    const t=state.elapsed*v.tempo, hue=v.hue;
    // Sharp, colorful geometry; no translucent bloom cloud over the action.
    const ink=(shift,opacity,light=65)=>"hsla("+((hue+shift+360)%360)+",95%,"+light+"%,"+(opacity*.72)+")";
    ctx.save();
    ctx.translate(CX,CY);
    ctx.beginPath();
    ctx.arc(0,0,R-10,0,TAU);
    ctx.arc(0,0,72,0,TAU,true);
    ctx.clip("evenodd");
    ctx.lineJoin="round";
    ctx.lineCap="round";

    // Wave 2: wide radar spokes and a rotating sweep. Not a faint wire grid.
    if(v.stage===2) {
      ctx.save();ctx.rotate(t*.22);
      ctx.fillStyle=ink(0,.11);ctx.strokeStyle=ink(0,.52);ctx.lineWidth=2.8;
      for(let k=0;k<12;k++){
        const a=k*TAU/12;
        ctx.beginPath();ctx.moveTo(0,0);
        ctx.lineTo(Math.cos(a-.045)*252,Math.sin(a-.045)*252);
        ctx.lineTo(Math.cos(a+.045)*252,Math.sin(a+.045)*252);
        ctx.closePath();if(k%2===0)ctx.fill();ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle=ink(35,.46);ctx.lineWidth=3;ctx.beginPath();
      for(const r of [98,166,233]){ctx.moveTo(r,0);ctx.arc(0,0,r,0,TAU);}
      ctx.stroke();
    }
    // Wave 3 — PRISM: enormous crystalline spires with broken facets.
    // Sharp edges, translucent triangular planes, no decorative circles.
    else if(v.stage===3) {
      ctx.save();ctx.rotate(-t*.11);
      for(let k=0;k<7;k++){
        const a=k*TAU/7;
        const s=Math.sin(t*.8+k*2.1),r=204+18*s;
        ctx.save();ctx.rotate(a);
        ctx.fillStyle=k%2?ink(28,.20,43):ink(-20,.18,50);
        ctx.strokeStyle=k%2?ink(45,.88,82):ink(0,.84,76);
        ctx.lineWidth=2.6;
        ctx.beginPath();
        ctx.moveTo(78,-12);ctx.lineTo(r*.79,-43);
        ctx.lineTo(254,-6);ctx.lineTo(r*.75,36);
        ctx.closePath();ctx.fill();ctx.stroke();
        ctx.strokeStyle=ink(90,.60,92);ctx.lineWidth=1.3;
        ctx.beginPath();ctx.moveTo(78,-12);ctx.lineTo(254,-6);
        ctx.lineTo(r*.75,36);ctx.stroke();
        ctx.fillStyle=ink(95,.10,85);
        ctx.beginPath();ctx.moveTo(r*.79,-43);ctx.lineTo(254,-6);
        ctx.lineTo(r*.65,-1);ctx.closePath();ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      // Floating splinters gently counter-rotate behind the real walls.
      ctx.save();ctx.rotate(t*.19);
      ctx.fillStyle=ink(55,.28,79);ctx.strokeStyle=ink(18,.78,83);
      ctx.lineWidth=1.4;ctx.beginPath();
      for(let k=0;k<14;k++){
        const a=k*TAU/14,r=228+(k%3)*9;
        const x=Math.cos(a)*r,y=Math.sin(a)*r;
        ctx.moveTo(x,y-12);ctx.lineTo(x+9,y);ctx.lineTo(x,y+15);
        ctx.lineTo(x-6,y);ctx.closePath();
      }
      ctx.fill();ctx.stroke();ctx.restore();
    }
    // Wave 4: hot, rotating reactor blades and segmented amber arcs.
    else if(v.stage===4) {
      ctx.save();ctx.rotate(t*.28);
      ctx.fillStyle=ink(0,.18);ctx.strokeStyle=ink(20,.65);ctx.lineWidth=3;
      for(let k=0;k<14;k++) {
        const a=k*TAU/14;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*89,Math.sin(a)*89);
        ctx.lineTo(Math.cos(a+.14)*173,Math.sin(a+.14)*173);
        ctx.lineTo(Math.cos(a+.25)*249,Math.sin(a+.25)*249);
        ctx.lineTo(Math.cos(a+.06)*212,Math.sin(a+.06)*212);
        ctx.closePath();ctx.fill();ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle=ink(45,.55);ctx.lineWidth=5;ctx.beginPath();
      for(let k=0;k<18;k++) {
        const a=k*TAU/18+t*.11;
        ctx.moveTo(Math.cos(a)*258,Math.sin(a)*258);
        ctx.arc(0,0,258,a,a+.16);
      }
      ctx.stroke();
    }
    // Wave 5 — VECTOR: a luminous circuit board, all 90-degree pathways.
    // No circular motif: square buses, stacked traces and switching junctions.
    else if(v.stage===5) {
      ctx.save();
      ctx.strokeStyle=ink(0,.60,65);ctx.lineWidth=2.8;ctx.lineJoin="miter";
      ctx.strokeRect(-238,-238,476,476);
      ctx.strokeStyle=ink(44,.30,74);ctx.lineWidth=1.3;
      ctx.strokeRect(-211,-211,422,422);
      // Bus traces converge on four squared-off power modules.
      for(let i=0;i<4;i++){
        ctx.save();ctx.rotate(i*Math.PI/2);
        ctx.fillStyle=ink(0,.18,37);
        ctx.strokeStyle=ink(0,.82,76);
        ctx.lineWidth=2.5;
        ctx.fillRect(-53,-247,106,54);ctx.strokeRect(-53,-247,106,54);
        ctx.fillStyle=ink(66,.75,90);
        ctx.fillRect(-32,-232,64,5);
        ctx.beginPath();
        for(let line=0;line<4;line++){
          const x=-40+line*26;
          ctx.moveTo(x,-194);ctx.lineTo(x,-162);
          ctx.lineTo(x+(line%2?13:-13),-162);
          ctx.lineTo(x+(line%2?13:-13),-102);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle=ink(75,.66,78);ctx.lineWidth=2.4;ctx.beginPath();
      for(let i=-3;i<=3;i++){
        const offset=i*39,turn=i%2?24:-24;
        ctx.moveTo(-246,offset);ctx.lineTo(-180,offset);
        ctx.lineTo(-180,offset+turn);ctx.lineTo(-118,offset+turn);
        ctx.moveTo(246,offset);ctx.lineTo(180,offset);
        ctx.lineTo(180,offset-turn);ctx.lineTo(118,offset-turn);
      }
      ctx.stroke();
      // Small moving square charge packets show data flow along the buses.
      ctx.fillStyle=ink(98,.98,91);
      for(let i=0;i<8;i++){
        const side=i%2?1:-1,x=side*(118+((t*26+i*47)%104));
        const y=(Math.floor(i/2)-1.5)*62;
        ctx.fillRect(x-4,y-4,8,8);
      }
      ctx.restore();
    }
    // Wave 6 — PHANTOM: a broken machine graveyard, not intact circles.
    // Jagged shattered gearing and intermittent cold electrical fractures.
    else if(v.stage===6) {
      for(let j=0;j<3;j++){
        const a=(j*TAU/3)+t*(j%2?-.07:.09);
        const r=j===0?125:j===1?183:243,teeth=j===0?18:24;
        ctx.save();ctx.rotate(a);
        ctx.strokeStyle=ink(j*35,.70,75);ctx.lineWidth=j===0?4.5:3.2;
        ctx.beginPath();
        for(let k=0;k<teeth;k++){
          // Entire missing clusters give the gears a wrecked silhouette.
          if((k+j*3)%8===0 || (k+j*2)%11===0)continue;
          const th=k*TAU/teeth,th2=(k+.7)*TAU/teeth;
          const r1=r+(k%3===0?13:-5),r2=r+((k+1)%3===0?13:-5);
          ctx.moveTo(Math.cos(th)*r1,Math.sin(th)*r1);
          ctx.lineTo(Math.cos(th2)*r2,Math.sin(th2)*r2);
        }
        ctx.stroke();
        ctx.restore();
      }
      // Torn conductor cables and occasional cold blue flicker.
      ctx.strokeStyle=ink(50,.64,76);ctx.lineWidth=2.3;ctx.beginPath();
      for(let j=0;j<6;j++){
        const x=-228+j*84,phase=j*1.27;
        ctx.moveTo(x,-249);ctx.lineTo(x+18,-197);
        ctx.lineTo(x-15,-168);ctx.lineTo(x+25,-122);
        ctx.moveTo(-249,x);ctx.lineTo(-196,x-19);
        ctx.lineTo(-164,x+12);ctx.lineTo(-120,x-13);
      }
      ctx.stroke();
      if(Math.floor(t*3.5)%5<2){
        ctx.strokeStyle=ink(100,.96,94);ctx.lineWidth=2.4;ctx.beginPath();
        for(let j=0;j<5;j++){
          const x=-235+j*105,y=175+14*Math.sin(j*1.8);
          ctx.moveTo(x,y);ctx.lineTo(x+21,y-18);
          ctx.lineTo(x+14,y-27);ctx.lineTo(x+40,y-47);
        }
        ctx.stroke();
      }
    }
    // Wave 7 — KALEIDOSCOPE: four giant hinged mirror assemblies.
    // Counter-rotating diamond mirrors fill the quadrants, not radial petals.
    else if(v.stage===7) {
      ctx.save();ctx.rotate(t*.085);
      for(let k=0;k<4;k++){
        ctx.save();ctx.rotate(k*Math.PI/2);
        const fold=.15+.10*Math.sin(t*.75+k*Math.PI/2);
        ctx.fillStyle=ink(k*21,.22,48);
        ctx.strokeStyle=ink(k*20+40,.87,84);ctx.lineWidth=3;
        ctx.beginPath();
        ctx.moveTo(86,0);ctx.lineTo(167,-105);
        ctx.lineTo(254,0);ctx.lineTo(167,105);
        ctx.closePath();ctx.fill();ctx.stroke();
        ctx.fillStyle=ink(115,.17,84);ctx.beginPath();
        ctx.moveTo(86,0);ctx.lineTo(167,-105);
        ctx.lineTo(167+fold*80,0);ctx.closePath();ctx.fill();
        ctx.strokeStyle=ink(105,.87,94);ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(86,0);ctx.lineTo(254,0);
        ctx.moveTo(167,-105);ctx.lineTo(167+fold*80,0);ctx.lineTo(167,105);
        ctx.stroke();ctx.restore();
      }
      ctx.restore();
      // Crisp mirrored squares turn the entire arena into a folding lens.
      ctx.save();ctx.rotate(-t*.15);
      ctx.strokeStyle=ink(-45,.66,83);ctx.lineWidth=2.5;
      ctx.strokeRect(-161,-161,322,322);
      ctx.restore();
      ctx.save();ctx.rotate(t*.22+Math.PI/4);
      ctx.strokeStyle=ink(88,.78,89);ctx.lineWidth=2;
      ctx.strokeRect(-102,-102,204,204);
      ctx.restore();
    }
    // Wave 8: golden expanding wavefronts and accelerating radial gauges.
    else if(v.stage===8) {
      ctx.strokeStyle=ink(0,.68);ctx.lineWidth=3.5;ctx.beginPath();
      for(let k=0;k<5;k++){
        const progress=(t*.29+k/5)%1;
        const r=72+progress*190;
        ctx.moveTo(r,0);ctx.arc(0,0,r,0,TAU);
      }
      ctx.stroke();
      ctx.save();ctx.rotate(-t*.19);ctx.strokeStyle=ink(40,.62);ctx.lineWidth=3;
      ctx.beginPath();
      for(let k=0;k<32;k++){
        const a=k*TAU/32;
        ctx.moveTo(Math.cos(a)*(k%4?223:192),Math.sin(a)*(k%4?223:192));
        ctx.lineTo(Math.cos(a)*264,Math.sin(a)*264);
      }
      ctx.stroke();ctx.restore();
    }
    // Wave 9+ — COSMOS: empty black space, fractured gravity wells and
    // four-dimensional tesseracts. Sparse on purpose: the void is the motif.
    else {
      ctx.save();ctx.rotate(-t*.038);
      ctx.strokeStyle=ink(8,.54,86);ctx.lineWidth=2.2;
      // Thin dimensional fractures, deliberately discontinuous.
      ctx.beginPath();
      for(let k=0;k<9;k++){
        const a=k*TAU/9+.3,ra=143+18*Math.sin(t*.48+k);
        const x=Math.cos(a)*ra,y=Math.sin(a)*ra;
        ctx.moveTo(x-16,y-18);ctx.lineTo(x+7,y+5);
        ctx.lineTo(x-3,y+18);
      }
      ctx.stroke();
      ctx.restore();
      ctx.save();ctx.rotate(t*.062);
      for(let i=0;i<4;i++){
        const a=i*TAU/4+.5;
        const x=Math.cos(a)*225,y=Math.sin(a)*225;
        ctx.strokeStyle=ink(60+i*17,.56,91);ctx.lineWidth=1.8;
        ctx.beginPath();ctx.moveTo(x-24,y-17);ctx.lineTo(x+25,y+21);
        ctx.stroke();
        ctx.fillStyle=ink(135,.85,94);ctx.fillRect(x-2,y-2,4,4);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // The 16 vertices and 32 edges of a genuine four-dimensional hypercube.
  // Edges in the W dimension are accented so the nested cubes are readable.
  // Static topology is allocated once, not rebuilt inside animation frames.
  const TESSERACT_VERTICES=Array.from({length:16},(_,i)=>[
    i&1?1:-1,i&2?1:-1,i&4?1:-1,i&8?1:-1
  ]);
  const TESSERACT_EDGES=[];
  for(let i=0;i<16;i++)for(let axis=0;axis<4;axis++)
    if(!(i&(1<<axis)))TESSERACT_EDGES.push([i,i|(1<<axis),axis===3]);

  function drawTesseracts(v) {
    // The 4D signature belongs exclusively to Cosmos, not Waves 5–8.
    if(v.stage!==9)return;
    // Four bounded, lightweight wireframe tesseracts. No glow or collision.
    const amount=4;
    const time=state.elapsed*Math.min(v.tempo,2.2);
    ctx.save();
    ctx.translate(CX,CY);
    ctx.beginPath();
    ctx.arc(0,0,R-15,0,TAU);
    ctx.arc(0,0,82,0,TAU,true);
    ctx.clip("evenodd"); // Clear the turret and future shields/cannons.
    ctx.lineCap="round";
    for(let i=0;i<amount;i++) {
      const orbit=time*(i%2?-.08:.11)+i*TAU/amount+.65;
      const radius=amount===1?158:169;
      const cx=Math.cos(orbit)*radius,cy=Math.sin(orbit)*radius;
      const scale=amount===1?73:amount===2?60:53;
      const a=time*.51+i*1.13,b=time*.31-i*.71,c=time*.38+i*.47;
      const ca=Math.cos(a),sa=Math.sin(a);
      const cb=Math.cos(b),sb=Math.sin(b);
      const cc=Math.cos(c),sc=Math.sin(c);
      const projected=[];
      for(const [x,y,z,w] of TESSERACT_VERTICES) {
        // True simultaneous XW/YZ/ZW rotations in 4D, followed by two
        // perspective divisions: 4D -> 3D -> 2D.
        const xr=x*ca-w*sa,wr=x*sa+w*ca;
        const yr=y*cb-z*sb,zr=y*sb+z*cb;
        const z2=zr*cc-wr*sc,w2=zr*sc+wr*cc;
        const p4=3.5/(3.5-w2*.55);
        const p3=4.5/(4.5-z2*p4*.38);
        projected.push([cx+xr*p4*p3*scale,cy+yr*p4*p3*scale]);
      }
      // One path for cube edges, one for the fourth-dimensional connectors.
      for(const isW of [false,true]) {
        ctx.beginPath();
        for(const [u,v,wEdge] of TESSERACT_EDGES) {
          if(wEdge!==isW)continue;
          ctx.moveTo(projected[u][0],projected[u][1]);
          ctx.lineTo(projected[v][0],projected[v][1]);
        }
        ctx.lineWidth=isW?2.3:1.65;
        ctx.strokeStyle=isW?
          "hsla("+((v.hue+145+i*24)%360)+",100%,82%,.62)":
          "hsla("+((v.hue+20+i*24)%360)+",98%,72%,.48)";
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawEvolutionGhosts(v) {
    // Only PULSE retains this legacy arc echo. Other waves now have
    // distinct non-circular identities; their real walls remain visible.
    if(v.stage!==8)return;
    // Decorative arcs are unmistakably thin and dashed, never collision walls.
    ctx.save();ctx.setLineDash([3,11]);ctx.lineWidth=1.5;
    ctx.strokeStyle="hsla("+((v.hue+75)%360)+",96%,77%,.21)";
    for(let j=0;j<2;j++){
      const ring=state.rings[j+1],shape=ringShape(ring),pitch=TAU/ring.count;
      const drift=state.elapsed*(j===0?.15:-.13)*v.tempo;
      const radius=shape.radius+(j===0?27:-27)+Math.sin(state.elapsed*1.1+j)*5;
      ctx.beginPath();
      for(let n=0;n<ring.count;n++){
        const a=ring.angle+drift+n*pitch,start=a-shape.span*.30,end=a+shape.span*.30;
        ctx.moveTo(CX+Math.cos(start)*radius,CY+Math.sin(start)*radius);
        ctx.arc(CX,CY,radius,start,end);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  let backgroundGradient=null,backgroundGradientKey="";
  function drawBackground(v) {
    ctx.fillStyle="#060817";ctx.fillRect(0,0,W,H);
    // Full-sector color signature; early waves never rely on faint geometry alone.
    const key=v.stage===1?"classic:"+modeName():"sector:"+v.hue;
    if(key!==backgroundGradientKey || !backgroundGradient){
      backgroundGradient=ctx.createRadialGradient(CX,CY,30,CX,CY,350);
      if(v.stage===1){
        backgroundGradient.addColorStop(0,modeName()==="MELTDOWN"?"#341035":"#121633");
        backgroundGradient.addColorStop(.72,"#0c1028");
        backgroundGradient.addColorStop(1,"#050713");
      } else if(v.stage===9){
        // Cosmos is a cold black void, not another colorful neon backdrop.
        backgroundGradient.addColorStop(0,"#090d24");
        backgroundGradient.addColorStop(.48,"#040515");
        backgroundGradient.addColorStop(1,"#01030a");
      } else if(v.stage===5) {
        backgroundGradient.addColorStop(0,"#071f18");
        backgroundGradient.addColorStop(.7,"#06130e");
        backgroundGradient.addColorStop(1,"#020908");
      } else if(v.stage===6) {
        backgroundGradient.addColorStop(0,"#0b1827");
        backgroundGradient.addColorStop(.74,"#07101b");
        backgroundGradient.addColorStop(1,"#030710");
      } else {
        backgroundGradient.addColorStop(0,"hsl("+v.hue+",55%,15%)");
        backgroundGradient.addColorStop(.72,"hsl("+((v.hue+22)%360)+",52%,10%)");
        backgroundGradient.addColorStop(1,"#050713");
      }
      backgroundGradientKey=key;
    }
    ctx.fillStyle=backgroundGradient;ctx.beginPath();ctx.arc(CX,CY,R+19,0,TAU);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(CX,CY,R+15,0,TAU);ctx.clip();
    // A shared square grid made every stage feel like the same room. Only
    // classic/radar/reactor/pulse retain it; Vector gets a square circuit
    // coordinate plane, while crystal/phantom/mirrors/cosmos use no grid.
    if([1,2,4,8].includes(v.stage) || v.stage===5){
      const gridColor=v.stage===1?"#4f5c8c16":
        v.stage===5?"#42e8a018":"hsla("+v.hue+",85%,64%,.09)";
      const step=v.stage===5?54:32;
      ctx.strokeStyle=gridColor;ctx.lineWidth=1;ctx.beginPath();
      for(let x=CX-336;x<CX+340;x+=step){ctx.moveTo(x,42);ctx.lineTo(x,690);}
      for(let y=CY-337;y<CY+338;y+=step){ctx.moveTo(130,y);ctx.lineTo(832,y);}
      ctx.stroke();
    }
    drawEvolutionField(v);
    drawTesseracts(v);
    for(const star of stars){
      ctx.globalAlpha=star.a;ctx.fillStyle="#a4bdf9";ctx.fillRect(star.x,star.y,1.6,1.6);
    }
    ctx.globalAlpha=1;ctx.restore();
    const perimeter=v.stage===1?328:(v.hue+12)%360;
    ctx.save();ctx.shadowBlur=5;ctx.shadowColor="hsl("+perimeter+",100%,55%)";
    ctx.strokeStyle="hsl("+perimeter+",100%,62%)";
    ctx.lineWidth=6;ctx.beginPath();ctx.arc(CX,CY,R+17,0,TAU);ctx.stroke();
    ctx.restore();
    for(let k=0;k<8;k++){
      const a=k*Math.PI/4;
      line(CX+Math.cos(a)*(R+21),CY+Math.sin(a)*(R+21),
           CX+Math.cos(a)*(R+23),CY+Math.sin(a)*(R+23),
           "hsla("+perimeter+",90%,75%,.55)",2);
    }
  }
  function drawRings(v) {
    for (let ir=state.rings.length-1;ir>=0;ir--) {
      const ring=state.rings[ir], shape=ringShape(ring);
      const pitch=TAU/ring.count;
      const alert=ring.reversePending && Math.floor(state.elapsed*9)%2===0;
      // Every wave shifts the palette, but the flashing amber reversal warning
      // is always unmistakable and the real walls remain the brightest arcs.
      const hue=alert?45:(v.stage===1?ring.hue+state.elapsed*3:
        v.hue+[36,145,0][ir]+state.elapsed*3)%360;
      const prism=v.stage===3,vector=v.stage===5,phantom=v.stage===6,
        mirror=v.stage===7,cosmos=v.stage===9;
      ctx.save();
      if(v.stage>=4) {
        // One sharp motion echo rather than two overdrawn glowing rings.
        ctx.beginPath();
        const offset=ring.speed*ring.spin*(.15+v.power*.26);
        for(let n=0;n<ring.count;n++){
          const center=ring.angle-offset+n*pitch;
          const start=center-shape.span/2,end=center+shape.span/2;
          ctx.moveTo(CX+Math.cos(start)*shape.radius,CY+Math.sin(start)*shape.radius);
          ctx.arc(CX,CY,shape.radius,start,end);
        }
        ctx.lineWidth=1.8+v.power*1.6;
        ctx.strokeStyle="hsla("+hue+",100%,68%,"+(.10+v.power*.055)+")";
        ctx.stroke();
      }
      const reactor=v.stage===4, pulse=v.stage===8;
      ctx.lineCap=(reactor||pulse||prism||vector||mirror)?"butt":"round";
      // Batch the full ring into one path: three strokes per ring instead
      // of three expensive glowing strokes for *each* moving segment.
      ctx.beginPath();
      for (let n=0;n<ring.count;n++) {
        const center=ring.angle+n*pitch;
        const start=center-shape.span/2,end=center+shape.span/2;
        ctx.moveTo(CX+Math.cos(start)*shape.radius,CY+Math.sin(start)*shape.radius);
        ctx.arc(CX,CY,shape.radius,start,end);
      }
      // The heavy PULSE plates and short REACTOR teeth are physical walls,
      // not floating wallpaper; strokes use the exact collision radius/width.
      ctx.shadowBlur=0;
      ctx.lineWidth=shape.width+2;
      ctx.strokeStyle=pulse?"hsla("+hue+",100%,74%,.88)":
        reactor?"hsla("+hue+",100%,60%,.48)":
        prism?"#a470ff":vector?"#35f5a3":
        phantom?"#667e93":mirror?"#ffe7ff":
        cosmos?"#b49af2":"hsla("+hue+",100%,53%,.31)";
      ctx.stroke();
      ctx.lineWidth=shape.width-(pulse?5:3);
      ctx.strokeStyle=pulse?"hsl("+((hue+190)%360)+",55%,14%)":
        reactor?"hsl("+hue+",100%,43%)":
        prism?"#39215f":vector?"#073729":phantom?"#0c1b2a":
        mirror?"#592b81":cosmos?"#13152c":"hsl("+hue+",100%,56%)";
      ctx.stroke();
      ctx.lineWidth=pulse?3.6:3;
      ctx.strokeStyle=pulse?"hsla("+hue+",100%,86%,.96)":
        reactor?"#ffe7ab":prism?"#efc5ff":
        vector?"#70ffce":phantom?"#b8d6e1":
        mirror?"#ffffff":cosmos?"#dad0ff":"#e2ffffa8";
      ctx.stroke();
      if(prism || vector || phantom || mirror || cosmos){
        // Inlays are drawn directly ON the physical moving wall arcs, never
        // separate fake obstacles. Collision radii/spans remain unchanged.
        ctx.beginPath();
        for(let n=0;n<ring.count;n++){
          const center=ring.angle+n*pitch;
          const cx=CX+Math.cos(center)*shape.radius;
          const cy=CY+Math.sin(center)*shape.radius;
          if(prism){
            const a=center+.11;
            ctx.moveTo(cx,cy-5);ctx.lineTo(cx+5,cy);
            ctx.lineTo(cx,cy+5);ctx.lineTo(cx-5,cy);ctx.closePath();
          }else if(vector){
            const x=cx,y=cy;
            ctx.moveTo(x-4,y-4);ctx.lineTo(x+4,y-4);
            ctx.lineTo(x+4,y+4);ctx.lineTo(x-4,y+4);ctx.closePath();
          }else if(phantom){
            const n1=-Math.sin(center),n2=Math.cos(center);
            ctx.moveTo(cx-n1*5,cy-n2*5);
            ctx.lineTo(cx+n1*5,cy+n2*5);
          }else if(mirror){
            const ca=center+.2*Math.sin(state.elapsed*.8+n);
            ctx.moveTo(cx,cy-5);ctx.lineTo(cx+5*Math.cos(ca),cy+5*Math.sin(ca));
            ctx.lineTo(cx,cy+5);ctx.closePath();
          }else{
            ctx.moveTo(cx-2,cy);ctx.lineTo(cx+2,cy);
            ctx.moveTo(cx,cy-2);ctx.lineTo(cx,cy+2);
          }
        }
        ctx.lineWidth=vector?2.4:1.6;
        ctx.strokeStyle=vector?"#ccffe0":phantom?"#f8c1a5":
          prism?"#ffffff":mirror?"#fff9cd":"#ffffff";
        ctx.stroke();
      }
      if (reactor) {
        // Fin scoring lies entirely inside the lethal turbine teeth.
        ctx.beginPath();
        for(let n=0;n<ring.count;n++){
          const center=ring.angle+n*pitch;
          for(const a of [center-shape.span*.32,center+shape.span*.32]){
            const r0=shape.radius-shape.width*.35,r1=shape.radius+shape.width*.35;
            ctx.moveTo(CX+Math.cos(a)*r0,CY+Math.sin(a)*r0);
            ctx.lineTo(CX+Math.cos(a)*r1,CY+Math.sin(a)*r1);
          }
        }
        ctx.lineWidth=1.8;ctx.strokeStyle="hsla("+hue+",100%,90%,.85)";
        ctx.stroke();
      } else if (pulse) {
        // Double energized rails reinforce each wide, collision-solid plate.
        ctx.beginPath();
        for(let n=0;n<ring.count;n++){
          const center=ring.angle+n*pitch;
          const start=center-shape.span/2,end=center+shape.span/2;
          for(const radius of [shape.radius-shape.width*.33,shape.radius+shape.width*.33]){
            ctx.moveTo(CX+Math.cos(start)*radius,CY+Math.sin(start)*radius);
            ctx.arc(CX,CY,radius,start,end);
          }
        }
        ctx.lineWidth=2;ctx.strokeStyle="hsla("+hue+",100%,85%,.85)";
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawBots() {
    for (const b of state.bots) {
      const color=colors[b.hue];
      ctx.save();ctx.translate(b.x,b.y);
      ctx.rotate(Math.atan2(CY-b.y,CX-b.x));
      if (b.panic>0) ctx.translate(Math.sin(b.age*44)*1.25,0);
      ctx.fillStyle=color;
      // Tiny 1980s sprites, with readable outlines for their different roles.
      ctx.fillRect(-5,-5,10,10);
      ctx.fillRect(-8,-3,3,4);ctx.fillRect(5,-3,3,4);
      ctx.fillRect(-3,-8,6,3);ctx.fillRect(-4,5,3,4);ctx.fillRect(1,5,3,4);
      if (b.type==="flank") {
        ctx.fillRect(-10,-7,3,4);ctx.fillRect(7,3,3,4);
      } else if (b.type==="gunner") {
        ctx.fillRect(4,-2,7,3);
      } else if (b.type==="rush") {
        ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(3,-5);ctx.lineTo(3,5);ctx.closePath();ctx.fill();
      }
      ctx.shadowBlur=0;
      ctx.fillStyle="#0b0d22";ctx.fillRect(-3,-3,6,3);
      ctx.fillStyle=b.armored?"#fff":"#ff684f";ctx.fillRect(-2,-2,4,1.5);
      if (b.armored) {
        const bruiser=b.maxHp>=5;
        const raging=bruiser && b.hp<=b.maxHp/2;
        // An ordinary heavy remains compact in Wave 4. Later-wave Bruisers
        // have massive shoulders, visible cracking, and a tiny armor gauge.
        ctx.fillStyle=raging?"#ff6681":"#c6c0f7";
        ctx.strokeStyle=raging?"#ffa3b7":"#e3daff";ctx.lineWidth=1.4;
        ctx.strokeRect(-8,-8,16,16);
        if(bruiser){
          ctx.fillRect(-12,-7,5,12);ctx.fillRect(7,-7,5,12);
          ctx.fillStyle="#0d1327";ctx.fillRect(-10,-13,20,3);
          ctx.fillStyle=raging?"#ff5f7e":"#b3eafa";
          ctx.fillRect(-10,-13,20*Math.max(0,b.hp)/b.maxHp,3);
          if(b.hp<b.maxHp) {
            ctx.strokeStyle=raging?"#fff1aa":"#fdc4f5";
            ctx.lineWidth=1.5;ctx.beginPath();
            ctx.moveTo(-6,-5);ctx.lineTo(-1,0);
            ctx.lineTo(-4,5);ctx.lineTo(4,8);ctx.stroke();
          }
          if(raging && Math.sin(state.elapsed*14+b.wobble)>0) {
            ctx.fillStyle="#ffe2a4";ctx.fillRect(-3,-2,6,3);
          }
        }
      }
      if (b.panic>0) {
        ctx.strokeStyle="#ffeaa2";ctx.lineWidth=1.2;
        ctx.beginPath();ctx.arc(0,0,10.5,0,Math.PI*.55);ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawMiniBoss() {
    if(state.miniBossState==="warning"){
      // A large perimeter beacon telegraphs the mid-wave intrusion.
      if(Math.floor(state.elapsed*5)%2===0){
        ctx.save();ctx.strokeStyle="#ff9d6d";ctx.lineWidth=3.2;
        ctx.setLineDash([14,10]);ctx.beginPath();
        ctx.arc(CX,CY,R+14,0,TAU);ctx.stroke();
        ctx.setLineDash([]);ctx.restore();
      }
      return;
    }
    const b=state.miniBoss;
    if(!b || state.miniBossState!=="active")return;
    const breaker=b.type==="breaker",angry=miniEnraged(b);
    const color=breaker?"#ffb16a":"#ff6486";
    const core=breaker?(angry?"#fff3a1":"#ff995f"):
      (angry?"#fff1b2":"#ffcad7");
    const aim=Math.atan2(CY-b.y,CX-b.x);
    // Attack warnings can be read from a small phone: a bright aiming line
    // and charging halo appear well before each spread or cannon barrage.
    if(b.fireWarning>0 || b.chargeWarning>0 || b.counterPending){
      ctx.save();ctx.globalAlpha=.60+.25*Math.sin(state.elapsed*18);
      ctx.strokeStyle=b.chargeWarning>0?"#fff0a4":
        b.counterPending?"#ffb483":"#ff7083";
      ctx.lineWidth=b.chargeWarning>0?3:2.2;
      ctx.setLineDash([8,7]);
      ctx.beginPath();ctx.moveTo(b.x,b.y);
      ctx.lineTo(b.x+Math.cos(aim)*Math.min(124,b.radius-30),
        b.y+Math.sin(aim)*Math.min(124,b.radius-30));
      ctx.stroke();ctx.setLineDash([]);ctx.restore();
    }
    ctx.save();ctx.translate(b.x,b.y);
    ctx.rotate(breaker?miniBreakerFacing(b):aim);
    if(b.guard>0){
      ctx.strokeStyle="#fff7d4";ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,0,breaker?35:28,0,TAU);ctx.stroke();
    }
    if(b.fireWarning>0 || b.chargeWarning>0){
      ctx.strokeStyle=b.chargeWarning>0?"#ffe69b":"#ff788c";
      ctx.lineWidth=3;ctx.beginPath();
      ctx.arc(0,0,breaker?40:31,
        -Math.PI/2,-Math.PI/2+TAU*(b.fireWarning>0?
          (1-b.fireWarning/(breaker?.72:.58)):(1-b.chargeWarning/.8)));
      ctx.stroke();
    }
    if(breaker){
      // Heavy twin-cannon platform. Four chunky limbs, impact plating,
      // and an unmistakable exposed gold reactor after armor is breached.
      ctx.fillStyle="#161e2b";ctx.strokeStyle="#ffb46d";ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(0,-28);ctx.lineTo(28,-21);
      ctx.lineTo(30,20);ctx.lineTo(0,29);
      ctx.lineTo(-30,20);ctx.lineTo(-28,-21);
      ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle="#66677a";
      ctx.fillRect(-35,-25,12,17);ctx.fillRect(-35,8,12,17);
      ctx.fillRect(23,-25,12,17);ctx.fillRect(23,8,12,17);
      ctx.fillStyle=angry?"#ff6d73":"#e7c39a";
      ctx.fillRect(11,-19,25,9);ctx.fillRect(11,10,25,9);
      ctx.fillStyle="#18121b";ctx.fillRect(26,-16,13,3);ctx.fillRect(26,13,13,3);
      ctx.strokeStyle=angry?"#fff2b4":"#ffb16a";ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,0,angry?13:10,0,TAU);ctx.stroke();
      ctx.fillStyle=core;ctx.beginPath();
      ctx.arc(0,0,angry?9:7,0,TAU);ctx.fill();
      if(angry){
        ctx.strokeStyle="#fff1ce";ctx.lineWidth=2;ctx.beginPath();
        ctx.moveTo(-24,-12);ctx.lineTo(-10,-4);ctx.lineTo(-21,13);
        ctx.moveTo(18,-17);ctx.lineTo(10,-8);ctx.stroke();
      }
      // Actual armored prow and visible side/rear weak ports.
      ctx.fillStyle=b.guard>0?"#fff1aa":"#8d9fa9";
      ctx.strokeStyle="#313b48";ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(25,-23);ctx.lineTo(40,-17);
      ctx.lineTo(42,17);ctx.lineTo(25,23);ctx.closePath();
      ctx.fill();ctx.stroke();
      ctx.fillStyle=angry?"#ffefb6":"#69f0df";
      ctx.fillRect(-11,-33,22,5);ctx.fillRect(-11,28,22,5);
      ctx.fillRect(-35,-11,5,22);
    } else {
      // Fast six-point mechanical hunter, red visor and separate saw-tooth
      // fins. The eyes and armor cracks visibly shift as HP falls.
      ctx.fillStyle="#1c1426";ctx.strokeStyle="#ff658a";ctx.lineWidth=3;
      ctx.beginPath();
      for(let i=0;i<8;i++){
        const a=i*TAU/8, radius=i%2?18:24;
        if(!i)ctx.moveTo(Math.cos(a)*radius,Math.sin(a)*radius);
        else ctx.lineTo(Math.cos(a)*radius,Math.sin(a)*radius);
      }
      ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle="#ae3157";
      ctx.fillRect(-16,-11,12,6);ctx.fillRect(-16,5,12,6);
      ctx.fillStyle=core;ctx.fillRect(1,-7,15,14);
      ctx.fillStyle="#ff254c";ctx.fillRect(7,-3,10,6);
      if(angry){
        ctx.strokeStyle="#ffd49b";ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(-16,-13);ctx.lineTo(-2,-3);
        ctx.lineTo(-12,12);ctx.stroke();
      }
    }
    ctx.restore();
    if(!breaker){
      // Armor and its gap use exactly the same rotation as hit testing.
      ctx.save();ctx.translate(b.x,b.y);
      ctx.rotate(miniSentinelGapAngle(b));
      ctx.strokeStyle=b.guard>0?"#f9ebc5":"#8396aa";
      ctx.lineWidth=5.5;ctx.beginPath();
      ctx.arc(0,0,28,MINI_SENTINEL_GAP_HALF,TAU-MINI_SENTINEL_GAP_HALF);
      ctx.stroke();
      ctx.strokeStyle=angry?"#ffe6ab":"#9cffe9";
      ctx.lineWidth=2.5;ctx.beginPath();
      ctx.arc(0,0,28,-MINI_SENTINEL_GAP_HALF,MINI_SENTINEL_GAP_HALF);
      ctx.stroke();ctx.restore();
      if(b.turnWarning>0){
        ctx.save();ctx.strokeStyle="#fff2a6";ctx.lineWidth=2.5;
        ctx.beginPath();ctx.arc(b.x,b.y,36,0,TAU);ctx.stroke();ctx.restore();
      }
    }else if(b.counterPending || b.chargeBurstFlash>0){
      ctx.save();ctx.strokeStyle=b.counterPending?"#ff7658":"#fff0a6";
      ctx.lineWidth=3.5;ctx.beginPath();
      ctx.arc(b.x,b.y,35+(b.chargeBurstFlash>0?
        16*(1-b.chargeBurstFlash/.24):0),0,TAU);
      ctx.stroke();ctx.restore();
    }
    // Fixed horizontal HP bar stays legible while the boss orbits.
    const width=breaker?82:70;
    ctx.save();
    ctx.fillStyle="#06101ded";ctx.fillRect(b.x-width/2,b.y-(breaker?53:43),width,7);
    ctx.strokeStyle=color;ctx.lineWidth=1.2;
    ctx.strokeRect(b.x-width/2,b.y-(breaker?53:43),width,7);
    ctx.fillStyle=angry?"#ffe5a1":color;
    ctx.fillRect(b.x-width/2+2,b.y-(breaker?51:41),
      (width-4)*Math.max(0,b.hp)/b.maxHp,3);
    const approach=Math.atan2(CY-b.y,CX-b.x);
    const open=miniArmorOpen(b,approach);
    ctx.fillStyle=open?"#99ffe6":"#ffca92";
    ctx.font='700 10px "Oxanium", monospace';
    ctx.textAlign="center";ctx.textBaseline="alphabetic";
    ctx.fillText(breaker?(open?"FLANK OPEN":"FRONT PLATED"):
      (open?"GAP OPEN":"ARMORED"),b.x,b.y-(breaker?59:48));
    ctx.restore();
  }
  function drawArchitect() {
    if(state.wave!==8 || !state.boss || state.boss.type!=="architect" ||
        !["entering","active"].includes(state.bossState))return;
    const b=state.boss,open=architectCoreOpen(b);
    ctx.save();ctx.translate(b.x,b.y);
    // Use the six-frame sprite sheet, exactly as with the Warden. Each cell
    // has its reactor centered on this same existing collision position.
    // The original canvas spider below remains available until the WebP loads.
    if (architectArt && architectArt.complete &&
        architectArt.naturalWidth===864 && architectArt.naturalHeight===144) {
      ctx.save();
      ctx.rotate(b.angle*.34+Math.sin(state.elapsed*.9)*.12);
      const unit=144, frame=(Math.min(3,Math.max(1,b.phase))-1)*2;
      const size=160, offset=-80;
      ctx.drawImage(architectArt,frame*unit,0,unit,unit,
        offset,offset,size,size);
      if(open){
        // The shutter opens and closes smoothly, without changing the
        // five-second vulnerability window or the real 14px core hitbox.
        const clock=b.age%ARCHITECT_CYCLE;
        const [start,end]=ARCHITECT_OPEN_WINDOWS[b.phase];
        const reveal=clamp(Math.min((clock-start)/.16,
          (end-clock)/.16),0,1);
        if(reveal>0) {
          ctx.save();
          ctx.globalAlpha*=reveal;
          ctx.drawImage(architectArt,(frame+1)*unit,0,unit,unit,
            offset,offset,size,size);
          ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha*=.40+.50*reveal;
        ctx.strokeStyle="#f4a4ff";ctx.lineWidth=1.7;
        ctx.beginPath();ctx.arc(0,0,17+1.8*Math.sin(state.elapsed*9),0,TAU);
        ctx.stroke();ctx.restore();
      }
      // Telegraphing still comes from the four limbs during wall overrides.
      if(b.phase>=2 && b.reverseWarning>0 &&
          Math.floor(state.elapsed*9)%2===0){
        ctx.save();
        ctx.globalAlpha*=.32+.30*b.reverseWarning;
        ctx.strokeStyle="#ee9aff";ctx.lineWidth=1.4;
        for(let k=0;k<4;k++){
          const a=k*TAU/4+Math.PI/4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a)*65,Math.sin(a)*65);
          ctx.lineTo(Math.cos(a)*(R-18),Math.sin(a)*(R-18));
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
      ctx.restore();
      return;
    }
    // Four articulated, sweeping siege arms: visually distinct from the Warden.
    ctx.rotate(b.angle*.34+Math.sin(state.elapsed*.9)*.12);
    for(let i=0;i<4;i++){
      const a=i*TAU/4+Math.PI/4;
      const dx=Math.cos(a),dy=Math.sin(a),nx=-dy,ny=dx;
      const damaged=(b.phase>=2 && i===1)||(b.phase>=3 && i===3);
      const reach=damaged?48:69;
      const hinge=30+5*Math.sin(b.age*2.6+i*1.9);
      ctx.strokeStyle=damaged?"#94505f":"#0c1326";ctx.lineWidth=18;ctx.lineCap="square";
      ctx.beginPath();ctx.moveTo(dx*20,dy*20);
      ctx.lineTo(dx*hinge+nx*8,dy*hinge+ny*8);
      ctx.lineTo(dx*reach+nx*3,dy*reach+ny*3);ctx.stroke();
      ctx.strokeStyle=damaged?"#ff9169":"#a1a9bb";
      ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(dx*24,dy*24);
      ctx.lineTo(dx*hinge+nx*8,dy*hinge+ny*8);
      ctx.lineTo(dx*reach+nx*3,dy*reach+ny*3);ctx.stroke();
      ctx.fillStyle=damaged?"#ffab73":"#f2a1ff";
      ctx.beginPath();ctx.arc(dx*hinge+nx*8,dy*hinge+ny*8,5,0,TAU);ctx.fill();
      ctx.fillStyle=damaged?"#642b37":"#351d55";
      ctx.beginPath();ctx.arc(dx*reach+nx*3,dy*reach+ny*3,damaged?6:10,0,TAU);ctx.fill();
      ctx.strokeStyle=damaged?"#ff8866":"#e4baff";ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(dx*reach+nx*3,dy*reach+ny*3,damaged?6:10,0,TAU);ctx.stroke();
      if(!damaged && b.phase>=2 && b.reverseWarning>0){
        // Telegraph control beams from intact arms toward the outer ring.
        ctx.strokeStyle="#f797ff";ctx.lineWidth=1.4;
        ctx.beginPath();ctx.moveTo(dx*reach,dy*reach);
        ctx.lineTo(dx*(R-24)+nx*7,dy*(R-24)+ny*7);ctx.stroke();
      }
    }
    ctx.rotate(-b.angle*.34-Math.sin(state.elapsed*.9)*.12);
    // Broad spider shell with a sensor visor and layered turret plating.
    ctx.fillStyle="#0a1428";ctx.strokeStyle="#cb90fb";ctx.lineWidth=4.5;
    ctx.beginPath();
    for(let k=0;k<8;k++){
      const t=k*TAU/8+Math.PI/8;
      const x=Math.cos(t)*38,y=Math.sin(t)*38;
      if(!k)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle="#70809b";ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-33,-17);ctx.lineTo(-15,-33);
    ctx.moveTo(33,-17);ctx.lineTo(15,-33);ctx.stroke();
    ctx.fillStyle="#f052d9";
    ctx.fillRect(-25,-15,12,5);ctx.fillRect(13,-15,12,5);
    // Fractured plating, spent capacitors and exposed wiring increase by phase.
    if(b.phase>=2) {
      ctx.strokeStyle="#ffb36d";ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(25,24);ctx.lineTo(12,9);ctx.lineTo(31,-3);
      ctx.stroke();
      ctx.fillStyle="#f5a372";ctx.fillRect(20,13,5,7);
    }
    if(b.phase>=3) {
      ctx.strokeStyle="#ffa7eb";ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(-29,20);ctx.lineTo(-11,8);ctx.lineTo(-23,-8);
      ctx.stroke();
      if(Math.floor(state.elapsed*12)%3===0){
        ctx.strokeStyle="#fff2ad";ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(-40,27);ctx.lineTo(-48,35);ctx.lineTo(-43,41);
        ctx.stroke();
      }
    }
    // The vulnerable reactor flashes vivid violet, visually distinct
    // from the Warden's cyan weak point and the player's energy shield.
    ctx.fillStyle=open?"#d7a1ff":"#59214b";
    ctx.strokeStyle=open?"#ffffff":"#f195e8";ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(0,0,14,0,TAU);ctx.fill();ctx.stroke();
    if(open){
      ctx.strokeStyle="#f5c7ff";ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,0,20+2*Math.sin(state.elapsed*8),0,TAU);ctx.stroke();
      ctx.fillStyle="#ffffff";
      ctx.beginPath();ctx.arc(0,0,5,0,TAU);ctx.fill();
    }else{
      ctx.strokeStyle="#ff7acb";ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(10,0);ctx.stroke();
    }
    // Four breakaway armor indicators reflect four successful core hits.
    for(let k=0;k<b.hp;k++){
      const a=k*TAU/4-Math.PI/2;
      ctx.fillStyle="#ffc2ef";
      ctx.beginPath();ctx.arc(Math.cos(a)*33,Math.sin(a)*33,3,0,TAU);ctx.fill();
    }
    ctx.restore();
  }
  function drawLeviathan() {
    if(state.wave!==12 || !state.boss ||
       state.boss.type!=="leviathan" ||
       (state.bossState!=="active" && state.bossState!=="entering"))return;
    const b=state.boss,rot=leviathanRotation(b);
    const destroyed=b.pods.filter(p=>p.hp<=0).length;
    const frame=b.phase==="fury"?4:destroyed;
    const visible=b.pods.some(p=>p.hp>0);
    const open=leviathanCoreOpen(b);
    // Targeting warnings appear in world coordinates and are deliberately
    // legible on a scaled-down phone screen; no expensive canvas shadows.
    for(let i=0;i<3;i++){
      const p=b.pods[i];if(p.hp<=0 || p.warning<=0)continue;
      const at=leviathanPodPosition(b,i);
      ctx.save();
      ctx.globalAlpha=.5+.22*Math.sin(state.elapsed*22);
      ctx.strokeStyle=i===1?"#ffdf7c":"#ff8f76";ctx.lineWidth=2.3;
      ctx.setLineDash([8,5]);ctx.beginPath();
      ctx.moveTo(at.x,at.y);
      ctx.lineTo(at.x+(CX-at.x)*.61,at.y+(CY-at.y)*.61);
      ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(at.x,at.y,21,0,TAU);ctx.stroke();
      ctx.restore();
    }
    if(b.coreWarning>0 || b.chargeWarning>0){
      ctx.save();ctx.globalAlpha=.58+.24*Math.sin(state.elapsed*20);
      ctx.strokeStyle=b.chargeWarning>0?"#ff464c":"#ffc870";
      ctx.lineWidth=b.chargeWarning>0?3.7:2.4;
      ctx.setLineDash([11,7]);ctx.beginPath();
      ctx.arc(b.x,b.y,b.chargeWarning>0?112:43,0,TAU);
      ctx.stroke();ctx.setLineDash([]);ctx.restore();
    }
    ctx.save();ctx.translate(b.x,b.y);ctx.rotate(rot);
    const sprite=leviathanSheet();
    if(sprite){
      // Five high-detail damage frames; legacy sprite only when WebP is
      // missing or still loading. No combat targeting changes.
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(sprite.image,frame*sprite.frameWidth,0,
        sprite.frameWidth,sprite.frameHeight,
        -LEVIATHAN_SPRITE_W/2,-LEVIATHAN_SPRITE_H/2,
        LEVIATHAN_SPRITE_W,LEVIATHAN_SPRITE_H);
    }else{
      // Offline/loading fallback only. The published build uses the sprite.
      ctx.fillStyle="#15182b";ctx.strokeStyle="#b87d89";ctx.lineWidth=4;
      ctx.beginPath();
      ctx.moveTo(0,-55);ctx.lineTo(45,-31);ctx.lineTo(75,10);
      ctx.lineTo(40,51);ctx.lineTo(-40,51);ctx.lineTo(-75,10);
      ctx.lineTo(-45,-31);ctx.closePath();ctx.fill();ctx.stroke();
      for(let i=0;i<3;i++){
        if(b.pods[i].hp<=0)continue;
        const at=LEVIATHAN_PODS[i];
        ctx.fillStyle="#403454";ctx.strokeStyle="#ffad74";ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(at.x,at.y,19,0,TAU);ctx.fill();ctx.stroke();
        ctx.fillStyle="#fff0a0";ctx.fillRect(at.x-5,at.y-3,10,6);
      }
      ctx.fillStyle="#ff523d";ctx.beginPath();ctx.arc(0,0,12,0,TAU);ctx.fill();
    }
    // Real hitboxes remain small and explicit even with the larger art.
    // Each pod displays remaining independent armor, not cosmetic points.
    for(let i=0;i<3;i++){
      const pod=b.pods[i],pos=LEVIATHAN_PODS[i];
      if(pod.hp<=0)continue;
      if(pod.guard>0){
        ctx.strokeStyle="#fff6cb";ctx.lineWidth=2.5;
        ctx.beginPath();ctx.arc(pos.x,pos.y,22,0,TAU);ctx.stroke();
      }
      ctx.fillStyle="#080d1ccf";ctx.fillRect(pos.x-17,pos.y-28,34,5);
      ctx.fillStyle=i===1?"#ffd28d":"#ff8f76";
      ctx.fillRect(pos.x-16,pos.y-27,
        32*pod.hp/pod.maxHp,3);
    }
    if(!visible){
      ctx.save();
      const pulse=.65+.30*Math.sin(state.elapsed*10);
      ctx.globalAlpha=pulse;
      ctx.strokeStyle=open?"#fff5af":"#ff715a";
      ctx.lineWidth=open?3.4:2;
      ctx.beginPath();ctx.arc(0,0,open?24:19,0,TAU);ctx.stroke();
      if(open){
        ctx.fillStyle="#fff2aa";ctx.beginPath();
        ctx.arc(0,0,8,0,TAU);ctx.fill();
      }
      ctx.restore();
    }
    if(b.hullPulse>0){
      // Tiny muzzle flashes reveal the independent emergency hull guns.
      ctx.save();
      ctx.globalAlpha=Math.min(1,b.hullPulse/.22);
      ctx.fillStyle="#ffe7a5";
      for(const side of [-1,1]){
        ctx.beginPath();ctx.arc(side*38,-8,9,0,TAU);ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
    // Large horizontal reactor HP meter for the final reactor struggle.
    if(!visible){
      const width=130,y=b.y-93;
      ctx.save();ctx.fillStyle="#07101def";
      ctx.fillRect(b.x-width/2,y,width,9);
      ctx.strokeStyle=b.phase==="fury"?"#ff6d86":"#ffb06a";
      ctx.lineWidth=1.2;ctx.strokeRect(b.x-width/2,y,width,9);
      ctx.fillStyle=b.phase==="fury"?"#ff5975":"#fff0b0";
      ctx.fillRect(b.x-width/2+2,y+2,
        (width-4)*Math.max(0,b.coreHp)/LEVIATHAN_CORE_HP,5);
      ctx.restore();
    }
  }
  function drawLeviathanDeath() {
    const d=state.leviathanDeath;
    if(!d)return;
    const t=d.age, split=clamp((t-.38)/1.25,0,1);
    const fade=clamp((2.25-t)/.88,0,1);
    ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.rotation);
    // The real damaged sprite remains visible and breaks into four pieces.
    // Four clipped draws, no new image downloads or expensive filters.
    const sprite=leviathanSheet();
    if(sprite){
      ctx.globalAlpha=fade;
      // Each of the four wreck fragments uses quadrants of the final sprite,
      // matching the visible full-size boss without growth or blurred scaling.
      const halfW=LEVIATHAN_SPRITE_W/2,halfH=LEVIATHAN_SPRITE_H/2;
      const srcHalfW=sprite.frameWidth/2,srcHalfH=sprite.frameHeight/2;
      const lastFrameX=4*sprite.frameWidth;
      for(let i=0;i<4;i++){
        const col=i%2,row=(i/2)|0;
        const sx=col?1:-1,sy=row?1:-1;
        ctx.save();
        ctx.translate(sx*split*80,sy*split*67);
        ctx.rotate(sx*sy*split*.48);
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(sprite.image,lastFrameX+col*srcHalfW,
          row*srcHalfH,srcHalfW,srcHalfH,
          -halfW+col*halfW,-halfH+row*halfH,halfW,halfH);
        ctx.restore();
      }
    }else{
      ctx.globalAlpha=fade;
      ctx.strokeStyle="#ffb46b";ctx.lineWidth=5;
      ctx.strokeRect(-83-split*29,-58-split*20,
        166+split*58,116+split*40);
    }
    // The central reactor builds to a distinctly visible delayed detonation.
    const corePulse=clamp((t-.75)/.55,0,1);
    const ringFade=clamp((LEVIATHAN_DEATH_SECONDS-t)/.9,0,1);
    ctx.globalAlpha=ringFade;
    ctx.strokeStyle="#ff7a55";ctx.lineWidth=5*(1-corePulse)+2;
    ctx.beginPath();ctx.arc(0,0,18+corePulse*135,0,TAU);ctx.stroke();
    ctx.strokeStyle="#fff1ad";ctx.lineWidth=2.2;
    ctx.beginPath();ctx.arc(0,0,12+corePulse*110,0,TAU);ctx.stroke();
    ctx.globalAlpha=ringFade*(.62+.38*Math.sin(t*15)**2);
    ctx.fillStyle=t>=1.2?"#fff5d5":"#ff8769";
    ctx.beginPath();ctx.arc(0,0,10+corePulse*24,0,TAU);ctx.fill();
    ctx.restore();
  }
  function drawWarden() {
    if(state.wave!==4 || !state.boss ||
        (state.bossState!=="active" && state.bossState!=="entering"))return;
    const b=state.boss,open=wardenCoreOpen(b);
    ctx.save();ctx.translate(b.x,b.y);
    // Lightweight amber danger ring provides a local six-tenths-second cue
    // before each unpredictable Phase 2/3 orbit reversal.
    if(b.turnWarning>0) {
      ctx.save();
      ctx.globalAlpha*=.58+.22*Math.sin(state.elapsed*22);
      ctx.lineWidth=2.4;ctx.strokeStyle="#ffb36c";
      ctx.setLineDash([10,7]);
      ctx.beginPath();ctx.arc(0,0,65,0,TAU);ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    // The real reactor target is still at (0,0) in boss-local coordinates.
    // Preserve the original hit radius, orbit, attack timing and boss HP.
    if (wardenArt && wardenArt.complete &&
        wardenArt.naturalWidth===720 && wardenArt.naturalHeight===120) {
      ctx.save();
      ctx.rotate(-b.angle*.65+state.elapsed*.22);
      const frame=(b.phase-1)*2, unit=120;
      const x=-59,y=-65,size=118;
      ctx.drawImage(wardenArt,frame*unit,0,unit,unit,x,y,size,size);
      // Cross-fade the core shutters for an 0.18s mechanical opening/closing.
      // The actual weak-point timing remains controlled by wardenCoreOpen().
      if (open) {
        const clock=b.age%WARDEN_CYCLE;
        const [start,end]=WARDEN_OPEN_WINDOWS[b.phase];
        const reveal=clamp(Math.min((clock-start)/.16,(end-clock)/.16),0,1);
        if (reveal>0) {
          ctx.save();
          ctx.globalAlpha*=reveal;
          ctx.drawImage(wardenArt,(frame+1)*unit,0,unit,unit,x,y,size,size);
          ctx.restore();
        }
        // Small precise weak-point halo only during the vulnerable window.
        ctx.save();
        ctx.globalAlpha*=.3+.45*reveal;
        ctx.strokeStyle="#7afcff";ctx.lineWidth=1.7;
        ctx.beginPath();
        ctx.arc(0,0,13+1.4*Math.sin(state.elapsed*9),0,TAU);
        ctx.stroke();
        ctx.restore();
      }
      // Asynchronous amber/red indicators make the chassis look powered.
      if(state.elapsed%1.18<.2) {
        ctx.fillStyle="#ffcb68";
        ctx.beginPath();ctx.arc(-44,19,2.1,0,TAU);ctx.fill();
      }
      if((state.elapsed+.3)%1.61<.27) {
        ctx.fillStyle="#ff555d";
        ctx.beginPath();ctx.arc(43,14,2.1,0,TAU);ctx.fill();
      }
      // Phase 3 sparks are a few bright lines, not persistent particles.
      if (b.phase===3 && Math.floor(state.elapsed*10)%3===0) {
        ctx.strokeStyle="#ffbb72";ctx.lineWidth=1.4;
        ctx.beginPath();
        ctx.moveTo(31,-29);ctx.lineTo(36,-37);ctx.lineTo(42,-35);
        ctx.moveTo(-36,25);ctx.lineTo(-42,32);
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
      return;
    }
    // Browser asset fallback: use the original canvas Warden geometry.
    ctx.rotate(-b.angle*.65+state.elapsed*.22);
    ctx.fillStyle="#101c2a";ctx.strokeStyle="#ff9568";ctx.lineWidth=3;
    ctx.beginPath();
    for(let i=0;i<8;i++){
      const a=i*TAU/8+Math.PI/8;
      const x=Math.cos(a)*41,y=Math.sin(a)*41;
      if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.closePath();ctx.fill();ctx.stroke();
    for(let i=0;i<b.hp;i++) {
      ctx.save();ctx.rotate(i*TAU/3-Math.PI/2);
      ctx.fillStyle="#bf4b45";ctx.fillRect(29,-7,18,14);
      ctx.strokeStyle="#ffd39c";ctx.lineWidth=1.4;ctx.strokeRect(29,-7,18,14);
      ctx.restore();
    }
    ctx.rotate(b.angle*.65-state.elapsed*.22);
    ctx.fillStyle="#ff4b65";
    ctx.fillRect(-22,-16,12,5);ctx.fillRect(10,-16,12,5);
    // Only the exposed cyan core is vulnerable to friendly projectiles.
    ctx.fillStyle=open?"#89ffff":"#8a2d35";
    ctx.strokeStyle=open?"#e0ffff":"#ff785c";ctx.lineWidth=2.5;
    ctx.beginPath();ctx.arc(0,0,11,0,TAU);ctx.fill();ctx.stroke();
    if(open) {
      const pulse=1.4+Math.sin(state.elapsed*11)*1.1;
      ctx.strokeStyle="#80ffff";ctx.lineWidth=1.3;
      ctx.beginPath();ctx.arc(0,0,16+pulse,0,TAU);ctx.stroke();
    } else {
      line(-9,0,9,0,"#ffad82",2);
    }
    ctx.restore();
  }
  function drawSupplyDrone() {
    const d=state.supplyDrone;
    if(!d)return;
    const pulse=.5+.5*Math.sin(state.elapsed*10);
    const repair=d.kind==="repair",charge=d.kind==="overcharge";
    const edge=repair?"#7dff9b":charge?"#8bc9ff":"#ffdc67";
    const bright=repair?"#d9ffe2":charge?"#e1f5ff":"#fff2b1";
    ctx.save();ctx.translate(d.x,d.y);ctx.rotate(state.elapsed*2.3);
    ctx.strokeStyle=edge;ctx.lineWidth=2.4;
    ctx.beginPath();ctx.moveTo(0,-23);ctx.lineTo(23,0);
    ctx.lineTo(0,23);ctx.lineTo(-23,0);ctx.closePath();ctx.stroke();
    ctx.fillStyle=repair?"#0b3326":charge?"#0b2547":"#2d1b36";
    ctx.strokeStyle=bright;ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(16,0);
    ctx.lineTo(0,16);ctx.lineTo(-16,0);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=bright;
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;
      ctx.fillRect(Math.cos(a)*25-3,Math.sin(a)*25-3,6,6);
    }
    ctx.rotate(-state.elapsed*2.3);
    if(repair){
      // A bright green medical cross — instantly identifiable, not mystery ?.
      ctx.fillStyle="#eafff1";
      ctx.fillRect(-3,-12,6,24);ctx.fillRect(-12,-3,24,6);
    } else if(charge) {
      // Blue electrical lightning, visually different from the shield S.
      ctx.fillStyle="#e8faff";ctx.beginPath();
      ctx.moveTo(2,-14);ctx.lineTo(-8,1);ctx.lineTo(-1,1);
      ctx.lineTo(-5,14);ctx.lineTo(10,-4);ctx.lineTo(2,-4);
      ctx.closePath();ctx.fill();
    } else {
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.font='900 18px "Oxanium", ui-monospace, monospace';
      ctx.fillStyle="#ffffff";ctx.fillText("?",0,1);
    }
    ctx.globalAlpha=.28+.22*pulse;
    ctx.strokeStyle=edge;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(0,0,28+pulse*2,0,TAU);ctx.stroke();
    ctx.restore();
  }
  function drawPowerEffects() {
    if(!state.powerup)return;
    ctx.save();ctx.translate(CX,CY);
    const t=state.elapsed;
    if(state.powerup==="guardian"){
      // Two satellite drones orbit the turret and fire independently.
      for(let i=0;i<2;i++){
        const a=state.guardianAngle+i*Math.PI;
        const x=Math.cos(a)*58,y=Math.sin(a)*58;
        ctx.save();ctx.translate(x,y);ctx.rotate(a);
        ctx.fillStyle="#072c38";ctx.strokeStyle="#81fff0";ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(13,0);
        ctx.lineTo(0,12);ctx.lineTo(-13,0);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(0,0,4,0,TAU);ctx.fill();
        ctx.restore();
      }
    } else if(state.powerup==="stasis"){
      ctx.globalAlpha=.38+.12*Math.sin(t*5);
      ctx.strokeStyle="#91c9ff";ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(0,0,72+2*Math.sin(t*3),0,TAU);ctx.stroke();
      ctx.strokeStyle="#d3f5ff";ctx.lineWidth=1.2;
      ctx.beginPath();ctx.arc(0,0,84,0,TAU);ctx.stroke();
    } else if(state.powerup==="triple"){
      ctx.rotate(state.aim*Math.PI/4);
      ctx.globalAlpha=.72+.16*Math.sin(t*8);
      ctx.strokeStyle="#ffd074";ctx.lineWidth=3;ctx.beginPath();
      for(const side of (state.twinCannons?[0,Math.PI]:[0])){
        for(const a of [-.17,.17]){
          const x=Math.cos(side+a),y=Math.sin(side+a);
          ctx.moveTo(x*34,y*34);ctx.lineTo(x*46,y*46);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawShieldCapsule() {
    const capsule=state.shieldCapsule;
    if (!capsule || state.wave!==4) return;
    ctx.save();
    ctx.translate(capsule.x,capsule.y);
    const pulse=.5+.5*Math.sin(state.elapsed*7);
    // Tiny, unmistakable cyan shield emblem with no expensive shadow blur.
    ctx.lineWidth=2;
    ctx.strokeStyle="#62faff";
    ctx.beginPath();
    ctx.arc(0,0,SHIELD_CAPSULE_RADIUS+2+pulse*2,0,TAU);
    ctx.stroke();
    ctx.rotate(state.elapsed*1.3);
    ctx.fillStyle="#06434d";
    ctx.strokeStyle="#e4ffff";
    ctx.beginPath();
    for(let k=0;k<6;k++){
      const a=k*TAU/6-Math.PI/2;
      const x=Math.cos(a)*SHIELD_CAPSULE_RADIUS;
      const y=Math.sin(a)*SHIELD_CAPSULE_RADIUS;
      if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.rotate(-state.elapsed*1.3);
    ctx.fillStyle="#74fbff";ctx.strokeStyle="#baffff";ctx.lineWidth=1.6;
    ctx.beginPath();
    ctx.moveTo(0,-10);ctx.lineTo(9,-6);ctx.lineTo(7,5);
    ctx.lineTo(0,11);ctx.lineTo(-7,5);ctx.lineTo(-9,-6);ctx.closePath();
    ctx.fill();ctx.stroke();
    ctx.fillStyle="#083443";
    ctx.font='900 12px "Oxanium", ui-monospace, monospace';
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("S",0,0);
    ctx.restore();
  }
  function drawArcLinks() {
    if(!state.arcLinks.length)return;
    ctx.save();ctx.lineCap="round";
    for(const a of state.arcLinks){
      const alpha=Math.max(0,a.life/.20);
      ctx.globalAlpha=alpha;
      ctx.strokeStyle="#55bcf4";ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(a.x1,a.y1);
      ctx.lineTo(a.x2,a.y2);ctx.stroke();
      ctx.strokeStyle="#f0ffff";ctx.lineWidth=1.7;
      ctx.beginPath();ctx.moveTo(a.x1,a.y1);
      const mx=(a.x1+a.x2)/2,my=(a.y1+a.y2)/2;
      ctx.lineTo(mx-3*Math.sin(state.elapsed*23),my+3*Math.cos(state.elapsed*21));
      ctx.lineTo(a.x2,a.y2);ctx.stroke();
    }
    ctx.restore();
  }
  function drawRailBlast() {
    if(state.railFlash<=0)return;
    const fade=Math.min(1,state.railFlash/RAILGUN_FLASH);
    const dx=Math.cos(state.railAngle),dy=Math.sin(state.railAngle);
    const x1=CX+dx*27,y1=CY+dy*27;
    const x2=CX+dx*(R+19),y2=CY+dy*(R+19);
    ctx.save();
    ctx.lineCap="round";
    ctx.globalAlpha*=fade;
    // One intense wide beam, a bright internal channel, and a white-hot core.
    // No blur filters, particle streams, or new images each frame.
    for(const [width,color] of [[27,"#ffa92c"],[13,"#ffe083"],[4.5,"#ffffff"]]){
      ctx.strokeStyle=color;ctx.lineWidth=width;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    }
    // Controlled zig-zag along the discharge makes it read as electricity,
    // not simply a large ordinary bullet. No random allocations.
    const nx=-dy,ny=dx;
    ctx.strokeStyle="#fff0a3";ctx.lineWidth=2.4;
    ctx.beginPath();ctx.moveTo(x1,y1);
    for(let j=1;j<9;j++){
      const along=27+j*(R-8)/9;
      const wobble=Math.sin(j*18.13+state.railAngle*3.3)*7;
      ctx.lineTo(CX+dx*along+nx*wobble,CY+dy*along+ny*wobble);
    }
    ctx.lineTo(x2,y2);ctx.stroke();
    // Visible muzzle bloom appears with either sprite or vector fallback.
    ctx.fillStyle="#fff4a3";
    ctx.beginPath();ctx.arc(CX+dx*43,CY+dy*43,8+12*fade,0,TAU);ctx.fill();
    ctx.fillStyle="#fff";
    ctx.beginPath();ctx.arc(CX+dx*43,CY+dy*43,5+4*fade,0,TAU);ctx.fill();
    ctx.restore();
  }
  function drawShots() {
    ctx.save();ctx.lineCap="round";
    for (const s of state.shots) {
      const x2=s.x-s.vx*.020,y2=s.y-s.vy*.020;
      ctx.strokeStyle=s.color;
      ctx.lineWidth=s.penetrating?8.0:s.friendly&&s.damage>1?6.2:s.friendly?5.2:3.7;
      ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(x2,y2);ctx.stroke();
      ctx.shadowBlur=0;
      ctx.strokeStyle=s.friendly?"#ffffff":"#ffe3b9";
      ctx.lineWidth=s.penetrating?2.5:s.friendly?1.7:1.2;
      ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(x2,y2);ctx.stroke();
    }
    ctx.restore();
  }
  function drawParticles() {
    ctx.save();
    for (const p of state.particles) {
      ctx.globalAlpha=clamp(p.life/p.max,0,1);
      ctx.fillStyle=p.color;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);
    }
    ctx.restore();
  }
  function drawShockwaves() {
    ctx.save();
    for (const wave of state.shockwaves) {
      const age=1-wave.life/wave.maxLife;
      ctx.globalAlpha=Math.max(0,1-age);
      ctx.lineWidth=4*(1-age)+1;
      ctx.strokeStyle=wave.color;
      ctx.beginPath();ctx.arc(wave.x,wave.y,5+wave.radius*age,0,TAU);ctx.stroke();
      ctx.shadowBlur=0;ctx.lineWidth=1;
      ctx.strokeStyle="#fff7cb";
      ctx.beginPath();ctx.arc(wave.x,wave.y,3+wave.radius*age,0,TAU);ctx.stroke();
    }
    ctx.restore();
  }
  function drawImpacts() {
    ctx.save();
    for (const p of state.impacts) {
      const life=p.life/p.max;
      const size=3+12*(1-life);
      ctx.globalAlpha=life;
      ctx.strokeStyle=p.color;
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(p.x-size,p.y);ctx.lineTo(p.x+size,p.y);
      ctx.moveTo(p.x,p.y-size);ctx.lineTo(p.x,p.y+size);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawCustomTurret(angle,pulse) {
    if (!turretArt || !turretArt.complete ||
        turretArt.naturalWidth!==480 || turretArt.naturalHeight!==110) return false;
    // Source composition is centered on the actual rotating chassis pivot.
    // Its footprint matches the previous ~45px shield and 50px cannon.
    const fw=120, fh=110, x=-50.88, y=-47.12, w=104.96, h=95.92;
    ctx.save();
    ctx.rotate(angle);
    if (state.twinCannons) {
      // Mirror the approved barrel behind the armor, only after Wave 4 clears.
      // Using the same source makes front and back cannons visibly match.
      ctx.save();
      ctx.rotate(Math.PI);
      ctx.translate(-Math.min(2,state.turretKick*2),0);
      ctx.drawImage(turretArt,72,44,44,19,12,-8.5,38,17);
      ctx.restore();
    }
    // The complete single-barrel turret stays anchored while it rotates.
    ctx.drawImage(turretArt,0,0,fw,fh,x,y,w,h);
    if (state.shieldUnlocked) {
      for (let i=0;i<SHIELD_MAX;i++) {
        ctx.save();
        ctx.globalAlpha*=i<state.shieldCharges?1:.11;
        ctx.drawImage(turretArt,(i+1)*fw,0,fw,fh,x,y,w,h);
        ctx.restore();
      }
      // Half-second shield shimmer after an impact, recharge or unlock.
      // Only a small sprite overdraw while the timer is active; no particles.
      if (state.shieldFlash>0) {
        const flicker=.35+.65*Math.abs(Math.sin(state.elapsed*34));
        ctx.save();
        ctx.globalAlpha*=Math.min(1,state.shieldFlash/.45)*(.16+.35*flicker);
        ctx.globalCompositeOperation="lighter";
        for (let i=0;i<SHIELD_MAX;i++) {
          if (i===state.shieldFlashArc ||
              (state.shieldFlashArc===-1 && i<state.shieldCharges))
            ctx.drawImage(turretArt,(i+1)*fw,0,fw,fh,x,y,w,h);
        }
        ctx.restore();
      }
    }
    // Slow breathing reactor; briefly surges when the cannon fires.
    // Small flat circles, no per-frame glow filters or shadow blurs.
    const firingSurge=Math.min(1,state.turretKick);
    ctx.save();
    ctx.globalAlpha*=.13+.26*pulse+.21*firingSurge;
    ctx.fillStyle="#50f4ff";
    ctx.beginPath();
    ctx.arc(-8.8,.8,5.3+1.6*pulse+1.3*firingSurge,0,TAU);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha*=.30+.30*pulse+.33*firingSurge;
    ctx.fillStyle="#ecffff";
    ctx.beginPath();
    ctx.arc(-8.8,.8,2.0+.6*pulse+.5*firingSurge,0,TAU);
    ctx.fill();
    ctx.restore();
    // Two chassis indicators use different fixed cycles, not synchronized.
    const cyanOn=state.elapsed%1.70<.24;
    const amberOn=(state.elapsed+.47)%2.35<.18;
    ctx.fillStyle=cyanOn?"#9affff":"#184751";
    ctx.beginPath();ctx.arc(-26,-22,cyanOn?2.2:1.4,0,TAU);ctx.fill();
    ctx.fillStyle=amberOn?"#ffc176":"#55371e";
    ctx.beginPath();ctx.arc(-23,23,amberOn?2.2:1.4,0,TAU);ctx.fill();
    if(state.penetrator) {
      // A gold coil indicates the automatic railgun is charged.
      ctx.save();
      ctx.globalAlpha*=state.penCharge<=0?.95:.24;
      ctx.strokeStyle="#ffcf57";ctx.lineWidth=2.8;
      ctx.beginPath();ctx.arc(-8.8,.8,9.5,0,TAU);ctx.stroke();
      ctx.restore();
    }
    if (state.muzzleFlash>0) {
      const power=state.muzzleFlash/.07;
      for(const side of (state.twinCannons?[0,Math.PI]:[0])) {
        ctx.save();
        ctx.rotate(side);
        ctx.globalAlpha*=power;
        ctx.fillStyle="#f9ffff";
        ctx.beginPath();
        ctx.moveTo(47,-4);
        ctx.lineTo(65+power*7,-7);
        ctx.lineTo(58,0);
        ctx.lineTo(65+power*7,7);
        ctx.lineTo(47,4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
    return true;
  }
  function drawTurret() {
    const angle = state.aim * Math.PI / 4;
    const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * 2.65);
    const kick = state.turretKick * 8;
    const blink = state.phase==="playing" && state.invuln>0 &&
      Math.floor(state.elapsed*13)%2===0;

    ctx.save();
    ctx.translate(CX, CY);
    if (blink) ctx.globalAlpha = .4;
    if (drawCustomTurret(angle,pulse)) {
      ctx.restore();
      return;
    }

    // Fixed, anchored neon defense platform.
    ctx.save();
    ctx.shadowColor = "#23f7ff";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#0d1330";
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, TAU);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = "#48f4ef";
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, TAU);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fa329a";
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, TAU);
    ctx.stroke();

    ctx.shadowBlur = 0;
    for (let i = 0; i < 8; i++) {
      const t = i * Math.PI / 4;
      line(
        Math.cos(t)*31, Math.sin(t)*31,
        Math.cos(t)*37, Math.sin(t)*37,
        i%2===0 ? "#47f7ea" : "#ff5ab0", 2.5
      );
    }
    ctx.restore();

    // Wave 4 graduation mounts the second barrel directly opposite the first.
    // Draw it without expensive glows to preserve Chromebook performance.
    if (state.twinCannons) {
      ctx.save();
      ctx.rotate(angle+Math.PI);
      ctx.translate(-kick,0);
      ctx.fillStyle="#1c2750";
      ctx.fillRect(-10,-10,30,20);
      ctx.strokeStyle="#60dce8";ctx.lineWidth=2;
      ctx.strokeRect(-10,-10,30,20);
      ctx.fillStyle="#e9fbff";
      ctx.fillRect(10,-6,30,12);
      ctx.fillStyle="#38f1ec";ctx.fillRect(15,-2,16,4);
      ctx.fillStyle="#ff4ea7";ctx.fillRect(35,-8,12,16);
      ctx.fillStyle="#fff6d8";
      ctx.beginPath();ctx.arc(45,0,4.2+pulse*1.1,0,TAU);ctx.fill();
      if (state.muzzleFlash>0) {
        const power=state.muzzleFlash/.07;
        ctx.fillStyle="#fffbd6";ctx.globalAlpha*=power;
        ctx.beginPath();
        ctx.moveTo(47,0);ctx.lineTo(66+power*8,-7);
        ctx.lineTo(59,0);ctx.lineTo(66+power*8,7);
        ctx.closePath();ctx.fill();
      }
      ctx.restore();
    }

    // The original forward cannon remains unchanged and rotates with the rear.
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(-kick, 0);

    // Rear mount. Use square corners on older canvas implementations.
    ctx.fillStyle = "#172247";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-12, -11, 28, 22, 8);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#53f7f1";
      ctx.stroke();
    } else {
      ctx.fillRect(-12, -11, 28, 22);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#53f7f1";
      ctx.strokeRect(-12, -11, 28, 22);
    }

    // Small hot-pink stabilizer fins.
    ctx.fillStyle = "#ff4ea7";
    ctx.beginPath();
    ctx.moveTo(-2, -14);
    ctx.lineTo(10, -9);
    ctx.lineTo(0, -4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-2, 14);
    ctx.lineTo(10, 9);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();

    // Bright reinforced barrel.
    ctx.fillStyle = "#e9fbff";
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(10, -6, 30, 12, 4);
      ctx.fill();
    } else {
      ctx.fillRect(10, -6, 30, 12);
    }
    ctx.fillStyle = "#38f1ec";
    ctx.fillRect(15, -2, 16, 4);

    // Hot-pink muzzle with a lively energy shimmer.
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#ff4ea7";
    ctx.fillStyle = "#ff4ea7";
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(35, -8, 12, 16, 4);
      ctx.fill();
    } else {
      ctx.fillRect(35, -8, 12, 16);
    }

    ctx.shadowBlur = 20;
    ctx.shadowColor = "#fff2b8";
    ctx.fillStyle = "#fff6d8";
    ctx.beginPath();
    ctx.arc(45, 0, 4.2 + pulse*1.1, 0, TAU);
    ctx.fill();

    ctx.shadowBlur = 0;
    line(47, -5, 52, -8, "#fff", 1.5);
    line(47, 5, 52, 8, "#fff", 1.5);
    if (state.muzzleFlash>0) {
      const power=state.muzzleFlash/.07;
      ctx.globalAlpha*=power;
      ctx.fillStyle="#fffbd6";ctx.shadowColor="#fdffab";ctx.shadowBlur=18;
      ctx.beginPath();
      ctx.moveTo(47,0);ctx.lineTo(66+power*8,-7);
      ctx.lineTo(59,0);ctx.lineTo(66+power*8,7);
      ctx.closePath();ctx.fill();
    }
    ctx.restore();

    // Pulsing core remains visually centered as the barrel recoils.
    ctx.save();
    ctx.shadowColor = "#29fcf0";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#29fcf0";
    ctx.beginPath();
    ctx.arc(0, 0, 10+pulse*1.2, 0, TAU);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "#ff66b8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, TAU);
    ctx.stroke();
    ctx.restore();

    // Segmented energy shield: three crisp arcs, strictly separate from hull.
    // No glow or additional moving geometry when the shield isn't equipped.
    if (state.shieldUnlocked) {
      ctx.save();ctx.lineWidth=4.5;ctx.lineCap="round";
      for(let i=0;i<SHIELD_MAX;i++){
        const start=i*TAU/SHIELD_MAX-1.42;
        ctx.strokeStyle=i<state.shieldCharges?"#7afcff":"#294454";
        ctx.beginPath();ctx.arc(0,0,43,start,start+1.75);ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function label(text,x,y,size,color,align="left") {
    // One clean text pass: crisp instrumentation is readable at laptop scale.
    ctx.font="800 "+size+'px "Oxanium", ui-monospace, monospace';
    ctx.textAlign=align;ctx.textBaseline="alphabetic";
    ctx.shadowBlur=0;ctx.fillStyle=color;ctx.fillText(text,x,y);
  }
  function drawHUD() {
    // Fully opaque instrument rails sit above every effect, even damage flashes.
    ctx.save();
    ctx.fillStyle="#080d1a";ctx.fillRect(0,0,W,65);
    ctx.fillStyle="#080d1a";ctx.fillRect(0,677,W,43);
    line(0,64,W,64,"#315365",2);
    line(0,677,W,677,"#315365",2);
    ctx.fillStyle="#203745";
    for(const x of [216,478,757])ctx.fillRect(x,13,1,39);
    label("SCORE",30,24,13,"#81c9ce");
    label(String(state.score).padStart(6,"0"),30,52,25,"#f8fbff");
    label("BEST",242,24,13,"#81c9ce");
    label(String(state.high).padStart(6,"0"),242,52,25,"#f8fbff");
    label(state.testMode ? "TEST WAVE" : "WAVE",512,24,13,state.testMode ? "#f3ba79" : "#81c9ce");
    label(String(state.wave).padStart(2,"0"),512,52,25,"#f8fbff");
    // Hull bars are separate from the rechargeable shield system.
    label("HULL",650,24,13,"#81c9ce");
    for(let i=0;i<HULL_CAPACITY;i++){
      ctx.fillStyle=i<state.hull?"#f7c779":"#35404a";
      ctx.fillRect(650+i*28,40,20,9);
    }
    label("LIVES",790,24,13,"#81c9ce");
    for(let i=0;i<state.lives;i++) {
      // Fit all five reserve icons inside the right-hand HUD rail.
      ctx.save();ctx.translate(800+i*30,44);ctx.rotate(-Math.PI/2);
      ctx.fillStyle="#ff7bb9";ctx.beginPath();ctx.moveTo(13,0);
      ctx.lineTo(-9,-8);ctx.lineTo(-4,0);ctx.lineTo(-9,8);ctx.closePath();ctx.fill();
      ctx.restore();
    }
    label("ARENA: "+modeName(),28,706,18,
      modeName()==="MELTDOWN"?"#ff8cbe":modeName()==="MORPH"?"#d1f990":"#8aece5");
    if(state.shieldUnlocked) label("SHIELD "+state.shieldCharges+"/"+SHIELD_MAX,
      264,705,13,"#81f7fb");
    if(state.wave===4 && !state.heavyLaser)
      label("DIRECT "+Math.min(state.wave4DirectKills,HEAVY_KILLS_REQUIRED)+
        "/"+HEAVY_KILLS_REQUIRED,380,705,13,
        state.wave4DirectKills>=HEAVY_KILLS_REQUIRED?"#c8ff9b":"#ffc982");
    else if(state.penetrator)
      label(state.penCharge<=0?"RAILGUN READY":"RAIL "+state.penCharge.toFixed(1)+"s",
        380,705,13,"#ffdb71");
    if(state.arcCannon)
      label(state.arcCharge<=0?"ARC READY":"ARC "+state.arcCharge.toFixed(1)+"s",
        561,51,11,"#9cf6ff");
    else if(state.heavyLaser)
      label("HEAVY LASER",380,705,13,"#dbadff");
    if((state.wave===4 || state.wave===8 || state.wave===12) &&
        (state.bossState==="warning" || state.bossState==="entering"))
      label(state.wave===12?"LEVIATHAN INBOUND":
        state.wave===8?"ARCHITECT INBOUND":"WARDEN INBOUND",
        W-26,706,15,"#ff7b67","right");
    else if(state.boss?.type==="leviathan"){
      const b=state.boss, remaining=b.pods.filter(p=>p.hp>0).length;
      label(remaining?"LEVIATHAN PODS "+remaining+"/3":
          "LEVIATHAN CORE "+b.coreHp+"/"+LEVIATHAN_CORE_HP+
          (leviathanCoreOpen(b)?" OPEN":" SEALED"),
        W-26,706,13,remaining?"#ffa980":b.phase==="fury"?"#ff627f":"#fff0a2","right");
    }
    else if(state.boss?.type==="architect")
      label("ARCHITECT "+state.boss.hp+"/"+ARCHITECT_HP+
        (architectCoreOpen(state.boss)?" CORE OPEN":" SEALED"),
        W-26,706,13,architectCoreOpen(state.boss)?"#f3b9ff":"#e8acff","right");
    else if(state.boss)
      label("WARDEN "+state.boss.hp+"/"+WARDEN_HP+
        (wardenCoreOpen(state.boss)?" CORE OPEN":" ARMORED"),
        W-26,706,14,wardenCoreOpen(state.boss)?"#8ffaff":"#ffae8c","right");
    else if((state.wave===4 || state.wave===8 || state.wave===12) &&
        state.bossDefeated)
      label(state.wave===12?"LEVIATHAN DOWN":
        state.wave===8?"ARCHITECT DOWN":"WARDEN DOWN",
        W-26,706,15,"#88ffdf","right");
    else if(state.miniBossState==="warning")
      label("MINI-BOSS INBOUND",W-26,706,14,"#ff9d7f","right");
    else if(state.miniBossState==="active" && state.miniBoss){
      const b=state.miniBoss;
      label(b.type.toUpperCase()+" "+Math.max(0,b.hp)+"/"+b.maxHp+
        "  BOTS "+(state.bots.length+state.toSpawn),
        W-26,706,12,b.type==="breaker"?"#ffc187":"#ff9abc","right");
    }
    else label("ROBOTS: "+String(state.bots.length+state.toSpawn).padStart(2,"0"),
      W-26,706,17,"#f8d89b","right");
    if(state.powerup){
      const title=state.powerup==="triple"?"TRIPLE THREAT":
        state.powerup==="guardian"?"GUARDIAN DRONES":"STASIS FIELD";
      const color=state.powerup==="triple"?"#ffd681":
        state.powerup==="guardian"?"#92ffe8":"#a9cfff";
      const duration=POWERUP_DURATIONS[state.powerup];
      // The region just outside the circular arena stays free of HUD labels.
      ctx.fillStyle="#071323eb";ctx.fillRect(345,652,270,21);
      ctx.fillStyle=color;
      ctx.fillRect(346,670,268*state.powerClock/duration,2);
      label(title+"  "+state.powerClock.toFixed(1)+"s",480,667,12,color,"center");
    }
    if(state.comboClock>0)label("CHAIN x"+state.combo,655,705,15,"#ffa3c9","center");
    const remaining=Math.ceil(DURATIONS[state.modeIndex]-state.modeClock);
    label("SHIFT IN "+remaining+"s",527,704,12,"#b2bdd5","center");
    ctx.restore();
  }

  function drawAnnouncements() {
    if(state.announceClock<=0)return;
    // A sector-clear plaque owns the announcement area during transitions.
    if(state.revealClock>0 ||
       (state.toSpawn===0 && state.bots.length===0 && state.waveClock>0))return;
    ctx.save();
    ctx.globalAlpha=clamp(state.announceClock*1.6,0,1);
    ctx.fillStyle="#080d1af0";
    ctx.fillRect(CX-234,77,468,49);
    ctx.fillStyle="#8fcbd3";
    ctx.fillRect(CX-234,124,468,2);
    ctx.textAlign="center";ctx.textBaseline="alphabetic";
    ctx.font='800 27px "Oxanium", ui-monospace, monospace';
    ctx.shadowBlur=0;ctx.fillStyle="#f8fbff";
    ctx.fillText(state.announce,CX,111,452);
    ctx.restore();
  }

  function drawWaveCelebration() {
    if(state.phase!=="playing")return;
    const clear=state.toSpawn===0 && state.bots.length===0 && state.waveClock>0;
    const reveal=state.revealClock>0;
    if(!clear && !reveal)return;
    const next=clear?visualEvolution(state.wave+1):visualEvolution();
    const progress=clear?clamp(state.waveClock/2,0,1):1-state.revealClock/1.45;
    const alpha=clear?Math.min(1,progress*7,(1-progress)*4.5):
      Math.min(1,(1-progress)*2.9);
    if(alpha<=0)return;
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.translate(CX,CY);

    // Same inexpensive wavefront as before, in each wave's own colors.
    const hue=clear?visualEvolution(state.wave).hue:next.hue;
    const radius=clear?74+progress*184:260-(1-progress)*138;
    ctx.strokeStyle="hsla("+hue+",100%,72%,.65)";
    ctx.lineWidth=3.4;
    ctx.beginPath();ctx.arc(0,0,radius,0,TAU);ctx.stroke();
    ctx.strokeStyle="hsla("+((hue+68)%360)+",100%,84%,.72)";
    ctx.lineWidth=2.2;ctx.beginPath();
    for(let k=0;k<20;k++) {
      const a=k*TAU/20+state.elapsed*.32;
      const start=Math.max(83,radius-26),stop=Math.min(R-6,radius+17);
      ctx.moveTo(Math.cos(a)*start,Math.sin(a)*start);
      ctx.lineTo(Math.cos(a)*stop,Math.sin(a)*stop);
    }
    ctx.stroke();

    if(clear) {
      // A synchronized *ceremonial* motif sits over the existing rings.
      // The actual rotating walls, trajectories and collisions never change.
      const phase=state.elapsed*.42*(1-progress)+progress*Math.PI/6;
      ctx.lineWidth=2;
      ctx.beginPath();
      for(const ringRadius of [116,186,250]) {
        for(let i=0;i<12;i++) {
          const a=phase+i*TAU/12;
          ctx.moveTo(Math.cos(a)*(ringRadius-9),Math.sin(a)*(ringRadius-9));
          ctx.lineTo(Math.cos(a)*(ringRadius+9),Math.sin(a)*(ringRadius+9));
        }
      }
      ctx.strokeStyle="hsla("+((hue+35)%360)+",100%,75%,.50)";
      ctx.stroke();

      // Preserve the diploma, but replace its old headline with the
      // approved STAGE CLEAR plaque. Keep its bottom above the player turret.
      const [degree,motto]=graduationFor(state.wave);
      const artReady = !!(cyberArt && cyberArt.complete && cyberArt.naturalWidth >= 660);
      if (artReady) {
        // Cropped upper-left stage plaque in the 660 x 271 sprite sheet.
        ctx.drawImage(cyberArt, 0, 173, 326, 83, -240, -CY+87, 480, 115);
      }
      const y=-CY+(artReady?203:108), height=artReady?145:190;
      ctx.fillStyle="#080d1af5";ctx.fillRect(-302,y,604,height);
      ctx.fillStyle="hsl("+hue+",95%,70%)";
      ctx.fillRect(-302,y,604,4);ctx.fillRect(-302,y+height-4,604,4);
      ctx.fillStyle="#edfaff";ctx.textAlign="center";ctx.textBaseline="alphabetic";
      ctx.shadowBlur=0;
      if (!artReady) {
        ctx.font='900 36px "Oxanium", ui-monospace, monospace';
        ctx.fillText("WAVE "+String(state.wave).padStart(2,"0")+" CLEARED!",0,y+53);
      }
      ctx.font='800 13px "Oxanium", ui-monospace, monospace';
      ctx.fillStyle="hsl("+hue+",100%,77%)";
      ctx.fillText("OFFICIAL GRADUATION CEREMONY"+
        (artReady?" // WAVE "+String(state.wave).padStart(2,"0"):""),
        0,y+(artReady?27:77));
      ctx.font='900 23px "Oxanium", ui-monospace, monospace';
      ctx.fillStyle="#ffffff";ctx.fillText(degree,0,y+(artReady?69:112),574);
      ctx.font='700 15px "Oxanium", ui-monospace, monospace';
      ctx.fillStyle="#d4e4ef";ctx.fillText(motto,0,y+(artReady?96:140),574);
      ctx.font='700 13px "Oxanium", ui-monospace, monospace';
      ctx.fillStyle="#ffc982";
      const reward=state.wave===3?"REWARD UNLOCKED // DEFENSE SHIELD":
        state.wave===4 ? state.wave4DirectKills>=HEAVY_KILLS_REQUIRED ?
          "UNLOCKED // TWIN CANNONS + HEAVY LASER":
          "TWIN CANNONS // LASER "+state.wave4DirectKills+"/"+HEAVY_KILLS_REQUIRED+" DIRECT KILLS":
        state.wave===6?"REWARD UNLOCKED // RAILGUN":
        state.wave===8?"REWARD UNLOCKED // ARC CANNON":
        state.wave===12?"VICTORY // LEVIATHAN COMMAND SILENCED":
        "NEXT CLASS // WAVE "+String(state.wave+1).padStart(2,"0");
      ctx.fillText(reward,0,y+(artReady?128:169));
    } else {
      // After graduation, let the established sector reveal introduce combat.
      const y=-CY+136;
      ctx.fillStyle="#080d1af2";ctx.fillRect(-190,y,380,65);
      ctx.fillStyle="hsl("+next.hue+",85%,68%)";ctx.fillRect(-190,y+63,380,2);
      ctx.textAlign="center";ctx.textBaseline="alphabetic";
      ctx.font='900 27px "Oxanium", ui-monospace, monospace';
      ctx.fillStyle="#f8fbff";
      ctx.fillText("WAVE "+String(state.wave).padStart(2,"0"),0,y+29);
      ctx.font='800 14px "Oxanium", ui-monospace, monospace';
      ctx.fillStyle="#c1e1e5";
      ctx.fillText("FIELD ONLINE // "+next.name,0,y+51);
    }
    ctx.restore();
  }

  function draw() {
    ctx.save();
    if (state.shake>0 && state.phase==="playing")
      ctx.translate(rnd(-state.shake,state.shake),rnd(-state.shake,state.shake));
    const visual=visualEvolution();
    drawBackground(visual);drawEvolutionGhosts(visual);drawRings(visual);
    drawShockwaves();drawBots();drawMiniBoss();drawOtto();drawSupplyDrone();drawShieldCapsule();drawWarden();drawArchitect();drawLeviathan();drawLeviathanDeath();drawShots();drawArcLinks();drawRailBlast();drawParticles();drawImpacts();drawTurret();drawPowerEffects();
    // The perimeter alarm flashes during the warning and the boss entry.
    if((state.wave===4 || state.wave===8 || state.wave===12) &&
        (state.bossState==="warning" || state.bossState==="entering") &&
        Math.floor(state.elapsed*5)%2===0) {
      ctx.strokeStyle="#ff465a";ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(CX,CY,R+17,0,TAU);ctx.stroke();
    }
    ctx.restore();
    if(state.flash>0) {
      ctx.fillStyle="rgba(255,50,95,"+(state.flash*.18)+")";
      ctx.fillRect(0,65,W,612);
    }
    drawWaveCelebration();drawHUD();drawAnnouncements();
  }
  function frame(now) {
    const dt=clamp((now-last)/1000,0,.035);
    last=now;
    if(state.phase==="playing") update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function syncAimPad() {
    const closest = Math.round(state.aim) % 8;
    for(const button of padButtons) button.classList.toggle("active",Number(button.dataset.dir)===closest);
    if(touchPrimary && touchAimNeedle && touchAimWheel){
      // Indicator follows the ACTUAL capped turret angle, not a target that
      // could otherwise appear to snap there instantly.
      const degrees=((state.aim*45)%360+360)%360;
      touchAimNeedle.style.transform="rotate("+degrees+"deg)";
      touchAimWheel.setAttribute("aria-valuenow",String(Math.round(degrees)));
      touchAimWheel.setAttribute("aria-valuetext",
        ["east","southeast","south","southwest","west","northwest","north","northeast"]
          [Math.round(state.aim)%8]);
    }
  }
  function setAimTarget(x,y) {
    if (Math.hypot(x-CX,y-CY)<18) return;
    const theta=Math.atan2(y-CY,x-CX);
    state.aimTarget=((theta/(Math.PI/4))%8+8)%8;
  }
  function setQuickAimTarget(direction) {
    state.aimTarget=direction;
  }
  function keyAim() {
    // WASD select one of eight destinations; all turns remain speed-limited.
    const left=keys.has("a")||keys.has("A");
    const right=keys.has("d")||keys.has("D");
    const up=keys.has("w")||keys.has("W");
    const down=keys.has("s")||keys.has("S");
    const x=Number(right)-Number(left), y=Number(down)-Number(up);
    if (x||y) setAimTarget(CX+x*100,CY+y*100);
  }
  function canvasPoint(event) {
    const rect=canvas.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*W/rect.width,
            y:(event.clientY-rect.top)*H/rect.height};
  }

  // The leaderboard can pause a live run without learning combat internals.
  // Its own module handles network calls outside the animation loop.
  window.BeyondBerzerkBoardBridge = {
    phase:()=>state.phase,
    togglePause:pause
  };

  // Wire normal play first. Older cached HTML may not contain the test-mode
  // controls, but START GAME must remain usable during a Pages deployment.
  startButton.addEventListener("click",()=>state.phase==="paused"?pause():start());

  function launchTest() {
    if (!testWaveInput) return;
    const value=Number(testWaveInput.value);
    const wave=clamp(Number.isFinite(value) ? Math.floor(value) : 4,1,999);
    testWaveInput.value=String(wave);
    start(wave,true);
  }
  // Test controls are optional while an older index.html is still cached.
  // A missing test widget must never abort boot before normal-game handlers.
  if (testWaveInput) {
    testWaveInput.addEventListener("keydown",event=>{
      event.stopPropagation();
      if(event.key==="Enter") {event.preventDefault();launchTest();}
    });
  }
  if (testStartButton) testStartButton.addEventListener("click",launchTest);

  window.addEventListener("keydown",event=>{
    // Prevent fire/restart and pause shortcuts while the online board is open.
    if (document.getElementById("bb-world-modal")?.hidden === false) return;
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Enter"].includes(event.key))
      event.preventDefault();
    if ((event.key==="p"||event.key==="P") && !event.repeat) {pause();return;}
    if (event.key===" "||event.key==="Enter") {
      if (state.phase==="ready"||state.phase==="over") {
        // A held fire key must never restart a finished game via key repeat.
        // Require a fresh keypress after releasing the key.
        if (!event.repeat && !keys.has(event.key)) {
          start();
          keys.add(event.key); // Holding START/SPACE still fires immediately.
        }
        return;
      }
      if (state.phase==="paused") {
        if (!event.repeat && !keys.has(event.key)) pause();
        return;
      }
    }
    keys.add(event.key);
    keyAim();
  });
  window.addEventListener("keyup",event=>{keys.delete(event.key);keyAim();});
  window.addEventListener("blur",()=>{
    keys.clear();pointerFiring=buttonFiring=false;touchWheelPointer=null;
    if(touchAimWheel)touchAimWheel.classList.remove("aiming");
    fireButton.classList.remove("firing");
    if(state.phase==="playing")pause();
  });
  document.addEventListener("visibilitychange",()=>{if(document.hidden && state.phase==="playing")pause();});
  canvas.addEventListener("pointermove",event=>{
    if(event.pointerType==="mouse"||pointerFiring||event.buttons) {
      const p=canvasPoint(event);setAimTarget(p.x,p.y);
    }
  });
  canvas.addEventListener("pointerdown",event=>{
    if(state.phase!=="playing")return;
    event.preventDefault();
    const p=canvasPoint(event);setAimTarget(p.x,p.y);
    pointerFiring=true;
    try{canvas.setPointerCapture(event.pointerId);}catch{}
  });
  function endPointer(){pointerFiring=false;}
  canvas.addEventListener("pointerup",endPointer);
  canvas.addEventListener("pointercancel",endPointer);
  canvas.addEventListener("lostpointercapture",endPointer);
  for (const button of padButtons) {
    button.addEventListener("pointerdown",event=>{
      event.preventDefault();setQuickAimTarget(Number(button.dataset.dir));
    });
    button.addEventListener("click",()=>setQuickAimTarget(Number(button.dataset.dir)));
  }
  if(touchPrimary && touchAimWheel){
    function steerFromWheel(event){
      const box=touchAimWheel.getBoundingClientRect();
      const dx=event.clientX-box.left-box.width/2;
      const dy=event.clientY-box.top-box.height/2;
      if(Math.hypot(dx,dy)<12)return; // Small dead zone for thumb comfort.
      setAimTarget(CX+dx,CY+dy);
    }
    function finishWheel(event){
      if(event.pointerId!==touchWheelPointer)return;
      touchWheelPointer=null;
      touchAimWheel.classList.remove("aiming");
    }
    touchAimWheel.addEventListener("pointerdown",event=>{
      if(state.phase!=="playing" || touchWheelPointer!==null)return;
      event.preventDefault();
      touchWheelPointer=event.pointerId;
      touchAimWheel.classList.add("aiming");
      try{touchAimWheel.setPointerCapture(event.pointerId);}catch{}
      steerFromWheel(event);
    });
    touchAimWheel.addEventListener("pointermove",event=>{
      if(event.pointerId!==touchWheelPointer)return;
      event.preventDefault();
      steerFromWheel(event);
    });
    touchAimWheel.addEventListener("pointerup",finishWheel);
    touchAimWheel.addEventListener("pointercancel",finishWheel);
    touchAimWheel.addEventListener("lostpointercapture",finishWheel);
    // Accessible coarse directional changes for a keyboard connected to
    // a phone: slider arrows don't interfere with global game arrow keys.
    touchAimWheel.addEventListener("keydown",event=>{
      if(event.key!=="ArrowLeft" && event.key!=="ArrowRight" &&
         event.key!=="ArrowUp" && event.key!=="ArrowDown")return;
      event.preventDefault();event.stopPropagation();
      const direction=(event.key==="ArrowLeft"||event.key==="ArrowUp")?-1:1;
      const a=state.aim*Math.PI/4+direction*Math.PI/8;
      setAimTarget(CX+Math.cos(a)*100,CY+Math.sin(a)*100);
    });
  }
  fireButton.addEventListener("pointerdown",event=>{
    event.preventDefault();
    if(state.phase!=="playing")return;
    buttonFiring=true;fireButton.classList.add("firing");
    try{fireButton.setPointerCapture(event.pointerId);}catch{}
  });
  function endFire(){buttonFiring=false;fireButton.classList.remove("firing");}
  fireButton.addEventListener("pointerup",endFire);
  fireButton.addEventListener("pointercancel",endFire);
  fireButton.addEventListener("lostpointercapture",endFire);
  pauseButton.addEventListener("click",pause);
  soundButton.addEventListener("click",()=>{
    soundOn=!soundOn;
    soundButton.textContent=soundOn?"SOUND ON":"SOUND OFF";
    soundButton.setAttribute("aria-pressed",String(soundOn));
    if(soundOn)primeAudio(true);
  });

  // Decorative robots behind the ready-screen overlay.
  for(let i=0;i<36;i++) spawnBot(true);
  syncAimPad();
  requestAnimationFrame(frame);
})();