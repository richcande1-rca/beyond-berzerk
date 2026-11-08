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
  const SHIELD_CAPSULE_RADIUS = 16;
  // One physical rotation speed and acceleration for every aiming method.
  const TURRET_MAX_SPEED = 5.6, TURRET_ACCEL = 25, TURRET_BRAKE = 65;
  const HEAVY_KILLS_REQUIRED = 8, PENETRATOR_COOLDOWN = 4.5;
  const WAVE_NAMES = ["FIRST CONTACT", "SIDEWINDERS", "CROSSFIRE",
    "HEAVY METAL", "DOGPILE", "TOTAL MAYHEM", "REACTOR SPIN",
    "PANIC LOOP", "ROBOT RIOT", "CRITICAL MASS"];
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
      waveElapsed:0, waveTotal:0, shieldCapsule:null, shieldCapsuleSeen:false,
      boss:null, bossState:"none", bossWarning:0, bossDefeated:false, clearBossShots:false,
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
    state.testStartWave = state.wave;
    state.toSpawn = state.wave===1 ? 15 : Math.min(120,10+state.wave*5);
    state.waveTotal=state.toSpawn;
    state.announce = (testMode ? "TEST // " : "") +
      "WAVE " + String(state.wave).padStart(2,"0") + " — " + waveName();
    state.announceClock = 2.2;
    state.revealClock = testMode ? 1.45 : 0;
    pointerFiring = buttonFiring = false;
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
  }

  function modeName() { return MODES[state.modeIndex]; }
  function waveName() { return WAVE_NAMES[(state.wave-1)%WAVE_NAMES.length]; }
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
    for (const [index,ring] of state.rings.entries()) {
      // Each ring has its own staggered reversal clock. The one-second
      // warning makes the change readable, not a surprise collision.
      if (state.wave >= 2) {
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
      ring.angle += ring.speed * ring.spin * boost * dt *
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
      x:CX+Math.cos(a)*r, y:CY+Math.sin(a)*r, size:heavy?8.6:7.2,
      type, speed:(rnd(24,33) + Math.min(35,state.wave*2.1))*factors[type],
      hue:ROLE_COLORS[type], hp:heavy?2:1, armored:heavy,
      shotClock: type==="gunner"?rnd(1.1,2.3):rnd(1.9,3.9),
      wobble:rnd(0,TAU), direction:Math.random()<.5?-1:1,
      panic:0, panicAngle:0, age:0
    };
    if (!preview && wallHit(bot.x,bot.y,bot.size)) return false;
    state.bots.push(bot);
    return true;
  }
  function burst(x, y, color, amount=12, force=1) {
    for (let i=0;i<amount;i++) {
      const a=rnd(0,TAU), speed=rnd(35,180)*force;
      state.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
        life:rnd(.22,.65),max:.65,color,size:rnd(1.1,3.4)});
    }
    if (state.particles.length>450) state.particles.splice(0,state.particles.length-450);
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
    // Shots damage the hull; robot contact bypasses hull durability entirely.
    // Shot grace applies to projectiles only, not robot collisions.
    if (state.invuln>0 || state.phase!=="playing") return;
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
    else setStatus((kind==="contact"?"ROBOT CONTACT":"HULL BREACH")+
      " — "+state.lives+" LIVES");
  }
  function firePlayer() {
    const angle=state.aim*Math.PI/4, dx=Math.cos(angle),dy=Math.sin(angle);
    // Only the forward barrel fires the periodic manually aimed Penetrator;
    // the original rear barrel continues to fire heavy lasers normally.
    const penetration=state.penetrator && state.penCharge<=0;
    if (penetration) state.penCharge=PENETRATOR_COOLDOWN;
    const damage=state.heavyLaser?2:1;
    const color=state.heavyLaser?"#dbadff":"#ecfdff";
    state.shots.push({x:CX+dx*27,y:CY+dy*27,
      vx:dx*610,vy:dy*610,life:.7,friendly:true,size:3.3,
      color:penetration?"#ffd46c":color,damage:penetration?3:damage,
      penetrating:penetration});
    burst(CX+dx*28,CY+dy*28,penetration?"#ffe6aa":"#90faff",2,.15);
    if(state.twinCannons){
      state.shots.push({x:CX-dx*27,y:CY-dy*27,
        vx:-dx*610,vy:-dy*610,life:.7,friendly:true,size:3.3,
        color,damage,penetrating:false});
      burst(CX-dx*28,CY-dy*28,"#90faff",2,.15);
    }
    state.turretKick=1;
    state.muzzleFlash=.07;
    tone(740,.055,"square",.033,420);
  }
  function fireBot(bot) {
    if (state.shots.filter(s=>!s.friendly).length>65) return;
    const aim = Math.atan2(CY-bot.y,CX-bot.x) + rnd(-.08,.08);
    const speed = 150 + Math.min(100,state.wave*9);
    state.shots.push({x:bot.x+Math.cos(aim)*11,y:bot.y+Math.sin(aim)*11,
      vx:Math.cos(aim)*speed,vy:Math.sin(aim)*speed,life:2.6,
      friendly:false,size:3.2,color:"#ff7a4b"});
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
      b.age+=dt;
      let d=dist(b.x,b.y), a=polar(b.x,b.y);
      const preferred = b.type==="gunner"?153:b.type==="flank"?108:
        b.type==="rush"?69:83;
      let heading=a+Math.PI;
      let speed=b.speed*dt;
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
        b.panic=Math.max(0,b.panic-dt);
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
      b.shotClock-=dt;
      const fireRange=b.type==="gunner"?190:b.type==="flank"?138:
        b.type==="rush"?94:125;
      if (b.shotClock<=0 && d<fireRange && clearShotPath(b.x,b.y)) {
        fireBot(b);
        b.shotClock=(b.type==="gunner"?rnd(1.5,2.6):rnd(2.8,4.6))/
          (1+Math.min(.35,state.wave*.025));
      } else if (b.shotClock<=0) b.shotClock=rnd(.25,.7);
    }
  }
  function shotPathClear(shot, seconds) {
    // Penetrators ignore walls, but still expire at the arena perimeter.
    if (shot.penetrating) {
      const x=shot.x+shot.vx*seconds,y=shot.y+shot.vy*seconds;
      return dist(x,y)<=R+21;
    }
    // Interceptions cannot occur through the arena's moving walls.
    const steps=Math.max(1,Math.ceil(Math.hypot(shot.vx,shot.vy)*seconds/4));
    for (let i=1;i<=steps;i++) {
      const t=seconds*i/steps;
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
        const vx=a.vx-b.vx, vy=a.vy-b.vy;
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
      const x=(a.x+a.vx*t+b.x+b.vx*t)/2;
      const y=(a.y+a.vy*t+b.y+b.vy*t)/2;
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
      s.life-=dt;
      if (s.life<=0) {state.shots.splice(i,1);continue;}
      const steps=Math.max(1,Math.ceil(Math.hypot(s.vx,s.vy)*dt/5));
      let hit=false;
      for (let j=0;j<steps;j++) {
        s.x+=s.vx*dt/steps;s.y+=s.vy*dt/steps;
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
          const boss=state.boss;
          // When cyan, the outer armor opens a clear path to the reactor.
          // Otherwise the closed plate stops shots at the outer 35px radius.
          if (boss && state.bossState==="active" &&
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
                state.announce="ARMOR BREACHED // PHASE "+boss.phase;
                state.announceClock=1.2;
                setStatus("WARDEN CORE HIT — "+boss.hp+" REMAIN");
              }
            } else {
              burst(s.x,s.y,"#ff9d64",3,.25);
              tone(165,.045,"triangle",.012,130);
            }
            hit=true;break;
          }
          for (let k=state.bots.length-1;k>=0;k--) {
            const b=state.bots[k];
            if (Math.hypot(s.x-b.x,s.y-b.y)<b.size+4) {
              b.hp-=s.damage||1;
              burst(s.x,s.y,s.penetrating?"#ffe9ab":"#ffffff",4,.27);
              if (b.hp<=0) scrap(k,false);
              else tone(170,.07,"triangle",.025,110);
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
  }
  function wardenCoreOpen(boss) {
    if(state.bossState!=="active")return false;
    const clock=boss.age%WARDEN_CYCLE;
    return clock>=.75 && clock<2.8;
  }
  function fireWarden(boss) {
    const count=boss.phase===1?2:boss.phase===2?3:5;
    if(state.shots.filter(s=>!s.friendly).length+count>65)return;
    const angle=Math.atan2(CY-boss.y,CX-boss.x);
    const speed=165+boss.phase*19;
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
          guard:0,entry:1.15,fireClock:2.0
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
    b.angle+=(.38+(b.phase-1)*.13)*dt;
    const radius=210+7*Math.sin(b.age*.62);
    b.x=CX+Math.cos(b.angle)*radius;
    b.y=CY+Math.sin(b.angle)*radius;
    b.fireClock-=dt;
    if(b.fireClock<=0) {
      // Enemy volleys obey the existing wall hitboxes and firing lanes.
      if(clearShotPath(b.x,b.y)) {
        fireWarden(b);
        b.fireClock=[0,2.65,2.15,1.7][b.phase];
      } else b.fireClock=.28;
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
    if (!state.toSpawn && !state.bots.length) {
      if(state.wave===4 && !state.bossDefeated) {
        // Wave 4 cannot graduate until the capsule pass and Warden defeat.
        if(!state.shieldCapsuleSeen || state.shieldCapsule)return;
        if(state.bossState==="none") {
          state.bossState="warning";
          state.bossWarning=2.35;
          state.shots=state.shots.filter(s=>s.friendly);
          state.announce="WARNING: SECTOR NOT CLEARED";
          state.announceClock=2.35;
          state.flash=.14;
          tone(185,.28,"sawtooth",.055,120);
          setStatus("WARNING: SECTOR NOT CLEARED");
        }
        return;
      }
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
        state.boss=null;state.bossState="none";
        state.bossWarning=0;state.bossDefeated=false;
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
          state.wave===7?" — PENETRATOR ONLINE":"";
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
    state.fireClock-=dt;
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
    updateBots(dt);
    if (state.phase==="playing") {
      updateShieldCapsule(dt);
      updateWarden(dt);
      updateShots(dt);
    }
    updateBlasts(dt);
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
    // Wave 3: an unmistakable purple prism lattice, not merely three circles.
    else if(v.stage===3) {
      ctx.save();ctx.rotate(-t*.17);
      ctx.fillStyle=ink(20,.16);ctx.strokeStyle=ink(32,.60);ctx.lineWidth=2.8;
      for(let k=0;k<9;k++) {
        const a=k*TAU/9, r=169+12*Math.sin(t*1.4+k);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*76,Math.sin(a)*76);
        ctx.lineTo(Math.cos(a-.26)*r,Math.sin(a-.26)*r);
        ctx.lineTo(Math.cos(a)*255,Math.sin(a)*255);
        ctx.lineTo(Math.cos(a+.26)*r,Math.sin(a+.26)*r);
        ctx.closePath();ctx.fill();ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle=ink(-35,.43);ctx.lineWidth=2.5;ctx.beginPath();
      for(let k=0;k<3;k++){
        const r=105+k*65+8*Math.sin(t*2+k);
        ctx.moveTo(r,0);ctx.arc(0,0,r,0,TAU);
      }
      ctx.stroke();
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
    // Wave 5: a living emerald vector corridor. Background only; hitboxes
    // stay exactly where the real wall segments are rendered.
    else if(v.stage===5) {
      ctx.save();ctx.rotate(.16*Math.sin(t*.36));
      ctx.strokeStyle=ink(0,.54);ctx.lineWidth=2.2;ctx.beginPath();
      for(let x=-252;x<=252;x+=43) {
        for(let y=-270;y<=270;y+=30) {
          const bx=x+24*Math.sin(y*.018+t*.8+x*.009);
          if(y===-270)ctx.moveTo(bx,y);else ctx.lineTo(bx,y);
        }
      }
      for(let y=-252;y<=252;y+=53){
        for(let x=-276;x<=276;x+=30){
          const by=y+19*Math.sin(x*.02-t*.7+y*.013);
          if(x===-276)ctx.moveTo(x,by);else ctx.lineTo(x,by);
        }
      }
      ctx.stroke();ctx.restore();
      ctx.strokeStyle=ink(65,.44);ctx.lineWidth=3;ctx.strokeRect(-218,-218,436,436);
    }
    // Wave 6: icy gear geometry, backed by non-colliding dashed echoes.
    else if(v.stage===6) {
      for(let j=0;j<2;j++) {
        const r=j?226:144, teeth=j?36:24;
        ctx.save();ctx.rotate(t*(j?-.22:.32));
        ctx.strokeStyle=ink(j?55:0,.68);ctx.lineWidth=j?2.8:3.5;
        ctx.beginPath();
        for(let k=0;k<=teeth*2;k++){
          const a=k*TAU/(teeth*2),rr=r+(k%2?9:-9);
          if(k===0)ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);
          else ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);
        }
        ctx.closePath();ctx.stroke();ctx.restore();
      }
      ctx.strokeStyle=ink(-40,.38);ctx.lineWidth=2;ctx.beginPath();
      for(const r of [111,184,256]){ctx.moveTo(r,0);ctx.arc(0,0,r,0,TAU);}
      ctx.stroke();
    }
    // Wave 7: jewel-like kaleidoscopic facets with independent counter-spin.
    else if(v.stage===7) {
      ctx.save();ctx.rotate(t*.16);
      ctx.strokeStyle=ink(35,.75);ctx.fillStyle=ink(0,.13);ctx.lineWidth=2.7;
      for(let k=0;k<12;k++){
        const a=k*TAU/12, b=a+.32*Math.sin(t*.57);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*82,Math.sin(a)*82);
        ctx.lineTo(Math.cos(a-.21)*222,Math.sin(a-.21)*222);
        ctx.lineTo(Math.cos(b)*260,Math.sin(b)*260);
        ctx.lineTo(Math.cos(a+.21)*222,Math.sin(a+.21)*222);
        ctx.closePath();ctx.fill();ctx.stroke();
      }
      ctx.restore();
      ctx.save();ctx.rotate(-t*.2);ctx.strokeStyle=ink(-65,.46);ctx.lineWidth=2;
      ctx.beginPath();
      for(let k=0;k<12;k++){
        const a=k*TAU/12;
        if(k===0)ctx.moveTo(Math.cos(a)*182,Math.sin(a)*182);
        else ctx.lineTo(Math.cos(a)*182,Math.sin(a)*182);
      }
      ctx.closePath();ctx.stroke();ctx.restore();
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
    // Wave 9+ is maximum bounded complexity. Future wave numbers keep changing
    // hue and timing, but never add a fresh unbounded layer of geometry.
    else {
      ctx.save();ctx.rotate(-t*.12);
      ctx.strokeStyle=ink(0,.74);ctx.lineWidth=2.7;ctx.beginPath();
      for(let k=0;k<14;k++){
        for(let j=0;j<=16;j++){
          const r=77+j*11.1,a=k*TAU/14+j*.075+Math.sin(t*.8+j*.25)*.09;
          if(j===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);
          else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
        }
      }
      ctx.stroke();ctx.restore();
      ctx.strokeStyle=ink(105,.48);ctx.lineWidth=2.5;ctx.beginPath();
      for(let k=0;k<4;k++){
        const r=95+k*48+12*Math.sin(t*1.5+k);
        ctx.moveTo(r,0);ctx.arc(0,0,r,0,TAU);
      }
      ctx.stroke();
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
    if(v.stage<5)return;
    // At most four tesseracts regardless of wave number. No glow/shadow,
    // images, geometry allocation per vertex, or gameplay collision hooks.
    const amount=Math.min(4,v.stage-4);
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
    if(v.stage<6)return;
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
      } else {
        backgroundGradient.addColorStop(0,"hsl("+v.hue+",55%,15%)");
        backgroundGradient.addColorStop(.72,"hsl("+((v.hue+22)%360)+",52%,10%)");
        backgroundGradient.addColorStop(1,"#050713");
      }
      backgroundGradientKey=key;
    }
    ctx.fillStyle=backgroundGradient;ctx.beginPath();ctx.arc(CX,CY,R+19,0,TAU);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(CX,CY,R+15,0,TAU);ctx.clip();
    const gridColor=v.stage===1?"#4f5c8c16":"hsla("+v.hue+",85%,64%,.09)";
    ctx.strokeStyle=gridColor;ctx.lineWidth=1;ctx.beginPath();
    for(let x=CX-336;x<CX+340;x+=32){ctx.moveTo(x,42);ctx.lineTo(x,690);}
    for(let y=CY-337;y<CY+338;y+=32){ctx.moveTo(130,y);ctx.lineTo(832,y);}
    ctx.stroke();
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
      const hue=alert?45:(v.stage===1?ring.hue+state.elapsed*3:v.hue+[36,145,0][ir]+state.elapsed*3)%360;
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
      ctx.lineCap=(reactor||pulse)?"butt":"round";
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
        reactor?"hsla("+hue+",100%,60%,.48)":"hsla("+hue+",100%,53%,.31)";
      ctx.stroke();
      ctx.lineWidth=shape.width-(pulse?5:3);
      ctx.strokeStyle=pulse?"hsl("+((hue+190)%360)+",55%,14%)":
        reactor?"hsl("+hue+",100%,43%)":"hsl("+hue+",100%,56%)";
      ctx.stroke();
      ctx.lineWidth=pulse?3.6:3;
      ctx.strokeStyle=pulse?"hsla("+hue+",100%,86%,.96)":
        reactor?"#ffe7ab":"#e2ffffa8";
      ctx.stroke();
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
      if (b.armored) {ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.strokeRect(-6,-6,12,12);}
      if (b.panic>0) {
        ctx.strokeStyle="#ffeaa2";ctx.lineWidth=1.2;
        ctx.beginPath();ctx.arc(0,0,10.5,0,Math.PI*.55);ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawWarden() {
    if(state.wave!==4 || !state.boss ||
        (state.bossState!=="active" && state.bossState!=="entering"))return;
    const b=state.boss,open=wardenCoreOpen(b);
    ctx.save();ctx.translate(b.x,b.y);
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
        const reveal=clamp(Math.min((clock-.75)/.18,(2.8-clock)/.18),0,1);
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
      ctx.save();ctx.translate(799+i*38,44);ctx.rotate(-Math.PI/2);
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
      label(state.penCharge<=0?"PEN READY":"PEN "+state.penCharge.toFixed(1)+"s",
        380,705,13,"#ffd88a");
    else if(state.heavyLaser)
      label("HEAVY LASER",380,705,13,"#dbadff");
    if(state.wave===4 && (state.bossState==="warning" || state.bossState==="entering"))
      label("WARDEN INBOUND",W-26,706,16,"#ff7b67","right");
    else if(state.boss)
      label("WARDEN "+state.boss.hp+"/"+WARDEN_HP+
        (wardenCoreOpen(state.boss)?" CORE OPEN":" ARMORED"),
        W-26,706,14,wardenCoreOpen(state.boss)?"#8ffaff":"#ffae8c","right");
    else if(state.wave===4 && state.bossDefeated)
      label("WARDEN DOWN",W-26,706,15,"#88ffdf","right");
    else label("ROBOTS: "+String(state.bots.length+state.toSpawn).padStart(2,"0"),
      W-26,706,17,"#f8d89b","right");
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
        state.wave===6?"REWARD UNLOCKED // PENETRATOR":
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
    drawShockwaves();drawBots();drawShieldCapsule();drawWarden();drawShots();drawParticles();drawImpacts();drawTurret();
    // The perimeter alarm flashes during the warning and the boss entry.
    if(state.wave===4 && (state.bossState==="warning" || state.bossState==="entering") &&
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
  window.addEventListener("blur",()=>{keys.clear();pointerFiring=buttonFiring=false;fireButton.classList.remove("firing");if(state.phase==="playing")pause();});
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