# INDUSTRIUM Hybrid Engine Roadmap

## Architecture: Alpha 0.24 (Stage 1, implemented)

Phaser remains the renderer, input layer, camera and UI. The existing `js/world.js` remains the canonical 240 × 160 material grid, and `js/factory.js` owns machines, inventory, power and credits.

The new `engine/hybrid.js` is an optional, isolated enhancement layer:

- **Microphysics:** bounded, deterministic sampling for liquid pressure relief, heat-driven steam/obsidian reactions, and granular edge slides. This runs periodically on the main thread, does not create new material IDs, and respects machine-blocked cells.
- **Visuals:** Phaser Graphics lighting shafts, machine glows, local hot-machine sparks, activity particles, and biome weather tints. These are lightweight approximations, not true physically based lighting or GPU shaders.
- **Performance:** particle and machine-light counts are capped and scale down with the existing adaptive performance controller. Rendering can be disabled independently using Settings.
- **Save compatibility:** no change to the existing `industrium-phaser-engine-v1` localStorage save key or world/factory schema. Hybrid effects are transient and reset on load/new world. Graphics preferences are stored separately in localStorage.

## Stage 2: Conservative active-chunk acceleration (implemented in Alpha 0.24.2)

Implemented 16 × 16 active-chunk occupancy, wake-up propagation, periodic reconciliation for legacy direct writes, and span skipping. A Settings toggle restores full-grid processing. Three deterministic world comparisons, each covering 110 ticks, yielded identical material grids. Android FPS improvement is not yet measured.

## Stage 3: Structural physics foundation (implemented in Alpha 0.25)

Implemented optional bounded structural sampling with exposed-roof stress, limited collapse of fragile tiles, confined-liquid pressure release, and heat/acid exposure damage to machinery. Added subtle visible stress/pressure indicators, Settings toggle, and versioned summary/history in autosaves and manual slots. Old saves restore with default structural state. These are simplified structural rules, not a complete finite-element solver. **Pipe networks and burst mechanics remain planned**, as do stronger load-bearing supports and dedicated pressure debugging.

## Stage 4: Hybrid renderer 2.0 (Alpha 0.26 initial implementation)

**Implemented in Alpha 0.26:** visible-region culling for machine vector drawing and hybrid lighting effects, capped draw budgets, quality-aware simplified machinery rendering on Fast/Ultra tiers, and additional animated details for drills, pumps, furnaces and batteries. All remain Phaser Graphics, without new external dependencies or save changes. **Still planned:** true sprite atlases, engineer sprite animation, optional fluid/heat shaders, WebGL/Canvas device compatibility testing and measured Android performance.

## Stage 4.1: Animated world and machinery (Alpha 0.27 initial implementation)

**Implemented:** runtime-generated sprite atlas with four animation frames across five machine families, camera-limited sprite creation and cleanup, adaptive frame cadence, and an in-game switch between sprites and classic vector machinery. No additional asset downloads, no save-schema changes. **Still planned:** authored industrial sprite sheets, engineer walk/jump animation atlas, fluid refraction and heat shaders, better ambient environmental lighting and measured Android FPS. These additions should be tested on actual devices before the next stage.

## Stage 4.2: Engineer animation and fluid visuals (Alpha 0.28 implemented)

Added a procedural engineer sprite atlas for idle, walking, jumping and damage states, with directional mirroring and vector fallback. Added camera-limited fluid glints and lava heat ripples. No new material IDs, save schema changes or external assets. Authored sprites, true refraction shaders and Android profiling remain planned.

## Stage 4.3: Mobile input and frame pacing (Alpha 0.29)

Touch jump and joystick up queue a jump for the player physics step, with a short buffer for presses just before landing. Auto performance starts at Balanced on touch-first devices and reduces workload when frame cadence or JavaScript timing indicates sustained slowdown. Save format is unchanged. Physical Android validation remains open. Alpha 0.29.1 creates the vector engineer only when the animated sprite is unavailable.

## Stage 4.4: Touch navigation and construction (Alpha 0.30)

Multi-touch cancels pending terrain strokes and suppresses world actions until all fingers lift. Touch construction previews the selected cell with a separate Place button, blocked-placement feedback and rotation for directional machinery. Mouse placement remains immediate. Existing saves already store each machine’s direction.

## Stage 4.5: Factory diagnostics (Alpha 0.31)

Inspect shows live machine conditions, buffer contents, grid demand and the latest factory action. Belts, filters, hoppers, pumps and condensers show their outlet or currently available receiver on the world map. Diagnostics read existing simulation state and add no save fields.

## Stage 4.6: World interface (Alpha 0.32)

Consolidated the world tools into one dock, moved telemetry and diagnostics to their relevant panels, and show camera, engineer and placement controls when their tools are active. The build catalog shows unlocked machines by default and the settings panel groups related controls.

## Stage 5: Worker evaluation (planned)

Profile the full simulation, then test worker-owned physics using transferable snapshots and a command queue. Keep factory, player, machine placement, saves and world physics synchronized. Only ship worker mode if it produces a measured improvement on actual mobile devices.

## Acceptance criteria

1. Existing Career and Creative saves open unchanged.
2. Phone drag, pinch zoom, walk and joystick controls remain usable.
3. Hybrid On/Off does not change materials when disabled.
4. FPS and main-thread work are measured on Android, not inferred from desktop.
5. Fallback mode remains usable on lower-end phones.
6. Every new physics rule has deterministic test fixtures and a bounded work budget.

**Status (Alpha 0.32):** Stages 1–3 have initial implementations; Stage 4 includes camera-aware rendering and the first runtime machine sprite atlas. Stage 5 remains planned. Pipe failures, advanced structural supports, authored sprite assets and GPU shaders remain unfinished. Android gameplay and FPS require device validation.
