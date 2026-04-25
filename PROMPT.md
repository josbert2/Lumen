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

### 🔄 Phase 1 — Visual depth (in progress)

- [ ] **Device frames**: Browser (Safari/Chrome), MacBook, iPhone, iPad, Apple Watch
- [ ] **3D transforms**: 30+ presets (isometric, tilt, orbit, breathe) using CSS `perspective` + `rotateX/Y/Z`
- [ ] More background palettes: Glass, Cosmic, Mystic (from shots.so)
- [ ] Background blur + noise filters
- [ ] Solid color picker integrated into Solid section

### 📋 Phase 2 — Pro tools

- [ ] Undo / redo (state history)
- [ ] Text overlays with custom fonts, shadows, positioning
- [ ] Image overlays (decorative layers, logos)
- [ ] Annotations: arrows, shapes, blur regions
- [ ] Watermark (configurable, branded)
- [ ] IndexedDB drafts (auto-save)
- [ ] Export presets: 1x / 2x / 3x / custom

### 🚀 Phase 3 — Big features (separate effort)

- [ ] Migrate to **React + Zustand + Konva** (multi-layer canvas)
- [ ] Tweet / code snippet import
- [ ] Animation timeline (keyframes, easing, playhead)
- [ ] Video export: MP4 (WebCodecs / FFmpeg WASM), WebM, GIF
- [ ] "Magic" background: extract dominant colors from uploaded image (differentiator vs screenshot-studio)
- [ ] Unsplash integration for backgrounds

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
