# ShaderForgeLab 🧪✨

> Local-first interactive GLSL shader playground and creative experimentation instrument.

---

## Overview

ShaderForgeLab is a high-performance, local-first interactive WebGL2 shader environment designed as a creative instrument for real-time generative graphics, mathematical shaders, and live visual prototyping.

---

## 6 Visually Distinct Presets

Each preset features a completely unique shader algorithm, mathematical foundation, and visual identity:

1. **Cosmic Nebula** (`preset-cosmic-nebula`):
   - *Visual*: Turbulent interstellar gas filaments with stellar core illumination and twinkling star dust.
   - *Math*: Domain-warped fractional Brownian motion (fBm) with rotational octave matrices.
2. **Fluid Distortion** (`preset-fluid-distortion`):
   - *Visual*: Viscous liquid interference with caustic highlights and chromatic aberration (RGB split).
   - *Math*: Multi-frequency vortex swirl, domain deformation, and specular caustic highlights.
3. **Neon Cyber Grid** (`preset-cyber-grid`):
   - *Visual*: Retro-futuristic 3D perspective synthwave highway rushing into a neon scanline sun.
   - *Math*: Perspective ray-plane ground projection (`y < 0`) with antialiased grid lines and distance fog.
4. **Borealis Aurora** (`preset-flowing-aurora`):
   - *Visual*: Luminous atmospheric curtains of northern lights shimmering across a night sky.
   - *Math*: Multi-layered sine wave curtains with vertical ray noise striations and spectral gradient emission.
5. **Fractal Julia Orbit** (`preset-fractal-orbit`):
   - *Visual*: Hypnotic kaleidoscopic Julia set fractal zooming and morphing with orbit trap color spectrums.
   - *Math*: Iterated complex polynomial mapping ($z = z^2 + c$) with orbit trap distance coloring.
6. **Black Hole Lensing** (`preset-gravitational-lensing`):
   - *Visual*: Relativistic gravitational lensing event horizon with a Doppler-beamed glowing accretion disk.
   - *Math*: Curved photon geodesic stepping, Schwarzschild event horizon radius, and relativistic beaming.

---

## Creative Instrument Controls

- **Code Editor**: CodeMirror 6 with full GLSL/C++ syntax highlighting, line numbers gutter, and inline error squigglies.
- **GLSL Snippets Drawer**: 1-click insertion of reusable algorithms:
  - 2D Rotation Matrix (`rot2d`)
  - Smooth Minimum SDF Blend (`smin`)
  - 2D Value Noise (`value_noise`)
  - Cosine Palette Generator (`palette`)
  - Reinhard Tonemapping (`tonemap`)
- **Interactive Uniform Parameters**:
  - `u_color`: Base color tint (Hex / RGB color picker)
  - `u_scale`: Spatial scale & pattern frequency slider
  - `u_intensity`: Luminance & glow power slider
  - `u_speed`: Temporal progression multiplier slider
  - *Individual & Global Reset*: One-click reset to defaults.
- **Transport Bar**:
  - Pause / Resume animation loop (stops GPU rendering to save battery when paused or backgrounded).
  - Reset Time (`u_time = 0.0`).
- **Export Ecosystem**:
  - **Snapshot**: Capture full-resolution PNG screenshot of the current canvas.
  - **Export HTML**: Export standalone, zero-dependency offline HTML file runnable in any browser.
- **Shadertoy Compatibility**:
  - Supports both `u_*` and `i*` uniforms: `iTime`, `iResolution`, `iMouse` (vec4 with click/drag tracking), `iFrame`, `iTimeDelta`.

---

## Personal Shader Library & Portability

- **Curated Gallery**: Discovery area for the 6 built-in mathematical presets with category filters (`Cosmic`, `Fluid`, `Cyberpunk`, `Atmospheric`, `Fractal`, `Astrophysics`) and tags.
- **Local-First Experiment Persistence**:
  - Save named experiments with custom descriptions, tags, and category.
  - Zero cloud, zero database, zero telemetry: persists in client-side `localStorage` with versioned schema (`schemaVersion: 1`).
  - Survives page reload and browser restarts.
- **Experiment Management**:
  - **Restore / Load**: 1-click restore reproducing the exact shader code, uniform values, and renderer state.
  - **Duplicate**: Create an independent clone with a new ID and timestamp (`(Copy)`).
  - **Rename**: Rename title in-place with instant validation.
  - **Safe Delete**: Destructive actions require modal confirmation. Never deletes silently.
  - **Non-Silent Overwriting**: Modal provides explicit choice between updating an active experiment or saving as a new copy.
- **JSON Portability & Sharing**:
  - **Export Single Experiment**: Generates `<name>.shader.json` bundle.
  - **Export Full Library**: Generates `shaderforgelab-library-YYYY-MM-DD.json` containing all user experiments.
  - **Import JSON**: File uploader supporting both single files and multi-experiment bundles.
  - **Validation & Collision Safety**: Rejects malformed JSON and unsupported future schema versions. Auto-resolves name/ID collisions by appending `(Imported)` to prevent silent overwrites.
  - **Storage Quota Resilience**: Handles `QuotaExceededError` cleanly with descriptive user guidance.

---

## Setup & Running Locally

### Prerequisites
- Node.js `20.x` or higher (verified on Node `v22.16.0`)
- `npm` `10.x` or higher (verified on npm `10.9.2`)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Navigate to `http://localhost:5180` in any modern browser supporting WebGL2.

### 3. Run Automated Tests
```bash
npm run test
```

### 4. Build for Production
```bash
npm run build
```

---

## Workflow Guide: Prototyping & Portability

1. **Live Shader Prototyping**:
   - Write GLSL ES 3.0 fragment shaders directly in CodeMirror 6 on the left panel.
   - Live compilation is debounced at 350ms; hit `Ctrl+Enter` or `Ctrl+S` to compile immediately.
   - Insert math snippets (rotation, smooth minimum, noise, cosine palettes, tonemapping) from the **Snippets** menu.
2. **Error Recovery**:
   - If GLSL compilation fails, diagnostic squigglies indicate line numbers in the editor, and a floating error banner details the compiler log.
   - The canvas maintains the last successfully rendered frame (`preserveDrawingBuffer`), eliminating screen flicker or blackout.
3. **Experiment Persistence**:
   - Adjust uniforms (`u_scale`, `u_intensity`, `u_speed`, `u_color`) on the right panel.
   - Click **Save to Library** to store your creation in `localStorage`.
   - Revisit experiments in the **My Library** tab anytime. Click **Restore** to reload shader code and uniforms.
4. **Portability & Bundling**:
   - Click the **JSON Export** icon to download single experiment `.shader.json` files or **Export All** for complete backups.
   - Click **Export HTML** on the top header to generate a standalone, offline, single-file HTML executable that runs on any computer without Node.js.
   - Click **Snapshot** to capture high-res PNG images.

---

## Known Limitations

- **WebGL 2.0 Prerequisite**: Requires a modern browser with WebGL2 support (Chrome, Firefox, Safari 15+, Edge). WebGL 1.0 fallbacks are intentionally not implemented to leverage full GLSL ES 3.0 modern syntax.
- **Client GPU Precision**: Precision (`highp float`) and maximum loop unrolling are determined by the host GPU driver.
- **Storage Limits**: Persisted experiments reside in browser `localStorage` (typically ~5MB limit). High-volume experiment libraries should be backed up using the built-in **Export All JSON** feature.
- **Zero Cloud**: There is no remote account, synchronization, or cloud telemetry. All assets remain strictly on your local device.

---

## Third-Party License Inventory

| Package | Version | License | Upstream Origin |
| :--- | :--- | :--- | :--- |
| `react` / `react-dom` | 18.3.1 | MIT | Meta Platforms, Inc. |
| `@codemirror/view` / `@codemirror/state` | 6.x | MIT | Marijn Haverbeke / CodeMirror |
| `@codemirror/lang-cpp` | 6.0.3 | MIT | CodeMirror GLSL/C++ syntax support |
| `@codemirror/lint` | 6.9.7 | MIT | CodeMirror Diagnostics & Linter |
| `lucide-react` | 0.475.0 | ISC | Lucide Project |
| `vite` | 6.0.1 | MIT | Yuxi (Evan) You / Vite contributors |
| `vitest` | 2.1.8 | MIT | Vitest contributors |
| `typescript` | 5.7.2 | Apache-2.0 | Microsoft Corporation |

---

## License & OSS Provenance

This project is released under the [MIT License](LICENSE).

Adapted and inspired by:
- **aurora-shaders** (https://github.com/sergeyhorse1/aurora-shaders) — MIT License.
- **CodeMirror 6** (https://github.com/codemirror/dev) — MIT License.

