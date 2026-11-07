# Beyond Berzerk

**An intense one-screen arcade shooter.**

A fast, neon-drenched, one-screen arcade shooter. Version **0.3.1 — Sector Spectacle**.

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
- Three lives; brief protection after a hit. High score is saved locally in your browser.
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
- **Visual reward pass — implemented in v0.3.1:** Earlier v0.3.0 visuals were too faint in Waves 2–3. New signature palettes and geometry start at Wave 2, with a sector-clear celebration and wave-introduction effect. Field art is behind the combat layer, and the center of the decorative field stays clear for the player turret.
- **Future turret equipment — planned, not implemented:** Defensive shields and substantially more firepower/powerups are intended for later revisions. Reserve visual contrast, screen space and performance budget for their effects. Do not add or rebalance weapons/defense without explicit approval.

## First-contact scope

This is a **playable prototype**, not a finished release. Arena art uses procedurally drawn vector graphics rather than the original concept illustration. Enemy behavior, difficulty, sound, scoring, and control feel are open for playtesting and iteration.

Inspired by the spirit of classic 1980s arcade shooters. An original game; not affiliated with the original Berzerk.
