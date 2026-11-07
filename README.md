# Beyond Berzerk

**Insane shooter arcade game. The world moves. You don't.**

A fast, neon-drenched, one-screen arcade shooter. Version **0.1 — First Contact**.

You command a stationary eight-direction turret while tiny robots swarm through a spinning, morphing arena. The walls block **every** projectile, whether it came from you or the robots. Robot swarms get larger and faster with each wave.

## Play

This is a static browser game with **no dependencies or build step**. Open `index.html` in a modern browser.

For an online version, enable GitHub Pages in **Settings → Pages → Build and deployment → Deploy from a branch**, then select **main** and **/(root)**. Once Pages finishes publishing, the game will be at `https://richcande1-rca.github.io/beyond-berzerk/`.

## Controls

| Input | Action |
| --- | --- |
| Arrow keys or WASD | Aim in eight directions (combine keys for diagonals) |
| Space or Enter | Hold to fire |
| Mouse | Aim by pointing; hold click to fire |
| Touch | Eight-way aim pad plus hold FIRE, or touch/hold the arena |
| P | Pause / resume |
| SOUND ON/OFF | Toggle synthesized sound |

## Gameplay

- Survive robot swarms and clear each wave.
- **SPIN:** concentric wall segments rotate, changing firing lanes.
- **MORPH:** walls change shape and radius, opening and closing lanes.
- **MELTDOWN:** both transformations accelerate together.
- All shots collide with the first wall they hit. Enemy shots obey exactly the same rule.
- Moving walls can scrap robots. Wall kills score fewer points than turret kills.
- Normal robots: 100 points. Armored robots: 180. Wall kill: 40. Completed wave: +500.
- Three lives; brief protection after a hit. High score is saved locally in your browser.

## Files

- `index.html` — game shell and controls
- `styles.css` — arcade cabinet, neon UI, responsive mobile controls
- `game.js` — game loop, arena transforms, physics, enemies, combat, particles, synthesized sound

## First-contact scope

This is a **playable prototype**, not a finished release. Arena art uses procedurally drawn vector graphics rather than the original concept illustration. Enemy behavior, difficulty, sound, scoring, and control feel are open for playtesting and iteration.

Inspired by the spirit of classic 1980s arcade shooters. An original game; not affiliated with the original Berzerk.
