# Beyond Berzerk

**An intense one-screen arcade shooter.**

A fast, neon-drenched, one-screen arcade shooter. Version **0.2.6 — Robot Riot**.

You command a stationary 360-degree rotating turret while tiny robots swarm through a spinning, morphing arena. The walls block **every** projectile, whether it came from you or the robots. Robot swarms get larger and faster with each wave.

## Play

This is a static browser game with **no dependencies or build step**. Open `index.html` in a modern browser.

For an online version, enable GitHub Pages in **Settings → Pages → Build and deployment → Deploy from a branch**, then select **main** and **/(root)**. Once Pages finishes publishing, the game will be at `https://richcande1-rca.github.io/beyond-berzerk/`.

## Controls

| Input | Action |
| --- | --- |
| Left / Up arrows (hold) | Smoothly rotate counterclockwise through 360° |
| Right / Down arrows (hold) | Smoothly rotate clockwise through 360° |
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

## First-contact scope

This is a **playable prototype**, not a finished release. Arena art uses procedurally drawn vector graphics rather than the original concept illustration. Enemy behavior, difficulty, sound, scoring, and control feel are open for playtesting and iteration.

Inspired by the spirit of classic 1980s arcade shooters. An original game; not affiliated with the original Berzerk.
