(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const overlayEyebrow = document.getElementById("overlay-eyebrow");
  const startButton = document.getElementById("start-btn");
  const pauseButton = document.getElementById("pause-btn");
  const soundButton = document.getElementById("sound-btn");
  const fireButton = document.getElementById("fire-btn");
  const statusMessage = document.getElementById("status-message");
  const padButtons = [...document.querySelectorAll("[data-dir]")];
  const W = 960, H = 720, CX = 480, CY = 366, R = 304;
  const TAU = Math.PI * 2;
  const MODES = ["SPIN", "MORPH", "MELTDOWN"];
  const DURATIONS = [13, 13, 11];
  const WAVE_NAMES = ["FIRST CONTACT", "SIDEWINDERS", "CROSSFIRE",
    "HEAVY METAL", "DOGPILE", "TOTAL MAYHEM"];
  const ROLES = ["scout", "flank", "gunner", "heavy", "rush"];
  const ROLE_COLORS = {scout:0, flank:1, gunner:3, heavy:4, rush:2};
  const WAVE_FEATURE = ["scout", "flank", "gunner", "heavy", "rush", "flank"];
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
    try { localStorage.setItem("beyond-berzerk-high", String(state.high)); } catch {}
  }
  function makeRings() {
    return [
      {base:128, count:6, span:.30, speed:.36, angle:0.14, phase:.2, hue:178, spin:1, reverseClock:8, warning:0, reversePending:false},
      {base:205, count:9, span:.225, speed:-.28, angle:.32, phase:1.5, hue:306, spin:1, reverseClock:12, warning:0, reversePending:false},
      {base:278, count:12, span:.145, speed:.23, angle:.09, phase:2.9, hue:47, spin:1, reverseClock:16, warning:0, reversePending:false}
    ];
  }
  function makeState() {
    return {
      phase:"ready", elapsed:0, modeIndex:0, modeClock:0,
      wave:1, score:0, high:highScore(), lives:3, aim:6, aimVelocity:0,
      rings:makeRings(), bots:[], shots:[], particles:[],
      blasts:[], shockwaves:[], impacts:[], combo:0, comboClock:0,
      toSpawn:0, spawnClock:.4, waveClock:0, fireClock:0,
      invuln:1.8, flash:0, shake:0, announce:"", announceClock:0,
      clearNearbyEnemyShots:false, turretKick:0,
      destroyed:0, spawnCount:0, chains:0
    };
  }
  let state = makeState();

  function setStatus(message) { statusMessage.textContent = message; }
  function showOverlay(title, message, button, eyebrow) {
    overlayTitle.textContent = title;
    overlayText.innerHTML = message;
    overlayEyebrow.textContent = eyebrow;
    startButton.querySelector("span").textContent = "↗";
    startButton.firstChild.textContent = button + " ";
    overlay.classList.remove("hidden");
  }
  function hideOverlay() { overlay.classList.add("hidden"); }

  function tone(freq, duration, kind="square", volume=.027, endFreq=0) {
    if (!soundOn || !audio || audio.state !== "running") return;
    try {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const t = audio.currentTime;
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

  function start() {
    state = makeState();
    state.phase = "playing";
    state.toSpawn = 15;
    state.announce = "WAVE 01";
    state.announceClock = 2.2;
    pointerFiring = buttonFiring = false;
    fireButton.classList.remove("firing");
    // User's START click unlocks browser audio; the chirp confirms it is active.
    primeAudio(true);
    setStatus("CONTACT — WAVE 01");
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
    storeHigh();
    tone(310,.35,"sawtooth",.08,65);
    showOverlay("SYSTEM OVERRUN",
      "FINAL SCORE: <strong>" + state.score.toLocaleString() + "</strong><br>WAVE REACHED: " +
      state.wave + " &nbsp; • &nbsp; ROBOTS SCRAPPED: " + state.destroyed,
      "TRY AGAIN", "END OF TRANSMISSION");
    pauseButton.textContent = "PAUSE";
    setStatus("GAME OVER — INSERT COURAGE");
  }

  function modeName() { return MODES[state.modeIndex]; }
  function waveName() { return WAVE_NAMES[(state.wave-1)%WAVE_NAMES.length]; }
  function ringShape(ring) {
    const power = modeName() === "SPIN" ? .12 : modeName() === "MORPH" ? 1 : 1.15;
    const surge = state.wave >= 3 ? .5+.5*Math.sin(state.elapsed*.65 + ring.phase) : 0;
    return {
      radius:ring.base + power * (8+state.wave*.32) * Math.sin(state.elapsed * 1.7 + ring.phase),
      span:Math.max(.055, ring.span + power * .075 * Math.sin(state.elapsed * 1.25 + ring.phase) + surge*.038),
      width:16
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
    const r = preview ? rnd(160,308) : rnd(305,315);
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
  function scrap(index, byWall=false) {
    const bot = state.bots[index];
    if (!bot) return;
    burst(bot.x,bot.y,colors[bot.hue],byWall?9:17,byWall?.7:1.15);
    state.score += byWall?40:(bot.armored?180:100);
    state.destroyed++;
    state.shake = Math.max(state.shake,byWall?1.4:2.5);
    if (state.score > state.high) { state.high=state.score; storeHigh(); }
    if (!byWall) tone(rnd(110,190),.12,"sawtooth",.03,55);
    state.bots.splice(index,1);
  }
  function playerHit() {
    if (state.invuln>0 || state.phase!=="playing") return;
    state.lives--;
    state.invuln = 3.5;
    state.flash = .26; state.shake = 13;
    burst(CX,CY,"#ff3c91",34,1.8);
    // Defer projectile cleanup until updateShots has finished iterating.
    // Replacing the array mid-loop used to throw when a robot shot hit the turret.
    state.clearNearbyEnemyShots = true;
    tone(260,.35,"sawtooth",.09,52);
    if (state.lives<=0) gameOver();
    else setStatus("HULL BREACH — " + state.lives + " LIVES");
  }
  function firePlayer() {
    const angle = state.aim * Math.PI / 4;
    state.shots.push({x:CX+Math.cos(angle)*27,y:CY+Math.sin(angle)*27,
      vx:Math.cos(angle)*610,vy:Math.sin(angle)*610,life:.7,friendly:true,size:3.3,color:"#ecfdff"});
    burst(CX+Math.cos(angle)*28,CY+Math.sin(angle)*28,"#90faff",2,.15);
    state.turretKick = 1;
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
      const b = state.bots[i];
      b.age+=dt;
      let d=dist(b.x,b.y), a=polar(b.x,b.y);
      let heading=a+Math.PI;
      let nearest=null, distanceToRing=Infinity;
      for (const ring of state.rings) {
        const delta=d-ringShape(ring).radius;
        if (delta>-13 && delta<44 && Math.abs(delta)<distanceToRing) {
          nearest=ring;distanceToRing=Math.abs(delta);
        }
      }
      if (nearest && blockedAngle(nearest,a,(b.size+6)/nearest.base)) {
        const target=bestGap(nearest,a,(b.size+6)/nearest.base);
        const turn=angleDiff(target,a);
        heading=a+(Math.abs(turn)<.025?b.direction:Math.sign(turn))*Math.PI/2;
      } else {
        heading+=Math.sin(b.age*1.5+b.wobble)*.07;
      }
      let speed=b.speed*dt;
      // Within the innermost ring robots regroup along eight attack spokes.
      // Every enemy can therefore be hit by the player's eight-direction gun.
      if (d<115) {
        const lane=Math.round(a/(Math.PI/4))*(Math.PI/4);
        const turn=angleDiff(lane,a);
        if (Math.abs(turn)>Math.max(.016,3/d)) {
          heading=a+Math.sign(turn)*Math.PI/2;
        } else if (d<83) {
          speed=0; // Hold position and shoot rather than unavoidable ramming.
        } else {
          heading=a+Math.PI;
        }
      }
      let nx=b.x+Math.cos(heading)*speed, ny=b.y+Math.sin(heading)*speed;
      if (wallHit(nx,ny,b.size*.8)) {
        const turn = nearest ? Math.sign(angleDiff(bestGap(nearest,a,.16),a)) || b.direction : b.direction;
        const tangential=a+turn*Math.PI/2;
        nx=b.x+Math.cos(tangential)*speed*.83;
        ny=b.y+Math.sin(tangential)*speed*.83;
      }
      if (!wallHit(nx,ny,b.size*.75) && dist(nx,ny)<R+22) {
        b.x=nx;b.y=ny;
      }
      // A barrier moving into a robot destroys it. The turret has its own safe central pocket.
      if (wallHit(b.x,b.y,Math.max(1,b.size*.3))) { scrap(i,true);continue; }
      d=dist(b.x,b.y);
      if (d<30) { burst(b.x,b.y,"#ff4baf",12);state.bots.splice(i,1);playerHit();continue; }
      b.shotClock-=dt;
      if (b.shotClock<=0 && d<118 && clearShotPath(b.x,b.y)) {
        fireBot(b);
        b.shotClock=rnd(2.8,4.6)/(1+Math.min(.35,state.wave*.025));
      } else if (b.shotClock<=0) b.shotClock=rnd(.25,.7);
    }
  }
  function updateShots(dt) {
    for (let i=state.shots.length-1;i>=0;i--) {
      const s=state.shots[i];
      if (!s) continue; // Defensive guard if another combat event changes the list.
      s.life-=dt;
      if (s.life<=0) {state.shots.splice(i,1);continue;}
      const steps=Math.max(1,Math.ceil(Math.hypot(s.vx,s.vy)*dt/5));
      let hit=false;
      for (let j=0;j<steps;j++) {
        s.x+=s.vx*dt/steps;s.y+=s.vy*dt/steps;
        if (dist(s.x,s.y)>R+21 || wallHit(s.x,s.y,s.size)) {
          burst(s.x,s.y,s.friendly?"#45fefa":"#ff9551",5,.28);
          hit=true;break;
        }
        if (s.friendly) {
          for (let k=state.bots.length-1;k>=0;k--) {
            const b=state.bots[k];
            if (Math.hypot(s.x-b.x,s.y-b.y)<b.size+4) {
              b.hp--;
              burst(s.x,s.y,"#ffffff",4,.27);
              if (b.hp<=0) scrap(k,false);
              else tone(170,.07,"triangle",.025,110);
              hit=true;break;
            }
          }
        } else if (dist(s.x,s.y)<16 && state.invuln<=0) {
          playerHit();
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
      state.waveClock+=dt;
      if (state.waveClock>2) {
        state.wave++;
        state.toSpawn=Math.min(120,10+state.wave*5);
        state.spawnClock=.35;
        state.waveClock=0;
        state.invuln=Math.max(state.invuln,.8);
        state.score+=500;
        if (state.score>state.high) {state.high=state.score;storeHigh();}
        state.announce="WAVE " + String(state.wave).padStart(2,"0");
        state.announceClock=2.2;
        setStatus("WAVE " + String(state.wave).padStart(2,"0") + " — INCOMING!");
        tone(450,.14,"triangle",.06,750);
      }
    } else state.waveClock=0;
  }
  function updateKeyboardAim(dt) {
    const ccw = keys.has("ArrowLeft") || keys.has("q") || keys.has("Q");
    const cw = keys.has("ArrowRight") || keys.has("e") || keys.has("E");
    const up = keys.has("ArrowUp");
    const down = keys.has("ArrowDown");
    const maxSpeed = 2.85; // ~163 degrees per second; previously 241
    const accel = 12, brake = 18;
    let desiredVelocity = 0;
    let target = null;
    let gap = 0;

    if (ccw !== cw) {
      desiredVelocity = cw ? maxSpeed : -maxSpeed;
    } else if (up !== down) {
      // Up and down ease toward the cardinal direction, rather than snapping.
      target = up ? 6 : 2;
      gap = angleDiff(target * Math.PI / 4, state.aim * Math.PI / 4);
      desiredVelocity = Math.sign(gap) * Math.min(maxSpeed, Math.sqrt(2 * brake * Math.abs(gap)));
    }

    const slowing = Math.abs(desiredVelocity) < Math.abs(state.aimVelocity) ||
      (desiredVelocity && state.aimVelocity && Math.sign(desiredVelocity) !== Math.sign(state.aimVelocity));
    const maxChange = (slowing ? brake : accel) * dt;
    state.aimVelocity += clamp(desiredVelocity - state.aimVelocity, -maxChange, maxChange);

    // Avoid hunting or oscillating around a cardinal target.
    if (target !== null && Math.abs(gap) <= Math.max(.002, Math.abs(state.aimVelocity * dt))) {
      state.aim = target;
      state.aimVelocity = 0;
    } else if (state.aimVelocity !== 0) {
      state.aim = ((state.aim + state.aimVelocity * dt * 4 / Math.PI) % 8 + 8) % 8;
    }
    if (state.aimVelocity || target !== null) syncAimPad();
  }

  function update(dt) {
    updateKeyboardAim(dt);
    updateArena(dt);
    state.invuln=Math.max(0,state.invuln-dt);
    state.fireClock-=dt;
    state.announceClock=Math.max(0,state.announceClock-dt);
    state.flash=Math.max(0,state.flash-dt);
    state.shake=Math.max(0,state.shake-dt*22);
    state.turretKick=Math.max(0,state.turretKick-dt*10);
    if ((keys.has(" ")||keys.has("Enter")||pointerFiring||buttonFiring) && state.fireClock<=0) {
      firePlayer();
      state.fireClock=.115;
    }
    updateWave(dt);
    updateBots(dt);
    if (state.phase==="playing") updateShots(dt);
    updateParticles(dt);
  }

  function line(x1,y1,x2,y2,color,width=1) {
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();
    ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }
  function drawBackground() {
    ctx.fillStyle="#060817";ctx.fillRect(0,0,W,H);
    let g=ctx.createRadialGradient(CX,CY,42,CX,CY,350);
    g.addColorStop(0,modeName()==="MELTDOWN"?"#341035":"#121633");
    g.addColorStop(.72,"#0c1028");g.addColorStop(1,"#050713");
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(CX,CY,R+19,0,TAU);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(CX,CY,R+15,0,TAU);ctx.clip();
    for (let x=CX-336;x<CX+340;x+=32) line(x,42,x,690,"#4f5c8c16");
    for (let y=CY-337;y<CY+338;y+=32) line(130,y,832,y,"#4f5c8c16");
    for (const star of stars) {
      ctx.globalAlpha=star.a;ctx.fillStyle="#a4bdf9";ctx.fillRect(star.x,star.y,1.6,1.6);
    }
    ctx.globalAlpha=1;
    ctx.restore();
    ctx.save();ctx.shadowBlur=15;ctx.shadowColor="#ee319a";
    ctx.strokeStyle="#fa329a";ctx.lineWidth=6;ctx.beginPath();ctx.arc(CX,CY,R+17,0,TAU);ctx.stroke();
    ctx.restore();
    ctx.strokeStyle="#27f9f33d";ctx.lineWidth=1;
    for(let k=0;k<8;k++){
      const a=k*Math.PI/4;
      line(CX+Math.cos(a)*(R+21),CY+Math.sin(a)*(R+21),
           CX+Math.cos(a)*(R+32),CY+Math.sin(a)*(R+32),"#4efdf06c",2);
    }
  }
  function drawRings() {
    for (let ir=state.rings.length-1;ir>=0;ir--) {
      const ring=state.rings[ir], shape=ringShape(ring);
      const pitch=TAU/ring.count;
      const hue=(ring.hue+state.elapsed*3)%360;
      ctx.save();
      ctx.lineCap="round";
      // Batch the full ring into one path: three strokes per ring instead
      // of three expensive glowing strokes for *each* moving segment.
      ctx.beginPath();
      for (let n=0;n<ring.count;n++) {
        const center=ring.angle+n*pitch;
        const start=center-shape.span/2,end=center+shape.span/2;
        ctx.moveTo(CX+Math.cos(start)*shape.radius,CY+Math.sin(start)*shape.radius);
        ctx.arc(CX,CY,shape.radius,start,end);
      }
      ctx.shadowBlur=15;
      ctx.shadowColor="hsl("+hue+",100%,55%)";
      ctx.lineWidth=shape.width+4;
      ctx.strokeStyle="hsla("+hue+",100%,53%,.57)";
      ctx.stroke();
      ctx.shadowBlur=0;
      ctx.lineWidth=shape.width-3;
      ctx.strokeStyle="hsl("+hue+",100%,56%)";
      ctx.stroke();
      ctx.lineWidth=3;
      ctx.strokeStyle="#e2ffffa8";
      ctx.stroke();
      ctx.restore();
    }
  }
  function drawBots() {
    for (const b of state.bots) {
      const color=colors[b.hue];
      ctx.save();ctx.translate(b.x,b.y);
      ctx.rotate(Math.atan2(CY-b.y,CX-b.x));
      ctx.shadowBlur=9;ctx.shadowColor=color;
      ctx.fillStyle=color;
      // Deliberately tiny robots, roughly half the size of the concept art.
      ctx.fillRect(-5,-5,10,10);
      ctx.fillRect(-8,-3,3,4);ctx.fillRect(5,-3,3,4);
      ctx.fillRect(-3,-8,6,3);ctx.fillRect(-4,5,3,4);ctx.fillRect(1,5,3,4);
      ctx.shadowBlur=0;ctx.fillStyle="#0b0d22";ctx.fillRect(-3,-3,6,3);
      ctx.fillStyle=b.armored?"#fff":"#ff684f";ctx.fillRect(-2,-2,4,1.5);
      if (b.armored) {ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.strokeRect(-6,-6,12,12);}
      ctx.restore();
    }
  }
  function drawShots() {
    ctx.save();ctx.lineCap="round";
    for (const s of state.shots) {
      ctx.shadowBlur=13;ctx.shadowColor=s.color;ctx.strokeStyle=s.color;
      ctx.lineWidth=s.friendly?4:3.4;
      ctx.beginPath();ctx.moveTo(s.x,s.y);
      ctx.lineTo(s.x-s.vx*.016,s.y-s.vy*.016);ctx.stroke();
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
  function drawTurret() {
    const angle = state.aim * Math.PI / 4;
    const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * 5.2);
    const kick = state.turretKick * 8;
    const blink = state.phase==="playing" && state.invuln>0 &&
      Math.floor(state.elapsed*13)%2===0;

    ctx.save();
    ctx.translate(CX, CY);
    if (blink) ctx.globalAlpha = .4;

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

    // The cannon head turns freely while the surrounding base stays still.
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

    ctx.restore();
  }
  function label(text,x,y,size,color,align="left") {
    ctx.font="900 "+size+"px system-ui, sans-serif";
    ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(text,x,y);
  }
  function drawHUD() {
    ctx.fillStyle="#0c0c21ee";ctx.fillRect(0,0,W,65);
    ctx.fillStyle="#0c0c21f0";ctx.fillRect(0,677,W,43);
    line(0,64,W,64,"#572c79",2);
    line(0,677,W,677,"#572c79",2);
    label("SCORE",30,24,13,"#32e9e9");
    label(String(state.score).padStart(6,"0"),30,51,25,"#ffde7d");
    label("BEST",242,24,13,"#32e9e9");
    label(String(state.high).padStart(6,"0"),242,51,25,"#ffde7d");
    label("WAVE",512,24,13,"#32e9e9");
    label(String(state.wave).padStart(2,"0"),512,51,25,"#ffde7d");
    label("LIVES",790,24,13,"#32e9e9");
    for(let i=0;i<state.lives;i++){
      ctx.save();ctx.translate(799+i*38,44);ctx.rotate(-Math.PI/2);
      ctx.fillStyle="#fd4caa";ctx.beginPath();ctx.moveTo(13,0);
      ctx.lineTo(-9,-8);ctx.lineTo(-4,0);ctx.lineTo(-9,8);ctx.closePath();ctx.fill();
      ctx.restore();
    }
    label("ARENA: "+modeName(),28,706,18,
      modeName()==="MELTDOWN"?"#ff4d9f":modeName()==="MORPH"?"#b8ff65":"#31f5ec");
    label("ROBOTS: "+String(state.bots.length+state.toSpawn).padStart(2,"0"),W-26,706,17,"#ffd071","right");
    const remaining=Math.ceil(DURATIONS[state.modeIndex]-state.modeClock);
    label("SHIFT IN "+remaining+"s",527,704,12,"#928caf","center");
  }
  function drawAnnouncements() {
    if (state.announceClock<=0) return;
    ctx.save();
    ctx.globalAlpha=clamp(state.announceClock*1.5,0,1);
    ctx.textAlign="center";ctx.font="1000 40px system-ui,sans-serif";
    ctx.shadowBlur=25;ctx.shadowColor="#fd339d";ctx.fillStyle="#fff3d3";
    ctx.fillText(state.announce,CX,116);
    ctx.restore();
  }
  function draw() {
    ctx.save();
    if (state.shake>0 && state.phase==="playing")
      ctx.translate(rnd(-state.shake,state.shake),rnd(-state.shake,state.shake));
    drawBackground();drawRings();drawBots();drawShots();drawParticles();drawTurret();
    ctx.restore();
    if(state.flash>0) {
      ctx.fillStyle="rgba(255,50,95,"+(state.flash*.35)+")";
      ctx.fillRect(0,65,W,612);
    }
    drawHUD();drawAnnouncements();
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
  function setAim(x,y) {
    if (Math.hypot(x-CX,y-CY)<18) return;
    let theta=Math.atan2(y-CY,x-CX);
    state.aim=((theta/(Math.PI/4))%8+8)%8;
    state.aimVelocity=0; // Precision pointer and eight-way aim override momentum.
    syncAimPad();
  }
  function keyAim() {
    // Keep eight-way WASD shortcuts; arrow keys now use smooth rotation.
    const left=keys.has("a")||keys.has("A");
    const right=keys.has("d")||keys.has("D");
    const up=keys.has("w")||keys.has("W");
    const down=keys.has("s")||keys.has("S");
    const x=Number(right)-Number(left), y=Number(down)-Number(up);
    if (x||y) setAim(CX+x*100,CY+y*100);
  }
  function canvasPoint(event) {
    const rect=canvas.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*W/rect.width,
            y:(event.clientY-rect.top)*H/rect.height};
  }

  window.addEventListener("keydown",event=>{
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Enter"].includes(event.key))
      event.preventDefault();
    if ((event.key==="p"||event.key==="P") && !event.repeat) {pause();return;}
    if (event.key===" "||event.key==="Enter") {
      if (state.phase==="ready"||state.phase==="over") {start();return;}
      if (state.phase==="paused") {pause();return;}
    }
    keys.add(event.key);
    keyAim();
  });
  window.addEventListener("keyup",event=>{keys.delete(event.key);keyAim();});
  window.addEventListener("blur",()=>{keys.clear();pointerFiring=buttonFiring=false;fireButton.classList.remove("firing");if(state.phase==="playing")pause();});
  document.addEventListener("visibilitychange",()=>{if(document.hidden && state.phase==="playing")pause();});
  canvas.addEventListener("pointermove",event=>{
    if(event.pointerType==="mouse"||pointerFiring||event.buttons) {
      const p=canvasPoint(event);setAim(p.x,p.y);
    }
  });
  canvas.addEventListener("pointerdown",event=>{
    if(state.phase!=="playing")return;
    event.preventDefault();
    const p=canvasPoint(event);setAim(p.x,p.y);
    pointerFiring=true;
    try{canvas.setPointerCapture(event.pointerId);}catch{}
  });
  function endPointer(){pointerFiring=false;}
  canvas.addEventListener("pointerup",endPointer);
  canvas.addEventListener("pointercancel",endPointer);
  canvas.addEventListener("lostpointercapture",endPointer);
  for (const button of padButtons) {
    button.addEventListener("pointerdown",event=>{
      event.preventDefault();state.aim=Number(button.dataset.dir);state.aimVelocity=0;syncAimPad();
    });
    button.addEventListener("click",()=>{state.aim=Number(button.dataset.dir);state.aimVelocity=0;syncAimPad();});
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
  startButton.addEventListener("click",()=>state.phase==="paused"?pause():start());
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