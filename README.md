# Beyond Berzerk

**An intense one-screen arcade shooter.**

A fast, neon-drenched, one-screen arcade shooter. Version **0.3.19 — Warden Visual Upgrade**.

You command a stationary 360-degree rotating turret while tiny robots swarm through a spinning, morphing arena. The walls block ordinary friendly and hostile projectiles; the Wave 6 Penetrator reward is the exception and passes through walls. Robot swarms get larger and faster with each wave.

## Play

This is a static browser game with **no dependencies or build step**. Open `index.html` in a modern browser.

For an online version, enable GitHub Pages in **Settings → Pages → Build and deployment → Deploy from a branch**, then select **main** and **/(root)**. Once Pages finishes publishing, the game will be at `https://richcande1-rca.github.io/beyond-berzerk/`.

## Visual design

- **v0.3.14 opening screen:** A compact neon SECURITY BREACH / HOSTILES INBOUND panel joins the existing logo and stage-clear/end-transmission art. The large illustrated START GAME region is a real keyboard-accessible button with a precisely aligned hit area. The background stays dark, and the artwork only applies to the initial opening overlay—not pause, test-complete, or game-over overlays.
- **Performance/fallback:** The opening art is a small 8.9 KB AVIF loaded as an ordinary image. The existing HTML welcome screen remains visible and playable until the artwork successfully decodes. Combat, wave timing and controls are unchanged.

- **v0.3.13 approved cyberpunk artwork:** The large header is the custom two-line **BEYOND BERZERK** logo in blue/red-orange neon; completed waves display the cyan **STAGE CLEAR** sign above the existing graduation degree, motto and reward; normal game over displays the red **END TRANSMISSION** sign above the score summary.
- The three approved graphics are cropped from one sheet into a compact, transparent AVIF sprite (`assets/cyberpunk-ui.avif`, about 9 KB). The source is the approved Blade Runner-style illustration, not browser text. No byline or extraneous illustrations appear around the header.
- Title/game-over graphics are placed by CSS; the stage-clear sign is drawn only during the in-canvas graduation ceremony. Art decoding occurs once, and a legacy text fallback renders if AVIF is unavailable.
- The surrounding industrial overlay cards and HUD remain readable. Combat rendering, arcade mechanics, weapon upgrades, enemy behavior and boss progression are unchanged. Bosses are still future work.

## Controls

| Input | Action |
| --- | --- |
| Left / Up arrows (hold) | Smoothly rotate counterclockwise through 360° (up to ~320°/s) |
| Right / Down arrows (hold) | Smoothly rotate clockwise through 360° (up to ~320°/s) |
| Q / E (hold) | Alternate smooth rotation controls |
| WASD | Select one of eight target directions; turret turns at the common speed limit |
| Space or Enter | Hold to fire; release and press again to restart after game over |
| Mouse / touchpad | Indicate any target angle; turret turns toward it at the same maximum speed as the arrow keys; hold click to fire |
| Touch | Drag on the arena to steer toward a target and fire; eight-way pad also turns at the common speed limit |
| P | Pause / resume |
| SOUND ON/OFF | Toggle synthesized sound |

## Unified turret controls — v0.3.12

- All aiming inputs now share the same physical rotation: a **5.6 radians/second (~321°/s)** top angular speed with the existing **25 rad/s² acceleration** and **65 rad/s² braking**.
- Arrows and Q/E command clockwise/counterclockwise rotation. Mouse, touchpad, touch drag, WASD, and the eight-way touch/click pad specify a desired aim angle; the turret approaches it using the same capped rotation mechanics and shortest angular path.
- Pointer movement or quick-aim input no longer teleports the barrel between directions. While rotation keys are held, they take control and cancel the last pointer destination.
- No changes to firing rate, enemy AI, weapon rewards, collisions, lives, difficulty scaling, or arena art. The target-tracking behavior needs real-device feel testing.

## Wave 4 reward — Twin Cannons

- **Clear Wave 4** to earn a permanent upgrade for the remainder of that run: a second cannon mounted **180° opposite** the original front cannon.
- Both barrels rotate together and fire **simultaneously** from the existing FIRE/Space/Enter controls. The original projectile speed, hitboxes, firing cadence and audio remain unchanged; all aiming now follows the shared v0.3.12 rotation limit. Rear shots use the same projectile behavior and are blocked by walls.
- The second barrel appears on the turret after the graduation ceremony, stays unlocked across lost lives, and resets when starting a new normal game. Graduation explicitly announces **REWARD UNLOCKED // TWIN CANNONS**.
- Test runs starting at Wave 5 or higher automatically include twin cannons, representing Wave 4 graduation. Test Waves 1–4 use the single forward barrel. Test scores never count toward records.
- Only the new rear barrel and its existing projectile type are added; the visuals avoid additional shadow blurs for performance. No changes to enemy AI, collision walls, hull durability, player lives, or later wave difficulty.

## Living turret effects — v0.3.17

- **Reactor heartbeat:** A slower, gentle cyan core brightness pulse gets a brief additional boost when the weapon fires. Two tiny status LEDs on the armor blink at different, nonsynchronized intervals (cyan and amber).
- **Shield reactions:** The spent shield segment briefly shimmers after an absorbed projectile; passive recharge lights the restored segment; a collected shield capsule briefly illuminates all three segments. Initial unlock and life-restoration also receive a brief shimmer. All effects are rendered directly over the existing sprite sheet.
- **Lightweight and visual only:** No new textures, animated image files, particles, browser timers, glow filters, or game mechanics. The short shield animation uses a state countdown and only overdraws its arc images for approximately half a second. Physics, firing, aiming, hitboxes, shields, upgrades, audio and scoring are unchanged. The legacy canvas turret still works if WebP fails to decode.

## Custom armored turret — v0.3.16

- The central player cannon uses the approved top-down cyberpunk armored-turret artwork, replacing the old vector-only design. Dark metal plates, a cyan reactor and orange highlights rotate with the existing aim controls.
- The artwork is a tiny transparent four-frame **WebP sprite atlas (9.2 KB)**: base single-cannon turret plus three independently rendered honeycomb shield segments. A shield segment dims when its charge is depleted, and the shield disappears before it is unlocked.
- Clearing Wave 4 still deploys a second barrel 180° behind the first, using the same matching cannon artwork. The existing muzzle flash and reactor shimmer are retained without per-frame asset allocations.
- All collision geometry, projectile origins, player lives, shields and recharge rules, turret rotation speed, bot AI, damage, rewards and scoring remain **unchanged**. The old canvas turret renders automatically if the sprite cannot load.
- One graphic file loaded once, with no extra assets inside the frame loop, to keep Chromebook rendering light.

## Warden visual upgrade — v0.3.19

- The Wave 4 Warden now uses the **approved industrial cyberpunk boss concept** as an actual transparent sprite rather than simple vector geometry. It has layered gunmetal armor, a recognizable red visor, heavy asymmetric side cannons, and cyan/amber reactor hardware.
- One compact **six-frame WebP atlas (~35 KB)** shows the boss at three damage levels, each with **sealed and exposed reactor** versions: pristine, one broken side module with exposed machinery and smoke, then heavily shattered plating with sparks. The six frames were extracted from the approved artwork and sized for the arena.
- The reactor shutters **visually open and close over 0.18 seconds** at the existing vulnerability windows. A small cyan target ring is shown only while vulnerable. Two asynchronous chassis lights and minimal critical-damage sparks make the boss feel powered without spawning new particle effects.
- The sprite is decoded once, never generated per frame. The original canvas Warden draws automatically when the artwork is unavailable or WebP decoding fails.
- **Presentation-only:** No changes to Warden HP, exposed-core timing, collision radius, firing pattern, orbit speed, wave-clear requirements, shield capsule, score, controls, or rewards. The cyan reactor remains aligned to the actual core hitbox; this is not a boss difficulty change.

## The Warden — Wave 4 boss, v0.3.18

- The **first boss** interrupts Wave 4 after the normal robot swarm is cleared. The game announces **WARNING: SECTOR NOT CLEARED**, flashes the perimeter warning lights, then sends a large armored Warden inward from outside the arena. The graduation diploma and next wave cannot appear until the Warden is defeated.
- **Three distinct combat phases:** Its octagonal armor rotates and three exterior modules break away one by one. Shoot the **cyan-exposed reactor core** once in each phase; closed red armor blocks ordinary shots. Successful hits close the reactor briefly. Each successive phase increases orbit speed and launches larger aimed volleys (two, three, then five projectiles).
- The arena's **real rotating walls and projectile collisions stay active**. The hovering boss can pass the walls, but both your ordinary shots and the boss's projectiles are blocked by the walls, so open firing lanes matter. A short warning and entry give the player breathing room before the attack.
- The Warden awards **1,500 points** upon defeat. The Wave 4 graduation then awards the established **twin cannon** for Wave 5; qualifying for Heavy Laser still requires eight **direct regular-robot kills during Wave 4**, not boss damage. The shield, hull and collision rules are unchanged.
- **Wave 4 only for this release.** Future every-fourth-wave boss designs remain to be developed. Test Wave 4 includes this boss and its late shield capsule; test scores remain unscored. No new image assets, libraries or per-frame effects have been added.

## Wave 4 shield recharge capsule — v0.3.15; retimed v0.3.18

- One cyan shield capsule crosses the Wave 4 battlefield **after 90% of the wave's robots are eliminated**, rather than on a fixed timer. It flies straight across the arena above the turret, ignoring wall collisions and passing through both walls and robots. A fast chain clear still triggers the one pass.
- Shoot the capsule with an ordinary friendly projectile when it crosses an open firing lane. Player shots obey the normal wall collision rules, so walls can block a collection shot; hostile projectiles and explosions cannot collect it.
- A direct hit instantly restores the rechargeable shield to **3/3**, resets its regeneration timer and displays a short status/sound effect. The capsule consumes the collecting shot, but grants no score or robot kills and does not count toward Wave 4's Heavy Laser direct-kill challenge.
- Only **one capsule appears** in Wave 4. If it exits uncollected, it does not respawn. If the robots are already gone, the boss warning waits until the capsule has either been hit or finished crossing. The capsule is cleaned up at the next wave transition and works in normal runs or Test Wave 4.
- The shield still unlocks from clearing Wave 3. The robot mix, wall physics, weapon damage, shield regeneration and existing graduation reward requirements remain unchanged.

## Graduated arsenal — v0.3.11

- **Wave 4 clear: Twin Cannons.** The simultaneous front/back firing upgrade now arrives in Wave 5 instead of Wave 2. Wave 1–4 use only the front cannon.
- **Wave 3 clear: Rechargeable shield.** Unlocks a separate three-charge cyan shield around the turret for Wave 4 onward. Each charge absorbs one hostile projectile; each hit resets the recharge timer. After six uninterrupted seconds, one charge regenerates, repeating until all three are restored. The existing 0.5-second projectile grace applies. Direct robot contact still costs a full life and bypasses the shield; surviving lives begin with a fully charged shield. Existing three-hit hull durability remains unchanged.
- **Wave 4 participation challenge: Heavy Laser.** Land **at least eight direct weapon kills during Wave 4**, then graduate to unlock double-damage shots in Wave 5, when the twin cannons also arrive. Armored bots take one hit. Kills from moving walls and chain reactions do not count; the Wave 4 HUD displays the direct-kill counter. Without eight direct kills, the twin cannons are still awarded, but the Heavy Laser is not.
- **Wave 6 clear: Penetrator Cannon.** From Wave 7 onward, every 4.5 seconds the next manually aimed **front-cannon shot** is a gold Penetrator. It crosses all wall segments, destroys multiple robots, including armored ones, and can destroy hostile projectiles without disappearing. The rear cannon continues firing normal or Heavy Laser shots. Firing rate and number of projectiles per salvo are unchanged.
- **Test Mode:** Starting at Wave 4 includes the shield but not twin cannons. Starting at Wave 5 or higher simulates earning both twin cannons and the Heavy Laser; Wave 7 or higher starts with a charged Penetrator. Starting on Wave 4 still requires the direct-kill challenge to earn Heavy Laser for Wave 5, but earns twin cannons regardless. Test scores remain separate.
- **Performance:** The original upgrades use simple arc and stroke drawing without new shadow blur; the rear-barrel shot begins in Wave 5 rather than Wave 2. This release does not claim to resolve previously reported Wave 5 lag.

## Evolving wall architecture — v0.3.10

- **Real arena changes, not just wallpaper.** Each of Waves 1–9 now has its own three-ring layout: wall radii, number of segments, segment widths, open shooting lanes, and rotation speeds vary by wave. Beyond Wave 9 uses a fixed, bounded COSMOS layout.
- **Wave 4 / REACTOR:** Ten short inner teeth, twelve middle fins, and sixteen outer blades. Hot metal-like orange cores and etched fin marks are drawn directly on the solid wall segments.
- **Wave 8 / PULSE:** Four broad inner capacitor plates, six middle plates, eight outer plates, and double energized rails. The silhouette is intentionally unmistakable next to Wave 4's many small teeth.
- **Collision accuracy:** Drawn wall centerlines use the same radii, spans, and physical widths as projectile/robot collision checks. Morph expansion is reduced for dense segment rings to preserve bot-sized passages; no decorative connectors pretend to block shots.
- **Performance:** Still only three collision rings, bounded at sixteen segments each; accents are batched canvas paths with no new shadow blur. The existing four-tesseract cap and all player weapons are preserved. Real-Chromebook frame-rate testing remains necessary.
- **Game feel:** Because the barriers and lanes truly change between waves, difficulty and firing angles may change; enemy AI, health, upgrades, scoring, and controls are not altered.

## Wave graduation ceremonies

- **Every completed wave graduates**, even Wave 1. The existing two-second sector-clear window now hosts a celebratory diploma with a unique degree and cheeky faculty verdict; the first four clearances award **Certificate of Basic Survival**, **Diploma in Ballistics**, **Advanced Robot Evasion**, and **Honors with Distinction**. Further waves award increasingly absurd degrees, cycling indefinitely.
- A synchronized geometric *ceremony motif* and bright wave-colored energy ring appear only during the transition, with a short four-note victory fanfare using synthesized audio. Effects are temporary, lightweight and do **not** move real walls or change hitboxes, scores, enemy AI, health or wave timing.
- After graduation, the established incoming-wave reveal appears as before. Works in both normal and test mode, subject to the sound toggle.

## Start button reliability

- **v0.3.6 hotfix:** Normal START GAME and keyboard start are initialized independently of the optional Test Wave selector. Older cached page markup missing the test selector can no longer abort startup; test mode remains available on the current page. The three-hit hull, enemy AI, controls, scores and game difficulty are unchanged.

## Test mode / level selection

Select **TEST WAVE** in the status bar (default Wave 4; any integer from 1 through 999), then choose **LAUNCH TEST**. A fresh three-life run begins immediately at the selected wave, with that wave's normal robot roster, spawn quota, wall behavior and visual theme. Future waves continue automatically on completion. You can launch a different wave at any time. This is for visual and performance playtesting without grinding through the opening waves.

- **Test runs are unscored:** scores earned in this mode do not overwrite or contribute to the stored normal-play best. The HUD clearly marks **TEST WAVE**, and the status text marks **TEST**.
- **Regular play stays untouched:** START GAME or a normal restart from the overlay always begins at Wave 1, saves high scores as before, and keeps the existing difficulty and controls. The overlay's **NORMAL GAME** button after a test returns to ordinary play.
- Pressing **Enter** in the test-wave field launches the selected test. Values outside the range are clamped to 1–999. These are real waves, not invincibility or easier difficulty settings.

## Gameplay

- Survive swarms of tiny robot types: Scouts, Flankers, Gunners, Armored robots, and Rushers. New types appear as waves progress.
- Wave themes now feature different enemy mixes instead of only increasing robot counts.
- Defeated robots sometimes detonate. Nearby robots can trigger chain reactions; survivors panic and scatter. Explosions cannot pass through walls.
- Chain kills award 140 points, with a temporary CHAIN indicator.
- Survive robot swarms and clear each wave.
- **SPIN:** concentric wall segments rotate, changing firing lanes.
- **MORPH:** walls change shape and radius, opening and closing lanes.
- **MELTDOWN:** both transformations accelerate together.
- Independent rings occasionally reverse direction, with a short amber warning. Corridors also contract and expand in later waves.
- **Sector Spectacle:** Wave 1 starts in classic navy; Wave 2 switches to a bold cyan RADAR sweep; Wave 3 unveils a violet PRISM lattice; Wave 4 turns into an amber REACTOR; Wave 5 becomes an emerald VECTOR tunnel; Wave 6 forms icy PHANTOM gears and faint ghost rings; Wave 7 reveals a purple KALEIDOSCOPE; Wave 8 pulses with golden energy waves; Wave 9+ enters the magenta COSMOS field. The wallpaper remains decorative, but the walls themselves now have distinctive per-wave layouts and physically matching hitboxes.
- Visual intensity starts meaningfully at Wave 2 instead of near-invisible: exponentially increasing detail through Wave 9, then capped draw counts for Chromebook performance. Waves beyond 9 continue shifting hue/rhythm without piling on geometry. Each cleared sector gets a radiant victory transition and a themed incoming-wave reveal. As of v0.3.10, the real wall layouts and their collision footprints also change by wave; projectiles, robot AI, and equipment keep their existing mechanics.
- Normal player shots and enemy shots collide with the first wall they hit; charged Penetrator shots pass through walls and expire at the outer arena boundary.
- Turret lasers can intercept hostile projectiles in flight. Regular shots and enemy shots both vanish in a cyan-white spark; charged Penetrator shots destroy hostile shots but continue flying. Manual aiming is required and interceptions award no bonus points.
- Moving walls can scrap robots. Wall kills score fewer points than turret kills.
- Normal robots: 100 points. Armored robots: 180. Chain kill: 140. Wall kill: 40. Completed wave: +500.
- Firing now has a brighter muzzle flash, layered laser trails, and sparkling wall impacts.
- **Reinforced hull:** Three lives, each with three hull points. Enemy projectiles reduce hull by one; the third projectile hit costs one life and restores hull to three for the next life. Direct robot contact ignores remaining hull and immediately costs one life. An ordinary projectile hit gives 0.5 seconds of projectile-only grace (contact still hurts); losing a life retains 3.5 seconds of invulnerability. Three crisp HULL bars display durability. **Hull is not the shield:** shield charges are a separate upgrade earned upon clearing Wave 3. Normal and test mode use identical damage rules. High score is saved locally in your browser.
- The SOUND ON button reinitializes browser audio and plays a short test chirp; game START also unlocks sound.

## Chromebook / desktop sizing

On laptop-sized screens, the game cabinet automatically scales to the available browser height while preserving the 4:3 playfield and keeping the in-game score, lives, wave, and bottom HUD visible. The control panel below the game is still available by scrolling. Game physics and controls are unchanged.

## Arena perimeter fit

The circular arena is now centered within the space between the top and bottom HUD, with smaller concentric rings and matching robot spawn positions. The complete outer pink ring and its radial markers remain visible; turret controls and combat rules are unchanged.

## Files

- `index.html` — game shell and controls
- `styles.css` — arcade cabinet, neon UI, responsive mobile controls
- `game.js` — game loop, arena transforms, physics, enemies, combat, particles, synthesized sound

## Playtest notes / deferred improvements

- **Mouse/touchpad aiming — deferred:** Current absolute pointer aiming requires keeping the cursor correctly positioned relative to the turret, and aiming becomes awkward at canvas edges. Consider an optional browser Pointer Lock mode (relative mouse/touchpad motion rotates turret continuously through 360°, adjustable sensitivity), while retaining existing direct-pointer aiming. **Do not change controls until explicitly approved.**
- **Hypercube Engine — v0.3.3:** 4D-projected tesseracts join the decorative scenery at Wave 5; their wireframe vertices rotate through the XW, YZ and ZW planes and project to 2D. One tesseract at Wave 5 grows to two at Wave 6, three at Wave 7 and four at Wave 8+, capped thereafter. Contrasting edges identify connections in the fourth dimension. All tesseracts are clipped away from the central turret and never participate in collision checks.
- **Rendering optimization — v0.3.3:** Removes costly per-robot and per-projectile shadow blur, removes blurred particle impact and shockwave strokes, reduces two moving-wall echo paths to one, batches the arena grid into one path, and caches radial gradients per sector/mode. Preserves crisp laser cores and solid robot silhouettes. Wave 4/5 performance still needs real-device validation. The shield and upgraded projectiles were introduced in v0.3.9; further cannons remain unimplemented.
- **Signal Clarity — v0.3.2:** Reduced arena wallpaper opacity, softened perimeter/wall halos, lowered translucent ghost-ring and wall-trail strength, and restrained the damage flash. Kept the unique geometric composition and colors for each wave. HUD instruments now have opaque dark rails, sharp Oxanium readouts, pale high-contrast numbers and dividers, and zero text bloom. Wave announcements and sector-clear rewards use crisp text on compact dark plates placed above the turret instead of glowing over its center. Wall warning colors, collisions, AI, combat and controls are unchanged. Preserve this contrast and center space when adding future turret defenses and weapons.
- **Visual reward pass — implemented in v0.3.1:** Earlier v0.3.0 visuals were too faint in Waves 2–3. New signature palettes and geometry start at Wave 2, with a sector-clear celebration and wave-introduction effect. Field art is behind the combat layer, and the center of the decorative field stays clear for the player turret.
- **Future turret equipment:** Additional powerups, cannons and defensive systems beyond Twin Cannons, the three-charge shield, Heavy Laser and Penetrator require separate discussion and explicit approval. Preserve visual contrast, screen space and the performance budget.

## First-contact scope

This is a **playable prototype**, not a finished release. Arena art uses procedurally drawn vector graphics rather than the original concept illustration. Enemy behavior, difficulty, sound, scoring, and control feel are open for playtesting and iteration.

Inspired by the spirit of classic 1980s arcade shooters. An original game; not affiliated with the original Berzerk.
