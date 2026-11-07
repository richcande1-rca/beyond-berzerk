# Beyond Berzerk

**An intense one-screen arcade shooter.**

A fast, neon-drenched, one-screen arcade shooter. Version **0.3.7 — Graduation Day**.

You command a stationary 360-degree rotating turret while tiny robots swarm through a spinning, morphing arena. The walls block **every** projectile, whether it came from you or the robots. Robot swarms get larger and faster with each wave.

## Play

This is a static browser game with **no dependencies or build step**. Open `index.html` in a modern browser.

For an online version, enable GitHub Pages in **Settings → Pages → Build and deployment → Deploy from a branch**, then select **main** and **/(root)**. Once Pages finishes publishing, the game will be at `https://richcande1-rca.github.io/beyond-berzerk/`.

## Visual design

- Industrial sci-fi masthead and menus with Teko display typography and Oxanium system labels (web fonts; local fallbacks included).
- Amber / warning-red / gunmetal start, pause, and game-over panels replace the earlier magenta-and-cyan menu treatment.
- The start screen emphasizes the threat rather than a gameplay description; detailed controls remain below the cabinet.
- The in-canvas arena, mechanics, and game-over label **END OF TRANSMISSION** are unchanged.

## Controls

| Input | Action |
| --- | --- |
| Left / Up arrows (hold) | Smoothly rotate counterclockwise through 360° (up to ~320°/s) |
| Right / Down arrows (hold) | Smoothly rotate clockwise through 360° (up to ~320°/s) |
| Q / E (hold) | Alternate smooth rotation controls |
| WASD | Snap to one of eight quick directions |
| Space or Enter | Hold to fire; release and press again to restart after game over |
| Mouse | Aim freely at any angle; hold click to fire |
| Touch | Drag on the arena to aim and fire freely; eight-way quick pad plus hold FIRE also works |
| P | Pause / resume |
| SOUND ON/OFF | Toggle synthesized sound |

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
- **Sector Spectacle (visual only):** Wave 1 starts in classic navy; Wave 2 switches to a bold cyan RADAR sweep; Wave 3 unveils a violet PRISM lattice; Wave 4 turns into an amber REACTOR; Wave 5 becomes an emerald VECTOR tunnel; Wave 6 forms icy PHANTOM gears and faint ghost rings; Wave 7 reveals a purple KALEIDOSCOPE; Wave 8 pulses with golden energy waves; Wave 9+ enters the magenta COSMOS field. Every wave changes color and rhythm.
- Visual intensity starts meaningfully at Wave 2 instead of near-invisible: exponentially increasing detail through Wave 9, then capped draw counts for Chromebook performance. Waves beyond 9 continue shifting hue/rhythm without piling on geometry. Each cleared sector now gets a radiant victory transition and a themed incoming-wave reveal. All real walls, collisions, projectiles, robot AI and difficulty remain unchanged.
- All shots collide with the first wall they hit. Enemy shots obey exactly the same rule.
- Turret lasers can intercept hostile projectiles in flight. Both projectiles vanish in a cyan-white spark; manual aiming is required, with no bonus points awarded for interception.
- Moving walls can scrap robots. Wall kills score fewer points than turret kills.
- Normal robots: 100 points. Armored robots: 180. Chain kill: 140. Wall kill: 40. Completed wave: +500.
- Firing now has a brighter muzzle flash, layered laser trails, and sparkling wall impacts.
- **Reinforced hull:** Three lives, each with three hull points. Enemy projectiles reduce hull by one; the third projectile hit costs one life and restores hull to three for the next life. Direct robot contact ignores remaining hull and immediately costs one life. An ordinary projectile hit gives 0.5 seconds of projectile-only grace (contact still hurts); losing a life retains 3.5 seconds of invulnerability. Three crisp HULL bars display durability. **This is not a shield:** separate shields remain a planned future upgrade. Normal and test mode use identical damage rules. High score is saved locally in your browser.
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
- **Rendering optimization — v0.3.3:** Removes costly per-robot and per-projectile shadow blur, removes blurred particle impact and shockwave strokes, reduces two moving-wall echo paths to one, batches the arena grid into one path, and caches radial gradients per sector/mode. Preserves crisp laser cores and solid robot silhouettes. Wave 4 performance still needs real-device validation. Future shields and cannons remain planned, not implemented.
- **Signal Clarity — v0.3.2:** Reduced arena wallpaper opacity, softened perimeter/wall halos, lowered translucent ghost-ring and wall-trail strength, and restrained the damage flash. Kept the unique geometric composition and colors for each wave. HUD instruments now have opaque dark rails, sharp Oxanium readouts, pale high-contrast numbers and dividers, and zero text bloom. Wave announcements and sector-clear rewards use crisp text on compact dark plates placed above the turret instead of glowing over its center. Wall warning colors, collisions, AI, combat and controls are unchanged. Preserve this contrast and center space when adding future turret defenses and weapons.
- **Visual reward pass — implemented in v0.3.1:** Earlier v0.3.0 visuals were too faint in Waves 2–3. New signature palettes and geometry start at Wave 2, with a sector-clear celebration and wave-introduction effect. Field art is behind the combat layer, and the center of the decorative field stays clear for the player turret.
- **Future turret equipment — planned, not implemented:** Defensive shields and substantially more firepower/powerups are intended for later revisions. Reserve visual contrast, screen space and performance budget for their effects. Do not add or rebalance weapons/defense without explicit approval.

## First-contact scope

This is a **playable prototype**, not a finished release. Arena art uses procedurally drawn vector graphics rather than the original concept illustration. Enemy behavior, difficulty, sound, scoring, and control feel are open for playtesting and iteration.

Inspired by the spirit of classic 1980s arcade shooters. An original game; not affiliated with the original Berzerk.
