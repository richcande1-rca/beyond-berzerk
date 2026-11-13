# Beyond Berzerk

**An intense one-screen arcade shooter.**

A fast, neon-drenched, one-screen arcade shooter. Version **0.3.39 — Mobile Full-Speed Performance Fix**.

You command a stationary 360-degree rotating turret while tiny robots swarm through a spinning, morphing arena. The walls block ordinary friendly and hostile projectiles; after clearing Wave 6, an automatic Railgun discharges through walls while the regular cannons keep firing. Robot swarms get larger and faster with each wave.

## Mobile performance / timing fix — v0.3.39

- On coarse touch devices, update gameplay on a fixed **30 Hz simulation timestep** while rendering a maximum of 30 FPS. At 15 FPS the game now advances roughly two small simulation steps per paint instead of running at the old 35 ms cap (about 52.5% real speed). A small 150 ms upper bound and 5-step safety limit avoid catastrophic catch-up spirals on badly overloaded devices; when a device cannot execute the game in real time, some slowdown is still possible.
- Mobile canvas rasterizes to **720×540** instead of 960×720 (44% fewer pixels). Its logical drawing coordinates stay 960×720, so the arena, touch controls, boss art positions and ALL collision radii are unchanged.
- Mobile's continuous fire cadence carries the fractional 30 Hz tick overshoot, preserving roughly 115 ms between successive shots rather than degrading to a 133 ms cadence. The desktop timer is unchanged.
- Mobile decorative work: **two** wireframe tesseracts instead of four and no expensive canvas soft blur. Real physical walls, enemy counts, attack patterns, bullets, sprites, sounds, wave timers and leaderboard scoring are not intentionally modified. Desktop visuals/frame loop remain unchanged.
- Exact wall geometry is lazily cached per simulation step; previously `ringShape` recalculated a trigonometric shape multiple times during each shot and bot collision test.
- Projectile broad-phase uses mathematically safe swept AABB rejection (retains exact impact calculations for possible hits); robot impacts use squared distances, and expired out-of-bounds shots avoid pointless wall checks.
- Verify on actual phones as well as desktop: elapsed game time should track real time at 15–30 FPS, mobile touches should still aim correctly, and boss/score outcomes should be unaffected.

## Otto timing correction — v0.3.38

- **No Otto before Wave 6.** Beginning with Wave 6, each wave gets an independent 45% chance of one Otto visit, 7–22 seconds into eligible active play. He might arrive on Wave 6 or not until several waves later. The old fixed early-run and repeating time windows are removed.
- A pending visit pauses while a mini-boss is warning/active; Otto never overlaps those encounters, main boss introductions, or graduation ceremonies. A previously active Otto vanishes if an encounter begins.
- New independent roll on wave change and on test-mode starts. No artificially early guaranteed test appearance.
- **Unchanged:** sprite, sound, shots knocking him back, wall phasing, shield/life penalty, score rewards, Cloudflare leaderboard functionality. Board run-build metadata updated only.

## Game-over leaderboard keyboard fix — v0.3.37

- When the world leaderboard opens, keyboard focus goes to the **dialog** (not the Close button), so the held FIRE/SPACE key cannot accidentally dismiss the score-submission screen on game over.
- Stray Space/Enter events on the dialog itself are prevented; Escape, Tab navigation, deliberate button activation, and initials typing remain available. No leaderboard API, game rules, scores, or enemy behavior changed.

## EVIL OTTO — v0.3.36

- A dedicated, polished **48×48 transparent yellow smile SVG sprite**, pixel-crisp, loads only once from `assets/evil-otto.svg`; an in-game canvas fallback preserves play if the image fails to load.
- **Rare, random visitor** starting after Wave 1: first arrival roughly 28–44 seconds in; subsequent visits every 57–86 seconds (in active non-boss play). A test-wave jump starts the first timer at 7–12 seconds for testing. Otto is **never** a leaderboard score bonus and carries no kill points or HP.
- **Bounces in from the perimeter**, approaches the stationary turret with a little side-to-side drifting hop, and **passes through moving walls**. He appears for only 10.8 seconds, then vanishes.
- **Indestructible, but repel-able:** turret bullets and Railgun beams knock him 100–145px away and temporarily prevent repeated overlapping hits. Normal bullets still respect walls before touching him. A short synthesized arcade *boing* marks his hops.
- **Contact costs one rechargeable shield charge** when available. If unprotected, he costs one life directly, not the player's hull bars. One contact ends the Otto visit, and existing post-life invulnerability applies.
- **Does not interfere with main boss encounters or their warnings / ceremony** (Warden, Architect, Leviathan); can nonetheless surprise a player during miniboss fights. Otherwise no gameplay system or scoring rules changed.
- Normal/TEST-run leaderboard separation remains intact; Cloudflare and other boss code unchanged. Keep Otto's sounds short and the graphics as a single inexpensive image draw per frame.

## Miniboss combat upgrade — v0.3.35

- **Sentinel (Waves 3, 11, 19...):** a visibly rotating steel shell blocks shots everywhere except a matching moving 120-degree cyan weak-point gap. At half health, it visibly warns before irregular reversals every 1.65–3.55 seconds and fires a wider *five*-shot fan instead of three shots.
- **Breaker (Waves 7, 15, 23...):** plated prow deflects frontal attacks; its teal flank/rear ports remain vulnerable as its heavy hull twists independently from its center-aiming guns. The front locks forward while charging; at half health it warns before launching a separate eight-bolt counterattack. Its ram advances much closer to the turret (94px radius) and releases a five- or seven-shot close-range fan if an actual shooting lane is open; bullets can still be intercepted, walls still block normal shots, and stationary-player contact is never unavoidable.
- Initial HP rises modestly (Sentinel 6→8, Breaker 10→14) and later versions scale by +3 every eight waves, up to 26/34. The intended difficulty is **reading armor and leading shots**, not shooting a huge HP sponge.
- Normal bullets, Heavy Laser, Arc Cannon chains and automatic Railgun all check the same directional armor; the Railgun penetrates moving walls, **not boss armor**. Brief deflection sparks and readable armor text make missed hits comprehensible.
- Existing boss schedule, prize drops, score bonuses, real wall interactions, and global leaderboard logic are untouched. Small canvas effects only. Test waves **3** and **7** first, then waves 11 and 15.

## Cloudflare world leaderboard — v0.3.34

- Added a shared **WORLD TOP 10** overlay showing player initials, score, wave reached, robot kills, and a special **LEVIATHAN DESTROYED** indicator.
- A normal game-over automatically checks whether the run ranks in the Cloudflare D1 Top 10, then offers an initials submission. **Test mode is excluded** from submission. The original personal high score remains unchanged; no local Top 10 was added.
- Opens from the game controls; pauses and resumes a live game when you inspect the ranking. Leaderboard networking is asynchronous and never runs in the render loop. An unavailable Worker shows an honest **OFFLINE** warning and never pretends that a score was saved.
- Dedicated worker code and D1 schema are in [worker/](worker/README.md). **Cloudflare dashboard Worker deployment, D1 table initialization and DB binding are still required** before the online board works. Do not overwrite the other games' databases.

## Leviathan replacement sprite integration — v0.3.33

- The five-frame **high-detail WebP sprite sheet** `assets/leviathan-atlas-v2.webp` contains individually rendered armor damage and reactor stages. The frames are 240 × 180 source pixels and display at the existing 180 × 135 screen size, with nearest-neighbor sampling. Transparent background, no new runtime effects.
- **Asset publication note:** This code is prepared to load the replacement sheet; it continues using the original `assets/leviathan-atlas.avif` whenever the new WebP hasn't been uploaded to the GitHub repository. The new sheet therefore must be placed in `assets/` before the artwork becomes visible online.
- Existing AI, firing, hitboxes, pod and reactor health, HUD overlays, sound, and the 2.4-second explosion timing are unchanged.

## Leviathan sprite clarity — v0.3.32

- **Sharper, less oversized Leviathan:** Wave 12's visible ship is now 180 × 135 game pixels instead of 214 × 160 (roughly 16% smaller). Nearest-neighbor rendering prevents the AVIF sprite from being softened by canvas scaling.
- **Consistent death animation:** The four separate sprite fragments match the new live-boss size and also render sharply; the existing 2.4-second explosion sequence, shockwaves, and graduation timing are preserved.
- **Visual only:** The boss's orbit, position, weapons, firing pattern, collision, pod/core hitboxes, HP, targeting cues, rewards, and all other waves are untouched. Keeping the sprite centered on its true coordinates avoids confusing shots that appear to land off-target.

## Leviathan Counterattack — v0.3.31

- **Movement:** The Wave 12 boss has faster, variable-radius orbiting, brief direction-change feints, faster bursts of speed, and frequent lunging/reversing charges in its final phase. It can no longer be beaten by parking the aim on one angle.
- **Artillery:** All three weapon pods fire aimed three-shot volleys much more often. After two pods fall, surviving pods switch to five-shot fans; after the reactor opens, the core launches five-shot bombardments, becoming rapid seven-shot salvos in its final phase. Two emergency hull cannons fire throughout, including after the pods are destroyed.
- **Escalation:** The counterattack begins around the 60% armor mark and the furious final phase begins below 25% of total starting armor. Pod armor is **5 hits each** and the reactor **8 hits** for a longer, more demanding contest; its accurate weak-point rules and railgun one-target limit remain. Fire is wall-blocked, shootable by the player, and capped at 65 hostile shots.
- **Unchanged:** Boss rewards, reinforcement caps, controls, earlier waves, wall mechanics, Stasis rules, and the full **2.4-second destruction sequence** followed by graduation. This is a tuning release and needs a real Wave 12 test play for balance.

## Leviathan death sequence fix — v0.3.30

- **Visible boss finale:** The destroyed Leviathan's actual damaged sprite breaks apart over 2.4 seconds, with staggered pod detonations, a delayed reactor blast and a widening shockwave. Wave 12's graduation ceremony begins only after the animation finishes, so the clear plaque cannot cover the explosion.
- **Visual-only fix:** Enemy targeting and defeat timing, points, score lives, boss mechanics, turret abilities, collision, and the existing two-second graduation duration are unchanged. Four small sprite fragments and bounded particles keep the effect lightweight on phones and Chromebooks.

## The Leviathan — Wave 12 main boss (v0.3.29)

- **Actual game sprite asset:** `assets/leviathan-atlas.avif`, a compact transparent **five-frame, 640 × 96 sprite atlas** adapted from custom cyberpunk pixel-art concept imagery. Frames show intact armor, successive destroyed-weapon configurations, the exposed reactor, and the final enraged chassis. The game uses the real decoded AVIF frames with fixed source rectangles, plus an inexpensive canvas fallback if the image has not loaded. No added runtime libraries.
- **Wave 12 full boss:** The Leviathan enters only after the normal Wave 12 robots are cleared, following a three-second warning and approach. It is a third **main boss** alongside the Wave 4 Warden and Wave 8 Architect; defeating it is required to graduate into Wave 13.
- **Three separately targetable weapon pods:** The port, dorsal and starboard pods each have **5 HP**, their own hit circles, short collision protection, charge warnings and independent firing timers. The flank batteries fire spread volleys; the dorsal battery launches fast focused shots. A pod's destruction changes the actual displayed sprite and reveals more of the damaged shell.
- **Reactor phase:** Destroy all three pods to expose a periodically opening red reactor. It needs **eight successful core hits**, one per reactor hit regardless of Heavy Laser / Railgun damage. The Railgun can destroy a pod or reach the core through walls, but it can hit **only one Leviathan target per blast**. Armor and reactor phases cannot be skipped by raw weapon DPS.
- **Final assault:** At five remaining reactor HP, the chassis displays the fifth, enraged sprite, reverses its orbit, warns before inward charges, and fires accelerated seven-shot barrages between core openings. Its warning rings, targeting cues and remaining health are drawn clearly on small phones.
- **Bounded robot reinforcements:** The boss periodically manufactures ordinary robots with a strict cap of **4 alive at a time** and **12 total per encounter**. Those reinforcements share the game's collision, scoring, damage and slowdown rules. Surviving reinforcements shut down when the command core is destroyed. No permanent enemy spawns or performance-heavy effects.
- **Reward:** The Leviathan's defeat triggers a multi-stage particle destruction sequence (expanded into a clearly visible 2.4-second finale in v0.3.30), frees Wave 13, and adds **4,000 points** (eligible for regular score-based extra lives). The existing turret upgrades, ammo, supplies, mini-bosses, mobile controls, full-boss behavior and high-score rules remain unchanged.

## Mini-Bosses & Bruisers — v0.3.28

- **The Sentinel (Wave 3):** A six-hit armored hunter enters with a clear red warning after **half the swarm has been eliminated**. It sweeps around the arena, fires clearly telegraphed **three-shot fans**, and accelerates/reverses direction after its armor cracks. The remaining robots continue attacking while it is alive.
- **The Breaker (Wave 7):** A ten-hit twin-cannon siege machine appears at the same halfway threshold. It telegraphs **four-shot bursts**, escalating to **six-shot volleys** after its armor breaks, and warns before a short inward charge. At half health its bright gold reactor is exposed: hitting the central core deals **one additional damage**, rewarding deliberate aim.
- **Recurring threats:** The Sentinel returns at Waves **11, 19, 27, ...** and the Breaker at Waves **15, 23, 31, ...**, with **two additional HP** on each return (bounded for endless runs). Wave 4 Warden and Wave 8 Architect remain the distinct, full-size bosses.
- **Mandatory encounter:** Mini-bosses enter **mid-wave** rather than after all robots are gone, and no graduation can begin until the mini-boss is destroyed. Each win grants **850+ points (Sentinel)** or **1,350+ points (Breaker)**, growing in later waves, and a **guaranteed gold shoot-to-collect supply drone**. If a normal supply is already in flight, the mini-boss reward is queued without deleting the existing one.
- **Bruiser heavy robots:** Starting Wave **5**, heavy robots now have **5 HP** rather than 2. Their armor rises to **6 HP at Wave 10** and **7 HP at Wave 15 onward**. Larger armored sprites show an HP gauge and cracking plates. Once below half health, a Bruiser speeds up, gains firing range, and launches rapid three-shot spreads. Wave 4's original two-hit heavy robots are preserved to keep its Heavy Laser qualification fair.
- **Readable on phones:** Distinct vector silhouettes, bright attack telegraphs, clear boss HP bars and bottom-HUD status. No new controls, downloaded sprite assets or dependencies. All original turret weapons, drops, arena layouts, mobile input, major bosses and score-life milestones are preserved.

## Mobile Two-Thumb Controls — v0.3.27

- **Phone / touch-primary devices only:** The former small eight-direction quick-aim button pad becomes a large **360-degree drag-to-aim wheel**. Its illuminated needle tracks the turret's actual rotation, and aiming retains the original capped turn speed and acceleration.
- **Hold FIRE independently with the other thumb.** The wheel and FIRE use separate captured pointer IDs, so dragging one cannot steal the other. The wheel does **not** fire automatically; as before, dragging directly on the arena also aims and fires if preferred. A dead zone at the wheel center avoids accidental aim changes when a thumb settles.
- **Portrait phones:** The larger aim wheel and FIRE button sit directly under the arena, side by side. **Landscape phones:** The 4:3 combat screen fits the viewport with thumb controls docked outside it on the left and right; pause, sound and test-wave controls remain available in a compact strip beneath the screen. The game field is never rotated or cropped.
- **Touch-only performance:** Cosmetic particle bursts are reduced to 70%, with a 280-particle cap (desktop remains 450). Scanline overlay contrast is also reduced on touch devices for clearer targeting. No scoring, enemy AI, hitboxes, boss behavior, gunfire timing, movement mechanics, power-ups, progression or rewards were changed.
- **Desktop/Chromebook mouse and keyboard controls are unchanged.** The touch wheel is hidden and does not register listeners on fine-pointer devices. Desktop retains its original eight-direction quick-aim buttons and complete visual particle budget.
- Automated interaction tests covered two independent touch pointers, direct-fire continuity, wheel dead zone, focus/keyboard slider, separate mobile and desktop effects, and versioned assets. Physical phone/landscape playtesting remains necessary.

## Play

This is a static browser game with **no dependencies or build step**. Open `index.html` in a modern browser.

For an online version, enable GitHub Pages in **Settings → Pages → Build and deployment → Deploy from a branch**, then select **main** and **/(root)**. Once Pages finishes publishing, the game will be at `https://richcande1-rca.github.io/beyond-berzerk/`.

## Repairs, Overcharge and Score Lives — v0.3.26

- **Classic score milestone lives:** Starting with three lives, earn one extra life at **15,000**, **30,000**, **45,000**, **60,000**, and every additional 15,000 points indefinitely. Each milestone pays out **once per run**, including test runs. The maximum reserve is **five lives**; thresholds reached while already at five are consumed rather than banked. Losing a life later allows another life at the *next* score threshold. A distinct **EXTRA LIFE!** announcement, multi-note fanfare and celebration mark each awarded life. All five life icons fit the existing top-right HUD.
- **Green Hull Repair drone (~20% of supply crossings):** Identifiable by a bright green medical cross instead of the gold mystery question mark. Shoot it to restore the **hull to 3/3**, without adding shields or lives. If hull is already full, it awards **250 points** instead; those points count normally toward extra-life milestones and high scores.
- **Rare blue Overcharge drone (~10% of crossings from Wave 4 onward):** Identifiable by a blue lightning bolt. Shooting it immediately refills all **three rechargeable shield charges**, resetting shield regeneration, and instantly readies the **Railgun if it has already been unlocked** (Wave 7 onward). It never unlocks restricted equipment early. A Railgun shot that collects an Overcharge drone is itself immediately recharged rather than having its cooldown overwritten.
- **Gold mystery drones still provide** Triple Threat (10s), Guardian Drones (12s), or Stasis Field (8s). Repair and Overcharge are **instant** and never cancel a running temporary ability. All five types use the existing single-supply-at-a-time system, shoot-to-collect rules, wall-phasing flight, pause behavior and randomized arrival times.
- All scoring, rewards and visuals use simple frame updates and canvas shapes; no new buttons, downloads or dependencies. The permanent twin cannons, Heavy Laser, Railgun, Arc Cannon, bosses and sector artwork remain intact.

## Random Supply Drops — v0.3.25

- **A gold question-mark supply drone occasionally crosses the arena** (with new green Repair and blue Overcharge variants added in v0.3.26), flying through rotating walls like the Wave 4 shield capsule. The timing, travel direction, altitude and reward are randomized. Shoot it with a normal player laser or an automatic Railgun beam to collect it; it is never acquired by merely waiting and cannot be collected by enemy shots. A missed drone exits naturally, with another random delay before a new one can appear. Only one supply drone is present at a time; drops pause during wave clear and boss warning/entry, but can appear during an active boss fight.
- **Triple Threat (10 seconds):** The original front (and, after Wave 4, rear) cannon fires a three-shot spread on the ordinary FIRE rhythm. This means three streams before twin cannons, six with both cannons; the original center shot still carries a charged Arc Cannon round when available. All six remain blocked by real walls, while the Railgun continues firing independently. No new button.
- **Guardian Drones (12 seconds):** Two turquoise satellites orbit the central turret and automatically seek nearby ordinary robots, firing at most two additional small bullets per 0.43 seconds. They do not shoot through actual walls or target bosses. Guardian kills do not count toward Wave 4's direct-player-shot Heavy Laser qualification; ordinary weapons still do.
- **Stasis Field (8 seconds):** Enemy robot movement, panic motion, and firing frequency slow to **36%** speed; all hostile projectiles currently in flight and newly fired are also slowed to 36%, with interception/path physics adjusted to match. Friendly bullets, Railgun, turret rotation, walls, bosses' movement/reversal logic and recharge systems stay at full speed.
- The pickup is chosen randomly from these **three** temporary effects, avoiding an identical reward on consecutive collections. A new pickup replaces the current temporary powerup; regular permanent graduation upgrades and shields never disappear. A compact countdown strip near the bottom of the combat arena, glowing barrel arcs, orbiting guardians or a blue stasis ring clearly show which temporary ability is active.
- Lightweight rendering: only ordinary canvas paths, no texture files, browser timers or new controls. One drone per crossing, up to two guardian shots per volley, no runaway effects. All gameplay updates use the existing frame-based delta, so pause stops the countdown. The proposed Plasma Storm, Iron Dome and rare Annihilator remain **design ideas only**, not implemented in this release.

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

## Sector Identity — v0.3.24

- **Five redesigned level identities**, each readable without checking the wave number. Wave 3 **Prism** has seven enormous violet crystal spires, fractured triangular interiors and floating splinters; Wave 5 **Vector** looks like a green circuit board with square modules, orthogonal buses and moving data packets; Wave 6 **Phantom** is icy, fractured industrial gearing, severed conductors and sporadic electrical arcs; Wave 7 **Kaleidoscope** features counter-rotating hinged diamond mirrors and square reflection frames; Wave 9+ **Cosmos** is deliberately sparse deep-black space, dimensional fractures and four rotating tesseracts.
- **Distinct solid wall appearances:** The existing real collision walls adopt matching crystal points, circuit junctions, cracked cold-metal seams, mirrored facets or stars, respectively. All accents sit on the same moving physical wall arcs, so their radius, segment count, spin, blockable lanes and actual hitboxes are unchanged.
- **No generic wallpaper repetition.** The uniform square background grid is limited to the classic, Radar, Reactor and Pulse stages; Vector has its own sparser circuit grid. The shared decorative ring echoes remain only on Wave 8, whose look was already distinctive. The four-dimensional tesseracts now appear **only on Cosmos (Wave 9 onward)** rather than leaking into Waves 5–8.
- **Wave titles now match level identities:** RADAR SWEEP, PRISM FRACTURE, REACTOR FURNACE, VECTOR GRID, PHANTOM WORKS, KALEIDOSCOPE, PULSE CHAMBER and COSMOS BREACH. First Contact remains the classic opening.
- **Wave 2 Radar and Wave 8 Pulse** retain their established art and physical wall layouts. No new assets, Web requests, libraries, controls, enemy logic, boss timing, weapons, scores or upgrades. All five new environments use small bounded batches of ordinary canvas paths; wave numbers after 9 keep fixed maximum visual complexity for Chromebook performance.
- Test Waves **3, 5, 6, 7 and 9** to compare the new identities directly. Automated render smoke tests exercised Waves 1–10 in all three arena modes, both sprite and canvas fallbacks, and real wall collisions. Real-device visual/performance testing remains necessary.

## Boss Fury — v0.3.23

- **Boss fights now escalate by phase**, without increasing their hit points, changing hitboxes, altering their rewards or adding any weapon controls. Wave 4's Warden still needs three core hits; Wave 8's Architect still needs four. Bosses continue to block graduation until defeated.
- **Tighter reactor exposure:** The Warden's cyan core remains open for **1.35s, 0.98s, then 0.76s** per 3.8-second cycle, down from 2.05 seconds each phase. The Architect's violet core opens for **1.60s, 1.15s, then 0.91s** per five-second cycle, down from 2.45 seconds. Closed armor is invulnerable as before, and the existing sprite shutters now animate at the exact revised openings.
- **Warden's flanking maneuvers:** Phase 1 remains a familiar orbit; later phases change direction after a 0.6-second warning. An amber halo and audible cue telegraph each reversal. Orbit speed increases by phase, with a more irregular radius. Final phase fires **six** faster shots per volley, on a 1.12-second attack cadence.
- **Architect's arena control:** From Phase 2 onward, the boss glides between the inner and outer wall lanes and reverses its orbit as it repositions—no teleporting. Phase 3 moves faster, keeps the original real-wall reversal mechanics, increases wall rotation to 2.0× its existing boss baseline and fires **six** faster projectiles per volley on a 1.10-second cadence.
- Changes are lightweight numeric combat and animation adjustments, with no new boss images, libraries, heavy particle effects or per-frame allocations. Test Waves **4** and **8** allow immediate boss playtesting.

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

## Architect boss sprite — v0.3.22

- Replaced the Architect's procedural-only canvas body with a **real six-frame transparent WebP sprite atlas** (`assets/architect-atlas.webp`, 864×144, approximately 60 KB) made from approved industrial-cyberpunk boss concept artwork.
- Three damage phases each have a **sealed** and an **exposed violet-core** frame. The central visor, asymmetric articulated siege legs, hazard-stripe plates and accumulating mechanical destruction remain readable at gameplay size.
- The reactor shutters cross-fade over 0.18 seconds at the existing five-second vulnerability rhythm, with a small overlay ring aligned to the real center of the core. A subtle warning signal still draws from the arms when the Architect takes control of the walls.
- The image is decoded once and drawn with ordinary canvas sprite cropping; no new frames or textures are allocated during play. If WebP is unsupported or the asset hasn't loaded, the **original procedural Architect art remains the fallback**.
- **Presentation-only:** No changes to the Architect's four hits, actual hitbox, core timing, AI, arena reversals, projectile damage, movement, score or Wave 9 Arc Cannon reward. The Warden remains unchanged.

## Wave 8 — The Architect, v0.3.21

- **The second boss appears after clearing the Wave 8 robot swarm.** Graduation is blocked by a 2.7-second **ARENA CONTROL COMPROMISED** warning, followed by a huge four-arm siege robot entering from outside the arena. It is visually distinct from the Warden: an articulated spider-like chassis, dark industrial plating, magenta sensors and a central **violet** reactor. Damage progressively breaks its arms and exposes circuitry.
- **Four exposed-reactor hits to defeat.** The central core visibly opens for part of a repeating five-second cycle; ordinary gunfire can only hurt it through a clear wall lane and during an opening. The automatic gold Railgun **ignores the physical walls** and can hit that same vulnerable core through the Wave 8 PULSE plates, but cannot damage sealed armor. Core hits are spaced out by a short guard interval.
- **Three phases:** In Phase 1 its four arms sweep and its twin electrical volleys challenge the center. After the first core hit, Phase 2 telegraphs and then reverses the actual rotating arena ring directions for 2.2-second intervals, briefly restoring the original directions between overrides. After the second hit, Phase 3 accelerates real wall rotations and fires larger, faster volleys, with more frequent overrides. Wall collision and friendly/hostile shot blocking use these same rotating walls, not fake decorative geometry.
- **Boss victory:** A 3,000-point bonus, enemy projectile cleanup and restored pre-boss wall spin directions. Only then can Wave 8 graduate and award the Arc Cannon for Wave 9. The Warden remains solely Wave 4; later every-fourth-wave bosses are not yet authored.

## Wave 9 — Arc Cannon, v0.3.21

- **Automatically integrated with the normal firing rhythm** and no new control: every 3 seconds, the next front-cannon round is charged with cyan chain lightning. When it strikes a robot, electricity jumps from that target to up to **two distinct nearby robots**, in sequence, within 92 pixels per hop.
- A chain hop checks solid, rotating wall collision along its full line. **Electricity cannot jump through walls.** Each hop delivers one damage, and armored robots may survive the chain; kills and chain bursts use the existing score and particle rules.
- HUD: compact **ARC READY** or recharge timing beside the wave number. A brief two-link flash marks a successful chain. The Railgun, twin cannons, Heavy Laser and rechargeable shields remain unlocked and operate normally; a Wave 9 test run includes Arc Cannon automatically.
- Lightweight canvas drawing; no new image assets, inputs, external libraries or heavy persistent particles.

## Automatic Railgun — v0.3.20

- **Wave 6 graduation unlocks the Railgun for Wave 7 onward**, replacing the earlier underwhelming Penetrator shot. There is no separate weapon button, no manual charging, and no waiting to fire: while holding the existing FIRE button or Space, the turret automatically discharges every **4.5 seconds** when ready.
- **Full-length electrical gold blast.** An immediate ray tears through all rotating walls, deals 3 damage once to each robot in its path (including heavy armored bots), and clears hostile projectiles along the beam. The blast uses a visible 0.24-second gold/white-hot streak, a brief muzzle bloom, audible two-part discharge and more pronounced recoil.
- **The ordinary weapon stream is preserved.** The front cannon still fires its normal or Heavy Laser shots, and the rear twin cannon still fires alongside it. The Railgun is an additional blast, not a replacement for a regular bullet. The existing .115-second normal firing cadence and turret rotation physics do not change.
- A gold coil on the sprite indicates readiness. The HUD now reads **RAILGUN READY** when charged or **RAIL X.Xs** while recharging, replacing the unclear `PEN READY`. The Wave 6 diploma says **RAILGUN**.
- No new sprites, particle streams, rendering blur filters or dependencies. The Railgun's ray is a few canvas strokes and one bounded on-fire collision pass, preserving the Chromebook performance budget. Test Wave 7 starts equipped; no changes to earlier waves, shields, the Warden or the scoring model.

## Graduated arsenal — v0.3.11 (historical rules; Railgun updated in v0.3.20)

- **Wave 4 clear: Twin Cannons.** The simultaneous front/back firing upgrade now arrives in Wave 5 instead of Wave 2. Wave 1–4 use only the front cannon.
- **Wave 3 clear: Rechargeable shield.** Unlocks a separate three-charge cyan shield around the turret for Wave 4 onward. Each charge absorbs one hostile projectile; each hit resets the recharge timer. After six uninterrupted seconds, one charge regenerates, repeating until all three are restored. The existing 0.5-second projectile grace applies. Direct robot contact still costs a full life and bypasses the shield; surviving lives begin with a fully charged shield. Existing three-hit hull durability remains unchanged.
- **Wave 4 participation challenge: Heavy Laser.** Land **at least eight direct weapon kills during Wave 4**, then graduate to unlock double-damage shots in Wave 5, when the twin cannons also arrive. Armored bots take one hit. Kills from moving walls and chain reactions do not count; the Wave 4 HUD displays the direct-kill counter. Without eight direct kills, the twin cannons are still awarded, but the Heavy Laser is not.
- **Wave 6 clear: Railgun.** Originally a periodic Penetrator projectile; superseded in v0.3.20 by the automatic full-arena gold Railgun blast described above. The original front and rear cannon shots continue firing, and the normal firing cadence is unchanged.
- **Test Mode:** Starting at Wave 4 includes the shield but not twin cannons. Starting at Wave 5 or higher simulates earning both twin cannons and the Heavy Laser; Wave 7 or higher starts with a ready Railgun, while Wave 9 or higher also starts with Arc Cannon. Wave 4 and Wave 8 test runs must still defeat their respective bosses to graduate. Starting Wave 4 requires the direct-kill challenge for Heavy Laser but always earns twin cannons after the Warden. Test scores remain separate.
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
- **Sector Spectacle (original v0.3.10 visuals):** Originally these sectors shared more concentric-ring wallpaper. The v0.3.24 Sector Identity overhaul above supersedes the old Prism lattice, Vector tunnel, Phantom ghost-ring, Kaleidoscope and Cosmos appearances. Each stage still has a distinct wall layout and correctly matching physics.
- Visual intensity starts meaningfully at Wave 2 instead of near-invisible: exponentially increasing detail through Wave 9, then capped draw counts for Chromebook performance. Waves beyond 9 continue shifting hue/rhythm without piling on geometry. Each cleared sector gets a radiant victory transition and a themed incoming-wave reveal. As of v0.3.10, the real wall layouts and their collision footprints also change by wave; projectiles, robot AI, and equipment keep their existing mechanics.
- Normal player shots and enemy shots collide with the first wall they hit; the automatic Railgun ray ignores the wall geometry and reaches the arena perimeter.
- Turret lasers can intercept hostile projectiles in flight. Regular shots and enemy shots both vanish in a cyan-white spark; the Railgun destroys hostile shots along its beam without losing power. Aiming is still manual; interceptions award no bonus points.
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
- **Hypercube Engine — original v0.3.3 behavior (superseded by v0.3.24):** Four-dimensional tesseracts once appeared beginning in Wave 5 and accumulated through Wave 8. They now occur **exclusively in Cosmos, Wave 9 onward** (four maximum), with the same XW/YZ/ZW projection, central-turret clipping and purely decorative non-collision behavior.
- **Rendering optimization — v0.3.3:** Removes costly per-robot and per-projectile shadow blur, removes blurred particle impact and shockwave strokes, reduces two moving-wall echo paths to one, batches the arena grid into one path, and caches radial gradients per sector/mode. Preserves crisp laser cores and solid robot silhouettes. Wave 4/5 performance still needs real-device validation. The shield and upgraded projectiles were introduced in v0.3.9; further cannons remain unimplemented.
- **Signal Clarity — v0.3.2:** Reduced arena wallpaper opacity, softened perimeter/wall halos, lowered translucent ghost-ring and wall-trail strength, and restrained the damage flash. Kept the unique geometric composition and colors for each wave. HUD instruments now have opaque dark rails, sharp Oxanium readouts, pale high-contrast numbers and dividers, and zero text bloom. Wave announcements and sector-clear rewards use crisp text on compact dark plates placed above the turret instead of glowing over its center. Wall warning colors, collisions, AI, combat and controls are unchanged. Preserve this contrast and center space when adding future turret defenses and weapons.
- **Visual reward pass — implemented in v0.3.1:** Earlier v0.3.0 visuals were too faint in Waves 2–3. New signature palettes and geometry start at Wave 2, with a sector-clear celebration and wave-introduction effect. Field art is behind the combat layer, and the center of the decorative field stays clear for the player turret.
- **Future turret equipment:** Additional powerups, cannons and defensive systems beyond Twin Cannons, the three-charge shield, Heavy Laser, Railgun and Arc Cannon require separate discussion and explicit approval. Preserve visual contrast, screen space and the performance budget.

## First-contact scope

This is a **playable prototype**, not a finished release. Arena art uses procedurally drawn vector graphics rather than the original concept illustration. Enemy behavior, difficulty, sound, scoring, and control feel are open for playtesting and iteration.

Inspired by the spirit of classic 1980s arcade shooters. An original game; not affiliated with the original Berzerk.
