# INDUSTRIUM Hybrid Engine Roadmap

## Architecture: Alpha 0.24 (Stage 1, implemented)

Phaser remains the renderer, input layer, camera and UI. The existing `js/world.js` remains the canonical 240 × 160 material grid, and `js/factory.js` owns machines, inventory, power and credits.

The new `engine/hybrid.js` is an optional, isolated enhancement layer:

- **Microphysics:** bounded, deterministic sampling for liquid pressure relief, heat-driven steam/obsidian reactions, and granular edge slides. This runs periodically on the main thread, does not create new material IDs, and respects machine-blocked cells.
- **Visuals:** Phaser Graphics lighting shafts, machine glows, local hot-machine sparks, activity particles, and biome weather tints. These are lightweight approximations, not true physically based lighting or GPU shaders.
- **Performance:** particle and machine-light counts are capped and scale down with the existing adaptive performance controller. Rendering can be disabled independently using Settings.
- **Save compatibility:** no change to the existing `industrium-phaser-engine-v1` localStorage save key or world/factory schema. Hybrid effects are transient and reset on load/new world. Graphics preferences are stored separately in localStorage.

## Stage 2: Chunked active-region physics (planned, not implemented)

Introduce a 16 × 16 tile active-chunk map with wake-up propagation for flowing liquids and granular cells. Preserve deterministic world state and validate against full-grid physics on representative saved worlds. Avoid changing `world.simulate()` wholesale until equivalence and performance are measured.

## Stage 3: Material pressure and structural integrity (planned)

Track bounded pressure fields and supports; simulate pipe bursts, terrain collapse, containment and machine damage. Use optional versioned state in saves, with migration defaults for older saves. Expose pressure overlays and debugging telemetry.

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

**Status:** Stage 1 implemented; Stages 2–5 are design targets, not completed features.
