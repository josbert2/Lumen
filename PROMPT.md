# Lumen — Beautiful Screenshots

> Browser-based screenshot & mockup editor inspired by [shots.so](https://shots.so) and [screenshot-studio](https://github.com/jackbutcher/screenshot-studio).
> 100% client-side. No signup. No watermarks. No backend.

---

## What is Lumen?

Lumen turns plain screenshots into polished marketing-ready images:

1. **Drop or paste** an image
2. Wrap it in a **device frame** (Browser, MacBook, iPhone, …) or just a clean rounded card
3. Set a **background** — solid color, gradient, glass, cosmic, or upload your own
4. Tweak **padding, radius, shadow, zoom, rotation, 3D tilt**
5. **Export PNG** at the real resolution

All in the browser. Nothing leaves the user's machine.

---

## Stack

- **Vite** + **vanilla TypeScript** (no React for now — keeps it simple and fast)
- **TailwindCSS v3** for the editor UI
- **html-to-image** for PNG export
- Future: Konva / Zustand / FFmpeg WASM if/when we add layers, undo, or video export

---

## Roadmap

### ✅ Phase 0 — MVP (done)

- [x] Drop / paste / click-to-upload image
- [x] 5 aspect ratio presets (4:3, 16:9, 1:1, 9:16, 3:2)
- [x] Backgrounds: transparent, solid (10 swatches + picker), gradient (10 presets)
- [x] Padding, border-radius, shadow controls
- [x] Zoom + rotation
- [x] 4 layout presets (center, tilt L, tilt R, zoom out)
- [x] PNG export at real resolution
- [x] Start Over reset

### ✅ Phase 1 — Visual depth (done)

- [x] **Device frames**: Browser (Safari, Chrome, Dark), MacBook, iPhone, iPad
- [x] **3D transforms**: 12 presets (flat, tilt, isometric, orbit, spin, drift, card, deep…) using CSS `perspective` + `rotateX/Y/Z`
- [x] More background palettes: Glass, Cosmic, Mystic
- [ ] Background blur + noise filters
- [x] Solid color picker integrated into Solid section
- [x] More aspect ratios: Twitter, Story

### ✅ Phase 2 — Pro tools (done)

- [x] Undo / redo (state history with transaction batching for sliders)
- [x] Text overlays: text, font, weight, size, color, rotation, shadow — draggable
- [x] Image overlays: upload + drag + resize + rotate
- [x] Layer panel: list, select, delete (or `Delete` key)
- [x] Watermark toggle ("Made with Lumen")
- [x] IndexedDB drafts: auto-save 1.5s after change, restore prompt on reload
- [x] Export presets: 1x / 2x / 3x
- [ ] Annotations: arrows, shapes, blur regions (deferred to Phase 3)

### ✅ Phase 3 — Differentiators (done)

- [x] **"Magic" background**: extract dominant colors from uploaded image (Gradient + Mesh modes)
- [x] **Annotations**: arrow + rectangle, drawable on canvas
- [x] **Blur regions**: backdrop-filter rectangles for hiding sensitive info
- [x] **Freehand pen**: SVG polyline drawing tool
- [x] **Background noise / grain**: SVG turbulence overlay with mix-blend-mode

### ✅ Phase 4 — Animation + Video (done, vanilla)

- [x] Animation engine with 8 presets (Spin Y, Tilt Loop, Zoom In, Pulse, Bounce, Iso Orbit, Drift In, None)
- [x] 5 easing functions (linear, easeIn, easeOut, easeInOut, easeInOutCubic)
- [x] Live preview with `requestAnimationFrame` + render-time overrides (no state pollution)
- [x] Play / pause / stop / loop controls
- [x] **GIF export** at 20fps via `gifenc` (no FFmpeg WASM needed)
- [x] Progress bar during render
- [x] Auto-cap dimensions to 720px max for reasonable file size

### 🔄 Phase 5 — Polish & extras (in progress)

- [x] **MP4 export via WebCodecs + mp4-muxer** (no FFmpeg WASM needed)
  - 4 quality tiers (2 / 5 / 10 / 20 Mbps), 3 fps tiers (20 / 30 / 60)
  - Auto-cap to 1280px max, even-dimension enforcement for H.264
  - Codec auto-picked by resolution (H.264 levels 3.0 → 5.0)
  - Feature-detected: shows fallback message if browser lacks WebCodecs
- [x] **WebM export** (VP9 via webm-muxer) — better Firefox support
- [x] **Stage "Animate" button** — pill at center-bottom of stage like shots.so
- [x] **Space key shortcut** — toggle play/pause (when not focused in inputs)
- [ ] Custom keyframe editor (vs. baked presets)
- [ ] Tweet / code snippet import
- [ ] Unsplash integration for backgrounds
- [ ] Migrate to React + Zustand + Konva (only if codebase becomes unwieldy)

---

## Architecture notes

- **State**: single `state` object in `src/main.ts`. All controls mutate it and call `render()`. Will migrate to Zustand-style store when we add undo/redo or layers.
- **Stage rendering**: the `.frame` element stays at *real* export size (e.g. `1920×1440`), but is `transform: scale()`'d down to fit the preview area. On export we briefly remove the scale, capture with `html-to-image`, then restore.
- **Backgrounds**: rendered as plain CSS `background` on the frame. No canvas painting required. This is the trick that makes the project simple — `html-to-image` handles CSS gradients fine.
- **Future device frames**: will be PNG/SVG overlays positioned absolutely above/around the user image, with sizing math per device aspect.

---

## File map

```
lumen/
├── PROMPT.md           ← you are here
├── index.html
├── src/
│   ├── main.ts         ← all app logic + UI render
│   └── style.css       ← Tailwind + custom editor styles
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## Inspirations

- [shots.so](https://shots.so) — the visual target
- [screenshot-studio](https://github.com/jackbutcher/screenshot-studio) — feature reference (Next.js + React + Konva + FFmpeg)
- Picsmaker, Mockuuups, Cleanshot — adjacent space
