# Living Face

A frameworkless, CSS-built portrait study. The face is assembled from semantic DOM layers; its expression, gaze, material and lighting respond to input without canvas, a rendering library, external image assets or runtime dependencies.

## Visual systems

- **Ink / Vector** — a warm comic portrait with outlined facial planes, layered cel shading, graphic eyelids and deliberately drawn lip geometry.
- **Pixel / 16-bit** — stepped silhouette geometry, block-built facial features, quantized gaze and a fixed pixel-grid overlay.
- **Volume / 3D** — nested perspective planes, volumetric radial lighting, layered facial relief and a pointer-sensitive cast shadow beneath the nose.

All three systems reuse the same facial structure. Cartoon and pixel modes use a flattened 2D rendering tree; only hyper enables the nested 3D scene. Mode changes are CSS-driven through `body[data-mode]`.

## Interaction

The page presents the portrait alone, centered in the viewport. No showcase copy, mode selector, status readout or decorative stage markings are rendered.


- Move the pointer to steer the gaze and shift the face's directional light.
- Click the portrait, or focus it and press **Enter** / **Space**, to trigger a short mouth response.
- Automatic blinking pauses when the page is hidden and respects reduced-motion preferences.

Pointer events are normalized to the **-1 to 1** range and coalesced into one `requestAnimationFrame` callback. That frame writes compositor-friendly `transform` values directly to the head, two irises, nose shadow and stage-light layer. It does not broadcast pointer variables through the document, mutate gradients, or read layout. The coordinate readout is informational and is throttled to 10 updates per second, outside the motion loop. The 16-bit mode quantizes head and iris positions into discrete sprite steps. No worker is used because there is no heavy filtering, parsing or list-processing workload to offload.

## Structure

- `index.html` — semantic page shell and detailed facial DOM: brows, sockets, eyeballs, iris rings, pupils, highlights, independent eyelids, nose structures, philtrum and mouth cavity.
- `style.css` — shared anatomy, three complete material systems, expression states, motion, and responsive layout.
- `app.js` — pointer normalization, mode selection, keyboard interaction, blinking and expression state.

## Run locally

Open `index.html` in a modern browser. No install or build step is required.


## Performance model

- Pointer motion is frame-coalesced and writes only transforms on the layers that physically move.
- No per-frame DOM text writes, layout measurements, forced reflows or scroll/resize handlers.
- Diagnostic coordinate text is throttled independently of gaze rendering.
- Moving gradient coordinates and procedural SVG turbulence were removed from the hot path.
- Layer promotion is limited to the head, iris, nose shadow and stage atmosphere; static facial features are not marked `will-change`.
- The cartoon and pixel modes disable stage perspective and flatten nested 3D contexts; full `preserve-3d` depth is reserved for hyper mode.
- Pixel mode avoids filtering the complete face subtree; the offset silhouette is drawn by the separate back-volume layer.
- Button press feedback uses immediate active-state transforms and opacity. Mode changes use a short opacity transition.
- The Web Animations API drives mouth response without a synchronous layout flush.
- No web worker, debounce pipeline or background queue is added: the app has no heavy data operations that would justify their messaging and scheduling overhead.
