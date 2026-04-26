# Lumen — Beautiful Screenshots

> Browser-based screenshot & mockup editor inspired by [shots.so](https://shots.so) and [screenshot-studio](https://github.com/jackbutcher/screenshot-studio).
> 100% client-side. No signup. Optional watermark. No backend.

---

## What it does

Lumen turns plain screenshots into polished marketing-ready images and videos.

1. **Drop, paste, or click-to-upload** an image
2. Wrap it in a **device frame** (Safari · Chrome · Dark · MacBook · iPhone · iPad)
3. Apply a **background**: solid · gradient · glass · cosmic · mystic · or auto-extracted "Magic" palette from your image
4. Tune the **frame**: padding, border radius, shadow, 3D tilt, perspective, noise/grain
5. **Annotate**: arrows, boxes, blur regions for sensitive info, freehand pen, text & image overlays
6. **Animate** with 8 baked presets or a full custom keyframe editor
7. **Export** PNG (1x/2x/3x), GIF, MP4 (H.264), or WebM (VP9)

Everything runs in the browser. Nothing leaves your machine.

---

## Stack

| Layer | Library |
|---|---|
| Build | Vite |
| Language | TypeScript (vanilla — no React) |
| Styling | TailwindCSS v3 + custom CSS |
| Image export | `html-to-image` |
| GIF encoding | `gifenc` |
| MP4 muxing | `mp4-muxer` (uses native WebCodecs `VideoEncoder`) |
| WebM muxing | `webm-muxer` (uses native WebCodecs `VideoEncoder`) |
| Persistence | IndexedDB |

No FFmpeg WASM. No SharedArrayBuffer. No special HTTP headers required. Deploys to any static host.

---

## Features

### Canvas
- 7 aspect ratio presets (4:3, 16:9, 1:1, 9:16, 3:2, Twitter, Story)
- Stage zoom + Z rotation
- 4 layout presets (Center, Tilt L, Tilt R, Zoom out)

### Backgrounds
- Transparent · Solid (10 swatches + picker) · Gradient (10 presets)
- **Glass** (NEW) · **Cosmic** · **Mystic** palettes
- **Magic ✨** — extract dominant colors from your image (Gradient + Mesh modes)
- Noise / film-grain overlay (SVG `<feTurbulence>` + `mix-blend-mode: overlay`)

### Device frames
- Browser: Safari · Chrome · Dark
- MacBook · iPhone · iPad
- Pure CSS — no PNG/SVG assets to ship

### 3D transforms
12 presets: Flat · Tilt L · Tilt R · Lean · Tower · Iso L · Iso R · Orbit · Spin · Drift · Card · Deep

### Overlays & annotations
- Text (font, weight, size, color, shadow, rotation)
- Image overlays (upload, drag, resize, rotate)
- **Arrow** with SVG marker (color, stroke width)
- **Box** with stroke + fill + corner radius
- **Blur region** via `backdrop-filter` — hide passwords/emails
- **Pen** freehand polyline
- All draggable; layer panel with select/delete; `Delete` key removes

### Animation
- 8 baked presets: Spin Y · Tilt Loop · Zoom In · Pulse · Bounce · Iso Orbit · Drift In · None
- 5 easing curves: linear · easeIn · easeOut · easeInOut · easeInOutCubic
- **Custom keyframe editor**:
  - Timeline panel with time ruler + diamond markers
  - Add keyframes at the playhead, drag to reposition, scrub by clicking the track
  - Per-keyframe: time, zoom, Rot Z/X/Y, easing-to-next
  - "Bake from preset…" — start from any baked preset's 9-frame sample
- Live preview with `requestAnimationFrame`
- **Stage Animate button** (pill, center-bottom of canvas)
- **Space** keyboard shortcut for play/pause

### Export
- **PNG**: 1x / 2x / 3x at real resolution
- **GIF**: 20 fps, auto-capped to 720px (via `gifenc`)
- **MP4** (H.264): 4 quality tiers, 20/30/60 fps, auto-capped to 1280px
- **WebM** (VP9): same options as MP4
- Optional **"Made with Lumen"** watermark

### Quality of life
- Undo / redo (`Ctrl/Cmd+Z`, `Ctrl+Shift+Z`, `Ctrl+Y`) with transaction batching for sliders
- Auto-save to IndexedDB 1.5s after any change
- Restore-session toast on reload
- Tabs: **Mockup** · **Frame** · **Overlay** · **Animate**

---

## File map

```
lumen/
├── PROMPT.md            ← you are here
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.ts          ← UI shell, event wiring, render orchestration
    ├── state.ts         ← typed state, history (undo/redo), subscribe pattern
    ├── data.ts          ← static data: aspect ratios, palettes, devices, presets
    ├── devices.ts       ← device frame renderers (Safari/Chrome/MacBook/…)
    ├── overlays.ts      ← overlay rendering (text/image/blur) + drag handlers
    ├── animation.ts     ← presets, easings, keyframe interpolation
    ├── magic.ts         ← palette extraction + Magic gradient/mesh builders
    ├── storage.ts       ← IndexedDB save/load/clear + debounced auto-save
    ├── gif-export.ts    ← GIF encoder loop (gifenc)
    ├── mp4-export.ts    ← H.264 encoder loop (WebCodecs + mp4-muxer)
    ├── webm-export.ts   ← VP9 encoder loop (WebCodecs + webm-muxer)
    ├── gifenc.d.ts      ← types for gifenc (no @types package)
    └── style.css        ← Tailwind directives + editor + timeline + overlay styles
```

~3700 LOC across 11 TypeScript modules.

---

## Architecture notes

**State.** One typed `State` object lives in `src/state.ts`. All mutations go through `update(mutator, commit?)` which optionally pushes a snapshot to a history stack. For continuous interactions (slider drags, keyframe drags), `beginTransaction()` + `commitTransaction()` batch the moves into a single undo entry.

A simple subscribe pattern (`subscribe(cb)`) drives re-renders. The render function reads from `state` and from a module-local `animationOverride` for per-frame animation values — animations don't pollute history.

**Stage rendering.** The `.frame` element stays at *real* export size (e.g. `1920×1440`) but is `transform: scale()` down to fit the preview area. On export we briefly remove the scale, capture, then restore. This keeps export resolution honest at 1x even from a small viewport.

**Backgrounds.** Plain CSS `background` on the frame — gradients, radial blobs, conic, the lot. No canvas painting. `html-to-image` handles CSS gradients fine, which keeps the codebase tiny.

**Animations.** A render-time override (`animationOverride: AnimationOverride | null`) is applied on top of state values. The render path computes:

```
finalTransform = state.transform3d ⊕ override.transform3d
finalZoom      = override.zoom ?? state.zoom
finalRotate    = override.rotate ?? state.rotate
```

For baked presets, the override is `preset.apply(t)`. For custom keyframes, it's `interpolateKeyframes(t * duration, state.keyframes)` which finds the surrounding pair, applies the LEFT keyframe's easing, and lerps each property independently.

**Video export.** Frame-by-frame render-then-encode loop:

1. `setAnimationProgress(t)` updates the override and forces a render
2. `flush()` waits two `rAF` so the DOM settles
3. `toCanvas(frame)` → 2D canvas at the export size
4. `new VideoFrame(canvas, { timestamp })` → WebCodecs `VideoEncoder.encode()`
5. Encoded chunks are pushed into `mp4-muxer` / `webm-muxer`
6. After the loop: `encoder.flush()` + `muxer.finalize()` + `Blob` + download

GIF uses the same loop but encodes frames into `gifenc` instead.

**Why no React/Konva migration?** Originally planned (since `screenshot-studio` uses them) but ultimately not needed. The interpolation, scrubbing, and frame-by-frame export are all pure functions; the DOM-to-canvas capture works with our HTML/SVG layout; the state is small enough that vanilla mutation + subscribe stays clean. The migration is reserved for if the editor grows multi-document or layered-bitmap features.

---

## Browser support

| Feature | Chrome/Edge | Firefox | Safari |
|---|---|---|---|
| Everything except video | ✅ | ✅ | ✅ |
| GIF export | ✅ | ✅ | ✅ |
| MP4 (H.264) | ✅ | 130+ | 16.4+ |
| WebM (VP9) | ✅ | ✅ | 16.4+ |

When `VideoEncoder` is unavailable, the MP4/WebM buttons are disabled and a banner suggests using GIF instead.

---

## Deferred / not building

- **Tweet / code snippet import** — niche
- **Unsplash backgrounds** — needs API key + UI for searching
- **Multi-image grids (1/2/3 columns)** — possible if there's demand
- **React + Zustand + Konva migration** — only if the project grows multi-doc or needs canvas-native primitives
- **Annotation: blur of true underlying pixels** — current `backdrop-filter` blur is fine for `html-to-image`; a true SVG `<feGaussianBlur>` of the underlying region is more code than it's worth

---

## Inspirations

- [shots.so](https://shots.so) — the visual target
- [screenshot-studio](https://github.com/jackbutcher/screenshot-studio) by Jack Butcher — feature reference (Next.js + React + Konva + FFmpeg + Zustand)
- Picsmaker · Mockuuups · Cleanshot — adjacent space
