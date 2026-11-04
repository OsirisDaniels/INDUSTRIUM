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

## Stage 4: Hybrid renderer 2.0 (planned)

Introduce sprite atlases for industrial machines and engineer animations, optional shader effects for fluids/heat, and visible-region culling. Test WebGL and Canvas fallbacks on Android. Avoid a wholesale renderer migration or introducing a mandatory CDN dependency.

## Stage 5: Worker evaluation (planned)

Profile the full simulation, then test worker-owned physics using transferable snapshots and a command queue. Keep factory, player, machine placement, saves and world physics synchronized. Only ship worker mode if it produces a measured improvement on actual mobile devices.

## Acceptance criteria

1. Existing Career and Creative saves open unchanged.
2. Phone drag, pinch zoom, walk and joystick controls remain usable.
3. Hybrid On/Off does not change materials when disabled.
4. FPS and main-thread work are measured on Android, not inferred from desktop.
5. Fallback mode remains usable on lower-end phones.
6. Every new physics rule has deterministic test fixtures and a bounded work budget.

**Status (Alpha 0.25):** Stages 1–3 have initial implementations. Stages 4–5 are planned. Stage 3 remains an early physics foundation, with pipe failures and richer stress modelling still outstanding. Android gameplay and FPS require device validation.
