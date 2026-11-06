# Living Face

A frameworkless, CSS-built portrait study. The face is assembled from semantic DOM layers; its expression, gaze, material and lighting respond to input without canvas, a rendering library, external image assets or runtime dependencies.

## Visual systems

- **Ink / Vector** — a warm comic portrait with outlined facial planes, layered cel shading, graphic eyelids and deliberately drawn lip geometry.
- **Pixel / 16-bit** — stepped silhouette geometry, block-built facial features, quantized gaze and a fixed pixel-grid overlay.
- **Volume / 3D** — nested perspective planes, volumetric radial lighting, layered facial relief and a pointer-sensitive cast shadow beneath the nose.

All three systems reuse the same facial structure. Mode changes are CSS-driven through `body[data-mode]`.

## Interaction

- Move the pointer to steer the gaze and shift the face's directional light.
- Select a material in the mode strip, or use **1**, **2** and **3**.
- Click the portrait, or focus it and press **Enter** / **Space**, to trigger a short mouth response.
- Use **Recenter Gaze** to return the portrait to its neutral orientation.
- Automatic blinking pauses when the page is hidden and respects reduced-motion preferences.

The JavaScript writes normalized viewport coordinates to `--mouse-x` and `--mouse-y` in the **-1 to 1** range. It separately writes pixel-valued `--gaze-x` and `--gaze-y` offsets so the CSS can move the iris without reading layout on every frame. Pointer updates are batched with `requestAnimationFrame`.

## Structure

- `index.html` — semantic page shell and detailed facial DOM: brows, sockets, eyeballs, iris rings, pupils, highlights, independent eyelids, nose structures, philtrum and mouth cavity.
- `style.css` — shared anatomy, three complete material systems, expression states, motion, and responsive layout.
- `app.js` — pointer normalization, mode selection, keyboard interaction, blinking and expression state.

## Run locally

Open `index.html` in a modern browser. No install or build step is required.
