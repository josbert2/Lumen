import "./style.css";
import { toPng } from "html-to-image";
import {
  ASPECT_RATIOS,
  SOLID_COLORS,
  GRADIENTS,
  GLASS_GRADIENTS,
  COSMIC_GRADIENTS,
  MYSTIC_GRADIENTS,
  DEVICE_FRAMES,
  TRANSFORM_PRESETS,
  LAYOUT_PRESETS,
} from "./data";
import type { DeviceFrameId } from "./data";
import {
  state,
  update,
  undo,
  redo,
  canUndo,
  canRedo,
  beginTransaction,
  commitTransaction,
  newId,
  subscribe,
  initialState,
} from "./state";
import type {
  TextOverlay,
  ImageOverlay,
  ArrowOverlay,
  RectOverlay,
  BlurOverlay,
  PenOverlay,
  Tool,
} from "./state";
import { renderDevice } from "./devices";
import { renderOverlays, attachOverlayDragHandlers } from "./overlays";
import { loadDraft, clearDraft, makeAutoSave } from "./storage";
import { extractPalette, buildMagicGradient, buildMagicMesh, rgbToHex } from "./magic";
import {
  ANIMATION_PRESETS,
  getPresetById,
  type AnimationOverride,
} from "./animation";
import { exportGif } from "./gif-export";
import { exportMp4, isMp4Supported } from "./mp4-export";

// ── Helper: build swatch grid ──────────────────────────────────────────────

function swatchGrid(
  id: string,
  values: string[],
  attr: string,
  startActive = -1,
): string {
  return `
    <div id="${id}" class="grid grid-cols-5 gap-2">
      ${values
        .map(
          (v, i) =>
            `<div class="swatch ${i === startActive ? "active" : ""}" data-${attr}="${i}" style="background:${v}"></div>`,
        )
        .join("")}
    </div>`;
}

// ── HTML Shell ─────────────────────────────────────────────────────────────

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
<div class="flex h-full w-full">
  <aside class="w-72 shrink-0 border-r border-line bg-white scroll-y">
    <div class="p-4 border-b border-line">
      <div class="flex gap-1 p-1 bg-zinc-100 rounded-lg text-xs" id="tabs">
        <button class="tab active" data-tab="mockup">Mockup</button>
        <button class="tab" data-tab="frame">Frame</button>
        <button class="tab" data-tab="overlay">Overlay</button>
        <button class="tab" data-tab="animate">Animate</button>
      </div>
      <div class="section-title">Aspect Ratio</div>
      <select id="aspect" class="w-full text-sm border border-line rounded-lg px-3 py-2 bg-white">
        ${ASPECT_RATIOS.map((a, i) => `<option value="${i}">${a.label}</option>`).join("")}
      </select>
    </div>

    <div class="tab-panel active p-4" data-panel="mockup">
      <div class="section-title">Background</div>
      <div class="flex gap-2 mb-3">
        <button class="btn-secondary btn flex-1 justify-center" data-bg="transparent">None</button>
        <label class="btn-secondary btn flex-1 justify-center cursor-pointer">
          Color
          <input id="colorPicker" type="color" class="hidden" value="#ffffff" />
        </label>
      </div>

      <div class="text-xs font-medium text-zinc-700 mb-2 mt-3 flex items-center justify-between">
        <span>Magic ✨</span>
        <span class="text-[10px] text-zinc-400">from your image</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button id="magicGradient" class="btn btn-secondary justify-center text-xs" disabled>Gradient</button>
        <button id="magicMesh" class="btn btn-secondary justify-center text-xs" disabled>Mesh</button>
      </div>
      <div id="magicPalette" class="flex gap-1 mt-2 h-5 hidden"></div>

      <div class="section-title">Effects</div>
      <label class="text-xs text-zinc-500 flex items-center justify-between">
        <span>Noise / grain</span><span id="bgNoiseVal">0%</span>
      </label>
      <input id="bgNoise" type="range" min="0" max="100" value="0" />

      <div class="text-xs font-medium text-zinc-700 mb-2">Solid</div>
      ${swatchGrid("solidSwatches", SOLID_COLORS, "solid")}

      <div class="text-xs font-medium text-zinc-700 mb-2 mt-4">Gradient</div>
      ${swatchGrid("gradientSwatches", GRADIENTS, "gradient", 0)}

      <div class="text-xs font-medium text-zinc-700 mb-2 mt-4">Glass <span class="text-[10px] text-pink-500 ml-1">NEW</span></div>
      ${swatchGrid("glassSwatches", GLASS_GRADIENTS, "glass")}

      <div class="text-xs font-medium text-zinc-700 mb-2 mt-4">Cosmic</div>
      ${swatchGrid("cosmicSwatches", COSMIC_GRADIENTS, "cosmic")}

      <div class="text-xs font-medium text-zinc-700 mb-2 mt-4">Mystic</div>
      ${swatchGrid("mysticSwatches", MYSTIC_GRADIENTS, "mystic")}
    </div>

    <div class="tab-panel p-4" data-panel="frame">
      <div class="section-title">Device</div>
      <div class="grid grid-cols-3 gap-2" id="devicePicker">
        ${DEVICE_FRAMES.map(
          (d) =>
            `<button class="device-btn ${d.id === state.device ? "active" : ""}" data-device="${d.id}">${d.label}</button>`,
        ).join("")}
      </div>

      <div class="section-title">3D Transform</div>
      <div class="grid grid-cols-3 gap-2" id="transformPicker">
        ${TRANSFORM_PRESETS.map(
          (t, i) =>
            `<button class="preset-btn ${i === 0 ? "active" : ""}" data-transform="${i}">${t.label}</button>`,
        ).join("")}
      </div>

      <div class="section-title">Frame</div>
      <label class="text-xs text-zinc-500 flex items-center justify-between mt-2">
        <span>Padding</span><span id="paddingVal">${state.padding}px</span>
      </label>
      <input id="padding" type="range" min="0" max="240" value="${state.padding}" />

      <label class="text-xs text-zinc-500 flex items-center justify-between mt-3">
        <span>Border radius</span><span id="radiusVal">${state.radius}px</span>
      </label>
      <input id="radius" type="range" min="0" max="80" value="${state.radius}" />

      <label class="text-xs text-zinc-500 flex items-center justify-between mt-3">
        <span>Shadow</span><span id="shadowVal">${state.shadow}</span>
      </label>
      <input id="shadow" type="range" min="0" max="100" value="${state.shadow}" />

      <div class="section-title">Watermark</div>
      <label class="flex items-center gap-2 text-sm cursor-pointer">
        <input id="watermarkToggle" type="checkbox" class="w-4 h-4" />
        Show "Made with Lumen"
      </label>
    </div>

    <div class="tab-panel p-4" data-panel="overlay">
      <div class="section-title">Tool</div>
      <div class="grid grid-cols-3 gap-2" id="toolPalette">
        <button class="device-btn active" data-tool="select">Select</button>
        <button class="device-btn" data-tool="arrow">↗ Arrow</button>
        <button class="device-btn" data-tool="rect">▭ Box</button>
        <button class="device-btn" data-tool="pen">✎ Pen</button>
        <button class="device-btn" data-tool="blur">◯ Blur</button>
      </div>
      <div class="text-xs text-zinc-500 mt-2">Pick a tool, then drag on the canvas to draw.</div>

      <div class="section-title">Add Layer</div>
      <div class="grid grid-cols-2 gap-2">
        <button class="btn btn-secondary justify-center" id="addText">+ Text</button>
        <button class="btn btn-secondary justify-center" id="addImage">+ Image</button>
      </div>

      <div class="section-title">Layers</div>
      <div id="layersList" class="space-y-1 text-sm"></div>

      <div id="overlayProps"></div>
    </div>

    <div class="tab-panel p-4" data-panel="animate">
      <div class="section-title">Preset</div>
      <div class="grid grid-cols-2 gap-2" id="animPresets">
        ${ANIMATION_PRESETS.map(
          (p) =>
            `<button class="device-btn ${p.id === state.animationPresetId ? "active" : ""}" data-anim="${p.id}">${p.label}</button>`,
        ).join("")}
      </div>

      <div class="section-title">Timing</div>
      <label class="text-xs text-zinc-500 flex items-center justify-between">
        <span>Duration</span><span id="animDurVal">${state.animationDuration}s</span>
      </label>
      <input id="animDuration" type="range" min="1" max="10" step="0.5" value="${state.animationDuration}" />

      <label class="flex items-center gap-2 text-sm cursor-pointer mt-3">
        <input id="animLoop" type="checkbox" class="w-4 h-4" ${state.animationLoop ? "checked" : ""} />
        Loop preview
      </label>

      <div class="section-title">Playback</div>
      <div class="grid grid-cols-2 gap-2">
        <button id="animPlay" class="btn justify-center">▶ Play</button>
        <button id="animStop" class="btn btn-secondary justify-center">■ Stop</button>
      </div>

      <div class="section-title">Export</div>
      <div class="grid grid-cols-2 gap-2">
        <button id="exportGif" class="btn btn-secondary justify-center">GIF</button>
        <button id="exportMp4" class="btn justify-center">MP4</button>
      </div>

      <label class="text-xs text-zinc-500 flex items-center justify-between mt-3">
        <span>Quality (MP4)</span>
        <select id="mp4Bitrate" class="text-xs bg-white border border-zinc-200 rounded px-2 py-0.5">
          <option value="2000000">Low · 2 Mbps</option>
          <option value="5000000" selected>Medium · 5 Mbps</option>
          <option value="10000000">High · 10 Mbps</option>
          <option value="20000000">Ultra · 20 Mbps</option>
        </select>
      </label>
      <label class="text-xs text-zinc-500 flex items-center justify-between mt-2">
        <span>FPS</span>
        <select id="videoFps" class="text-xs bg-white border border-zinc-200 rounded px-2 py-0.5">
          <option value="20">20</option>
          <option value="30" selected>30</option>
          <option value="60">60</option>
        </select>
      </label>

      <div id="mp4Unsupported" class="text-xs text-amber-600 mt-2 hidden">
        WebCodecs not available in this browser — use GIF or try Chrome.
      </div>

      <div id="videoProgress" class="mt-3 hidden">
        <div class="h-2 bg-zinc-100 rounded overflow-hidden">
          <div id="videoProgressBar" class="h-full bg-zinc-900 transition-all" style="width:0%"></div>
        </div>
        <div id="videoProgressLabel" class="text-xs text-zinc-500 mt-1">0%</div>
      </div>
    </div>
  </aside>

  <main class="flex-1 flex flex-col">
    <header class="h-14 border-b border-line flex items-center justify-between px-4 bg-white">
      <div class="flex items-center gap-3">
        <div class="font-semibold text-sm tracking-tight">✦ Lumen</div>
        <div class="flex items-center gap-1">
          <button id="undoBtn" class="icon-btn" title="Undo (Ctrl+Z)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          </button>
          <button id="redoBtn" class="icon-btn" title="Redo (Ctrl+Shift+Z)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
          </button>
        </div>
        <button id="reset" class="btn btn-secondary">Start Over</button>
      </div>
      <div class="flex items-center gap-2">
        <div class="export-group">
          <button id="export" class="btn">↑ Export PNG</button>
          <select id="exportScale" title="Resolution multiplier">
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="3">3x</option>
          </select>
        </div>
      </div>
    </header>

    <div class="flex-1 stage" id="stage">
      <div id="frameWrap" style="position:relative;">
        <div class="frame" id="frame"></div>
      </div>
    </div>
  </main>

  <aside class="w-64 shrink-0 border-l border-line bg-white scroll-y p-4">
    <div class="section-title">Layout Presets</div>
    <div class="grid grid-cols-2 gap-2" id="layoutPresets">
      ${LAYOUT_PRESETS.map(
        (p) => `<button class="preset-btn" data-preset="${p.id}">${p.label}</button>`,
      ).join("")}
    </div>

    <div class="section-title">Stage Zoom</div>
    <label class="text-xs text-zinc-500 flex items-center justify-between">
      <span>Scale</span><span id="zoomVal">100%</span>
    </label>
    <input id="zoom" type="range" min="40" max="120" value="100" />

    <div class="section-title">Z Rotation</div>
    <label class="text-xs text-zinc-500 flex items-center justify-between">
      <span>Tilt</span><span id="rotateVal">0°</span>
    </label>
    <input id="rotate" type="range" min="-30" max="30" value="0" />
  </aside>
</div>
`;

// ── References ─────────────────────────────────────────────────────────────

const frame = document.getElementById("frame") as HTMLDivElement;
const frameWrap = document.getElementById("frameWrap") as HTMLDivElement;
const stage = document.getElementById("stage") as HTMLDivElement;
const aspectSelect = document.getElementById("aspect") as HTMLSelectElement;

// Track preview scale for drag math
let currentStageScale = 1;

// Live animation override applied at render time (does not pollute state/history)
let animationOverride: AnimationOverride | null = null;

// ── Render ─────────────────────────────────────────────────────────────────

function render() {
  const ratio = ASPECT_RATIOS[state.aspectIdx];

  const stageRect = stage.getBoundingClientRect();
  const maxW = stageRect.width - 64;
  const maxH = stageRect.height - 64;
  const scale = Math.min(maxW / ratio.w, maxH / ratio.h, 1);
  currentStageScale = scale;

  frameWrap.style.width = `${ratio.w * scale}px`;
  frameWrap.style.height = `${ratio.h * scale}px`;

  frame.style.width = `${ratio.w}px`;
  frame.style.height = `${ratio.h}px`;
  frame.style.transformOrigin = "top left";
  frame.style.transform = `scale(${scale})`;
  frame.style.padding = `${state.padding}px`;
  frame.style.perspective = `${state.transform3d.perspective}px`;

  if (state.background.kind === "transparent") {
    frame.style.background = "transparent";
  } else {
    frame.style.background = state.background.value;
  }

  const shadowStrength = state.shadow / 100;
  const shadowCss =
    state.shadow > 0
      ? `0 ${20 + state.shadow / 2}px ${40 + state.shadow}px rgba(0,0,0,${
          0.15 + shadowStrength * 0.3
        })`
      : "none";

  // Apply live animation overrides on top of base state values
  const t = animationOverride?.transform3d ?? state.transform3d;
  const liveZoom = animationOverride?.zoom ?? state.zoom;
  const liveRotate = animationOverride?.rotate ?? state.rotate;
  const innerTransform = `rotateX(${t.rx}deg) rotateY(${t.ry}deg) rotateZ(${
    t.rz + liveRotate
  }deg) scale(${liveZoom})`;

  const innerStyle = `
    border-radius:${state.radius}px;
    box-shadow:${shadowCss};
    transform:${innerTransform};
    transform-style:preserve-3d;
  `;

  let body = "";
  if (state.bgNoise > 0) {
    body += `<div class="frame-noise" style="opacity:${state.bgNoise}"></div>`;
  }
  if (state.imageSrc) {
    body += renderDevice(state.device, state.imageSrc, innerStyle);
  } else {
    body += `
      <div class="placeholder" style="border-radius:${state.radius}px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>
        <div>Drop or Paste</div>
        <div class="text-sm font-normal text-zinc-400">Images & Videos</div>
      </div>`;
  }

  body += renderOverlays(state);

  if (state.watermark) {
    body += `<div class="watermark">✦ Made with Lumen</div>`;
  }

  frame.innerHTML = body;

  // Drawing-mode cursor on frame
  if (state.tool !== "select") frame.classList.add("drawing");
  else frame.classList.remove("drawing");

  renderUndoRedo();
  renderLayersList();
  renderOverlayProps();
  renderToolPalette();
  renderMagicState();
}

function renderToolPalette() {
  document.querySelectorAll("#toolPalette [data-tool]").forEach((b) => {
    const isActive = (b as HTMLElement).dataset.tool === state.tool;
    b.classList.toggle("active", isActive);
  });
}

let lastPalette: ReturnType<typeof rgbToHex>[] = [];
async function refreshMagicPalette() {
  const gradBtn = document.getElementById("magicGradient") as HTMLButtonElement;
  const meshBtn = document.getElementById("magicMesh") as HTMLButtonElement;
  const paletteEl = document.getElementById("magicPalette")!;
  if (!state.imageSrc) {
    gradBtn.disabled = true;
    meshBtn.disabled = true;
    paletteEl.classList.add("hidden");
    return;
  }
  try {
    const palette = await extractPalette(state.imageSrc, 5);
    lastPalette = palette.map(rgbToHex);
    gradBtn.disabled = false;
    meshBtn.disabled = false;
    paletteEl.classList.remove("hidden");
    paletteEl.innerHTML = lastPalette
      .map((c) => `<div class="flex-1 rounded" style="background:${c}"></div>`)
      .join("");
  } catch (err) {
    console.warn("[magic] failed", err);
  }
}

function renderMagicState() {
  // Just keeps the buttons enabled/disabled in sync with image presence
  const gradBtn = document.getElementById("magicGradient") as HTMLButtonElement;
  const meshBtn = document.getElementById("magicMesh") as HTMLButtonElement;
  if (gradBtn && meshBtn) {
    if (!state.imageSrc) {
      gradBtn.disabled = true;
      meshBtn.disabled = true;
    }
  }
}

function renderUndoRedo() {
  (document.getElementById("undoBtn") as HTMLButtonElement).disabled = !canUndo();
  (document.getElementById("redoBtn") as HTMLButtonElement).disabled = !canRedo();
}

function renderLayersList() {
  const list = document.getElementById("layersList")!;
  if (state.overlays.length === 0) {
    list.innerHTML = `<div class="text-xs text-zinc-400 italic">No layers yet</div>`;
    return;
  }
  list.innerHTML = state.overlays
    .map((o) => {
      let label = "Layer";
      if (o.type === "text") label = `T · ${o.text.slice(0, 20)}`;
      else if (o.type === "image") label = "🖼 Image";
      else if (o.type === "arrow") label = "↗ Arrow";
      else if (o.type === "rect") label = "▭ Box";
      else if (o.type === "blur") label = "◯ Blur";
      else if (o.type === "pen") label = "✎ Pen";
      const active = o.id === state.selectedOverlayId ? "bg-zinc-100" : "";
      return `
        <div class="flex items-center gap-2 px-2 py-1.5 rounded ${active} hover:bg-zinc-50 cursor-pointer" data-layer-id="${o.id}">
          <span class="text-xs flex-1 truncate">${label}</span>
          <button class="text-zinc-400 hover:text-red-500 text-xs" data-remove-layer="${o.id}">✕</button>
        </div>`;
    })
    .join("");
}

function renderOverlayProps() {
  const container = document.getElementById("overlayProps")!;
  const overlay = state.overlays.find((o) => o.id === state.selectedOverlayId);
  if (!overlay) {
    container.innerHTML = "";
    return;
  }
  if (overlay.type === "text") {
    container.innerHTML = `
      <div class="props-panel">
        <label>Text</label>
        <input id="propText" type="text" value="${overlay.text.replace(/"/g, "&quot;")}" />
        <div class="row-2">
          <div>
            <label>Size</label>
            <input id="propSize" type="number" min="8" max="400" value="${overlay.fontSize}" class="w-full text-sm border border-zinc-200 rounded px-2 py-1" />
          </div>
          <div>
            <label>Weight</label>
            <select id="propWeight" class="w-full text-sm border border-zinc-200 rounded px-2 py-1">
              ${[300, 400, 500, 600, 700, 800, 900]
                .map(
                  (w) =>
                    `<option value="${w}" ${w === overlay.fontWeight ? "selected" : ""}>${w}</option>`,
                )
                .join("")}
            </select>
          </div>
        </div>
        <label>Font</label>
        <select id="propFont" class="w-full text-sm border border-zinc-200 rounded px-2 py-1">
          ${[
            "system-ui, sans-serif",
            "Georgia, serif",
            "'Courier New', monospace",
            "'Arial Black', sans-serif",
            "'Helvetica Neue', sans-serif",
          ]
            .map(
              (f) =>
                `<option value="${f}" ${f === overlay.fontFamily ? "selected" : ""}>${f.split(",")[0].replace(/'/g, "")}</option>`,
            )
            .join("")}
        </select>
        <div class="row-2">
          <div>
            <label>Color</label>
            <input id="propColor" type="color" class="color-input" value="${overlay.color}" />
          </div>
          <div>
            <label>Rotation</label>
            <input id="propRot" type="number" min="-180" max="180" value="${overlay.rotation}" class="w-full text-sm border border-zinc-200 rounded px-2 py-1" />
          </div>
        </div>
        <label class="flex items-center gap-2 mt-2">
          <input id="propShadow" type="checkbox" ${overlay.shadow ? "checked" : ""} /> Drop shadow
        </label>
      </div>`;
    bindTextProps(overlay);
  } else if (overlay.type === "image") {
    container.innerHTML = `
      <div class="props-panel">
        <label>Width</label>
        <input id="propWidth" type="range" min="5" max="80" value="${overlay.width}" />
        <label>Rotation</label>
        <input id="propRot" type="number" min="-180" max="180" value="${overlay.rotation}" class="w-full text-sm border border-zinc-200 rounded px-2 py-1" />
      </div>`;
    bindImageProps(overlay);
  } else if (overlay.type === "arrow") {
    container.innerHTML = `
      <div class="props-panel">
        <div class="row-2">
          <div>
            <label>Color</label>
            <input id="propColor" type="color" class="color-input" value="${overlay.color}" />
          </div>
          <div>
            <label>Stroke</label>
            <input id="propStroke" type="number" step="0.1" min="0.2" max="3" value="${overlay.strokeWidth}" class="w-full text-sm border border-zinc-200 rounded px-2 py-1" />
          </div>
        </div>
      </div>`;
    bindArrowProps(overlay);
  } else if (overlay.type === "rect") {
    container.innerHTML = `
      <div class="props-panel">
        <div class="row-2">
          <div>
            <label>Stroke</label>
            <input id="propColor" type="color" class="color-input" value="${overlay.color}" />
          </div>
          <div>
            <label>Stroke W</label>
            <input id="propStroke" type="number" step="0.1" min="0.2" max="3" value="${overlay.strokeWidth}" class="w-full text-sm border border-zinc-200 rounded px-2 py-1" />
          </div>
        </div>
        <div class="row-2">
          <div>
            <label>Fill</label>
            <input id="propFill" type="text" value="${overlay.fill}" class="w-full text-sm border border-zinc-200 rounded px-2 py-1" placeholder="rgba(...) or transparent"/>
          </div>
          <div>
            <label>Radius</label>
            <input id="propRadius" type="number" min="0" max="20" value="${overlay.radius}" class="w-full text-sm border border-zinc-200 rounded px-2 py-1" />
          </div>
        </div>
      </div>`;
    bindRectProps(overlay);
  } else if (overlay.type === "blur") {
    container.innerHTML = `
      <div class="props-panel">
        <label>Blur amount</label>
        <input id="propAmount" type="range" min="2" max="60" value="${overlay.amount}" />
        <label>Corner radius</label>
        <input id="propRadius" type="number" min="0" max="80" value="${overlay.radius}" class="w-full text-sm border border-zinc-200 rounded px-2 py-1" />
      </div>`;
    bindBlurProps(overlay);
  } else if (overlay.type === "pen") {
    container.innerHTML = `
      <div class="props-panel">
        <div class="row-2">
          <div>
            <label>Color</label>
            <input id="propColor" type="color" class="color-input" value="${overlay.color}" />
          </div>
          <div>
            <label>Stroke W</label>
            <input id="propStroke" type="number" step="0.1" min="0.2" max="3" value="${overlay.strokeWidth}" class="w-full text-sm border border-zinc-200 rounded px-2 py-1" />
          </div>
        </div>
      </div>`;
    bindPenProps(overlay);
  }
}

function bindBlurProps(o: BlurOverlay) {
  const amount = document.getElementById("propAmount") as HTMLInputElement;
  amount.addEventListener("mousedown", () => beginTransaction());
  amount.addEventListener("input", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as BlurOverlay;
      cur.amount = parseInt(amount.value, 10);
    }, false);
  });
  amount.addEventListener("change", () => commitTransaction());
  const radius = document.getElementById("propRadius") as HTMLInputElement;
  radius.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as BlurOverlay;
      cur.radius = parseInt(radius.value, 10);
    });
  });
}

function bindPenProps(o: PenOverlay) {
  const color = document.getElementById("propColor") as HTMLInputElement;
  color.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as PenOverlay;
      cur.color = color.value;
    });
  });
  const stroke = document.getElementById("propStroke") as HTMLInputElement;
  stroke.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as PenOverlay;
      cur.strokeWidth = parseFloat(stroke.value);
    });
  });
}

function bindArrowProps(o: ArrowOverlay) {
  const color = document.getElementById("propColor") as HTMLInputElement;
  color.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as ArrowOverlay;
      cur.color = color.value;
    });
  });
  const stroke = document.getElementById("propStroke") as HTMLInputElement;
  stroke.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as ArrowOverlay;
      cur.strokeWidth = parseFloat(stroke.value);
    });
  });
}

function bindRectProps(o: RectOverlay) {
  const color = document.getElementById("propColor") as HTMLInputElement;
  color.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as RectOverlay;
      cur.color = color.value;
    });
  });
  const stroke = document.getElementById("propStroke") as HTMLInputElement;
  stroke.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as RectOverlay;
      cur.strokeWidth = parseFloat(stroke.value);
    });
  });
  const fill = document.getElementById("propFill") as HTMLInputElement;
  fill.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as RectOverlay;
      cur.fill = fill.value;
    });
  });
  const radius = document.getElementById("propRadius") as HTMLInputElement;
  radius.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as RectOverlay;
      cur.radius = parseFloat(radius.value);
    });
  });
}

function bindTextProps(o: TextOverlay) {
  const text = document.getElementById("propText") as HTMLInputElement;
  text.addEventListener("input", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as TextOverlay;
      cur.text = text.value;
    }, false);
  });
  text.addEventListener("change", () => commitTransaction());
  text.addEventListener("focus", () => beginTransaction());

  const size = document.getElementById("propSize") as HTMLInputElement;
  size.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as TextOverlay;
      cur.fontSize = parseInt(size.value, 10);
    });
  });

  const weight = document.getElementById("propWeight") as HTMLSelectElement;
  weight.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as TextOverlay;
      cur.fontWeight = parseInt(weight.value, 10);
    });
  });

  const font = document.getElementById("propFont") as HTMLSelectElement;
  font.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as TextOverlay;
      cur.fontFamily = font.value;
    });
  });

  const color = document.getElementById("propColor") as HTMLInputElement;
  color.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as TextOverlay;
      cur.color = color.value;
    });
  });

  const rot = document.getElementById("propRot") as HTMLInputElement;
  rot.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as TextOverlay;
      cur.rotation = parseInt(rot.value, 10);
    });
  });

  const shadow = document.getElementById("propShadow") as HTMLInputElement;
  shadow.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as TextOverlay;
      cur.shadow = shadow.checked;
    });
  });
}

function bindImageProps(o: ImageOverlay) {
  const width = document.getElementById("propWidth") as HTMLInputElement;
  width.addEventListener("input", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as ImageOverlay;
      cur.width = parseInt(width.value, 10);
    }, false);
  });
  width.addEventListener("change", () => commitTransaction());
  width.addEventListener("mousedown", () => beginTransaction());

  const rot = document.getElementById("propRot") as HTMLInputElement;
  rot.addEventListener("change", () => {
    update((s) => {
      const cur = s.overlays.find((x) => x.id === o.id) as ImageOverlay;
      cur.rotation = parseInt(rot.value, 10);
    });
  });
}

// ── Image loading ──────────────────────────────────────────────────────────

function loadMainImage(file: File) {
  if (!file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    update((s) => {
      s.imageSrc = e.target?.result as string;
    });
  };
  reader.readAsDataURL(file);
}

stage.addEventListener("dragover", (e) => {
  e.preventDefault();
  stage.style.outline = "2px dashed #3b82f6";
});
stage.addEventListener("dragleave", () => {
  stage.style.outline = "";
});
stage.addEventListener("drop", (e) => {
  e.preventDefault();
  stage.style.outline = "";
  const file = e.dataTransfer?.files?.[0];
  if (file) loadMainImage(file);
});
window.addEventListener("paste", (e) => {
  if ((e.target as HTMLElement).matches("input, textarea")) return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of Array.from(items)) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) loadMainImage(file);
    }
  }
});
frame.addEventListener("click", (e) => {
  // Only trigger upload if clicking the placeholder (no image yet, no overlay)
  if (state.imageSrc) return;
  const target = e.target as HTMLElement;
  if (target.closest("[data-overlay-id]")) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) loadMainImage(file);
  };
  input.click();
});

// ── Controls ───────────────────────────────────────────────────────────────

aspectSelect.addEventListener("change", () => {
  update((s) => {
    s.aspectIdx = parseInt(aspectSelect.value, 10);
  });
});

function bindRange(id: string, key: keyof typeof state, suffix = "px") {
  const input = document.getElementById(id) as HTMLInputElement;
  const valEl = document.getElementById(`${id}Val`);
  input.addEventListener("mousedown", () => beginTransaction());
  input.addEventListener("input", () => {
    update(
      (s) => {
        (s as any)[key] = parseInt(input.value, 10);
      },
      false,
    );
    if (valEl) valEl.textContent = `${input.value}${suffix}`;
  });
  input.addEventListener("change", () => commitTransaction());
}
bindRange("padding", "padding");
bindRange("radius", "radius");
bindRange("shadow", "shadow", "");
bindRange("rotate", "rotate", "°");

const bgNoiseInput = document.getElementById("bgNoise") as HTMLInputElement;
const bgNoiseVal = document.getElementById("bgNoiseVal")!;
bgNoiseInput.addEventListener("mousedown", () => beginTransaction());
bgNoiseInput.addEventListener("input", () => {
  update(
    (s) => {
      s.bgNoise = parseInt(bgNoiseInput.value, 10) / 100;
    },
    false,
  );
  bgNoiseVal.textContent = `${bgNoiseInput.value}%`;
});
bgNoiseInput.addEventListener("change", () => commitTransaction());

const zoomInput = document.getElementById("zoom") as HTMLInputElement;
const zoomVal = document.getElementById("zoomVal")!;
zoomInput.addEventListener("mousedown", () => beginTransaction());
zoomInput.addEventListener("input", () => {
  update(
    (s) => {
      s.zoom = parseInt(zoomInput.value, 10) / 100;
    },
    false,
  );
  zoomVal.textContent = `${zoomInput.value}%`;
});
zoomInput.addEventListener("change", () => commitTransaction());

// Background swatches
const swatchGroups = [
  { id: "solidSwatches", attr: "solid", values: SOLID_COLORS, kind: "solid" as const },
  { id: "gradientSwatches", attr: "gradient", values: GRADIENTS, kind: "gradient" as const },
  { id: "glassSwatches", attr: "glass", values: GLASS_GRADIENTS, kind: "gradient" as const },
  { id: "cosmicSwatches", attr: "cosmic", values: COSMIC_GRADIENTS, kind: "gradient" as const },
  { id: "mysticSwatches", attr: "mystic", values: MYSTIC_GRADIENTS, kind: "gradient" as const },
];

function clearSwatchActive() {
  document.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
}

swatchGroups.forEach((group) => {
  document.getElementById(group.id)!.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const idxAttr = t.dataset[group.attr];
    if (idxAttr === undefined) return;
    const idx = parseInt(idxAttr, 10);
    update((s) => {
      s.background = { kind: group.kind, value: group.values[idx] };
    });
    clearSwatchActive();
    t.classList.add("active");
  });
});

document.querySelectorAll("[data-bg]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if ((btn as HTMLElement).dataset.bg === "transparent") {
      update((s) => {
        s.background = { kind: "transparent" };
      });
      clearSwatchActive();
    }
  });
});

const colorPicker = document.getElementById("colorPicker") as HTMLInputElement;
colorPicker.addEventListener("input", () => {
  update((s) => {
    s.background = { kind: "solid", value: colorPicker.value };
  }, false);
  clearSwatchActive();
});
colorPicker.addEventListener("change", () => commitTransaction());
colorPicker.addEventListener("focus", () => beginTransaction());

document.getElementById("devicePicker")!.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-device]") as HTMLElement;
  if (!btn) return;
  update((s) => {
    s.device = btn.dataset.device as DeviceFrameId;
  });
  document
    .querySelectorAll("#devicePicker .device-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
});

document.getElementById("transformPicker")!.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-transform]") as HTMLElement;
  if (!btn) return;
  const idx = parseInt(btn.dataset.transform!, 10);
  update((s) => {
    s.transform3d = TRANSFORM_PRESETS[idx];
  });
  document
    .querySelectorAll("#transformPicker .preset-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
});

document.getElementById("layoutPresets")!.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-preset]") as HTMLElement;
  if (!btn) return;
  const preset = LAYOUT_PRESETS.find((p) => p.id === btn.dataset.preset)!;
  update((s) => {
    s.zoom = preset.zoom;
    s.rotate = preset.rotate;
  });
  zoomInput.value = String(preset.zoom * 100);
  zoomVal.textContent = `${Math.round(preset.zoom * 100)}%`;
  (document.getElementById("rotate") as HTMLInputElement).value = String(
    preset.rotate,
  );
  document.getElementById("rotateVal")!.textContent = `${preset.rotate}°`;
  document
    .querySelectorAll("#layoutPresets .preset-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
});

document.getElementById("tabs")!.addEventListener("click", (e) => {
  const tab = (e.target as HTMLElement).closest(".tab") as HTMLElement;
  if (!tab) return;
  const target = tab.dataset.tab;
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  document
    .querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.remove("active"));
  document.querySelector(`[data-panel="${target}"]`)?.classList.add("active");
});

// Watermark toggle
document
  .getElementById("watermarkToggle")!
  .addEventListener("change", (e) => {
    update((s) => {
      s.watermark = (e.target as HTMLInputElement).checked;
    });
  });

// Reset
document.getElementById("reset")!.addEventListener("click", async () => {
  if (!confirm("¿Empezar de nuevo? Se perderá el trabajo actual.")) return;
  update((s) => {
    Object.assign(s, structuredClone(initialState));
  });
  await clearDraft();
});

// ── Overlays ──────────────────────────────────────────────────────────────

document.getElementById("addText")!.addEventListener("click", () => {
  update((s) => {
    const o: TextOverlay = {
      id: newId(),
      type: "text",
      text: "Hello, Lumen!",
      x: 50,
      y: 50,
      fontSize: 96,
      color: "#ffffff",
      fontWeight: 700,
      fontFamily: "system-ui, sans-serif",
      shadow: true,
      rotation: 0,
    };
    s.overlays.push(o);
    s.selectedOverlayId = o.id;
  });
});

document.getElementById("addImage")!.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      update((s) => {
        const o: ImageOverlay = {
          id: newId(),
          type: "image",
          src,
          x: 50,
          y: 50,
          width: 30,
          rotation: 0,
        };
        s.overlays.push(o);
        s.selectedOverlayId = o.id;
      });
    };
    reader.readAsDataURL(file);
  };
  input.click();
});

document.getElementById("layersList")!.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const removeId = target.dataset.removeLayer;
  if (removeId) {
    e.stopPropagation();
    update((s) => {
      s.overlays = s.overlays.filter((o) => o.id !== removeId);
      if (s.selectedOverlayId === removeId) s.selectedOverlayId = null;
    });
    return;
  }
  const row = target.closest("[data-layer-id]") as HTMLElement | null;
  if (row) {
    update((s) => {
      s.selectedOverlayId = row.dataset.layerId!;
    });
  }
});

// Drag overlays
attachOverlayDragHandlers(
  frame,
  () => currentStageScale,
  {
    onSelect: (id) => {
      update((s) => {
        s.selectedOverlayId = id;
      });
    },
    onMove: (id, x, y) => {
      update(
        (s) => {
          const o = s.overlays.find((o) => o.id === id);
          if (
            o &&
            (o.type === "text" ||
              o.type === "image" ||
              o.type === "rect" ||
              o.type === "blur")
          ) {
            o.x = x;
            o.y = y;
          }
        },
        false,
      );
    },
    onCommit: () => {
      // Push history once at end of drag
      // The first onMove during drag should have started transaction; we approximate
      // by snapshotting once here. Acceptable simplification.
    },
  },
);
// Begin transaction at mousedown on overlay (best-effort)
frame.addEventListener("mousedown", (e) => {
  const t = e.target as HTMLElement;
  if (t.closest("[data-overlay-id]")) beginTransaction();
});
frame.addEventListener("mouseup", () => {
  commitTransaction();
});

// Delete key removes selected overlay
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input, textarea, select")) return;
  if ((e.key === "Delete" || e.key === "Backspace") && state.selectedOverlayId) {
    update((s) => {
      s.overlays = s.overlays.filter((o) => o.id !== s.selectedOverlayId);
      s.selectedOverlayId = null;
    });
    e.preventDefault();
  }
  // Undo / redo
  const meta = e.ctrlKey || e.metaKey;
  if (meta && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) {
      redo();
    } else {
      undo();
    }
  } else if (meta && e.key.toLowerCase() === "y") {
    e.preventDefault();
    redo();
  }
});

document.getElementById("undoBtn")!.addEventListener("click", () => undo());
document.getElementById("redoBtn")!.addEventListener("click", () => redo());

// ── Tool palette ──────────────────────────────────────────────────────────

document.getElementById("toolPalette")!.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-tool]") as HTMLElement | null;
  if (!btn) return;
  const tool = btn.dataset.tool as Tool;
  update((s) => {
    s.tool = tool;
    s.selectedOverlayId = null;
  });
});

// ── Magic background ──────────────────────────────────────────────────────

document.getElementById("magicGradient")!.addEventListener("click", async () => {
  if (!state.imageSrc) return;
  const palette = await extractPalette(state.imageSrc, 5);
  update((s) => {
    s.background = { kind: "gradient", value: buildMagicGradient(palette) };
  });
  clearSwatchActive();
});
document.getElementById("magicMesh")!.addEventListener("click", async () => {
  if (!state.imageSrc) return;
  const palette = await extractPalette(state.imageSrc, 5);
  update((s) => {
    s.background = { kind: "gradient", value: buildMagicMesh(palette) };
  });
  clearSwatchActive();
});

// ── Drawing on canvas (arrow / rect tools) ────────────────────────────────

interface DrawingState {
  tool: Tool;
  startXPct: number;
  startYPct: number;
  newId: string;
}
let drawing: DrawingState | null = null;

function frameCoordsFromEvent(e: MouseEvent): { x: number; y: number } | null {
  const rect = frame.getBoundingClientRect();
  // rect is the frame's rendered bounds (already scaled). Convert mouse to %
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  return { x, y };
}

frame.addEventListener("mousedown", (e) => {
  if (state.tool === "select") return;
  // Don't draw if clicking on an existing overlay
  if ((e.target as HTMLElement).closest("[data-overlay-id]")) return;
  const c = frameCoordsFromEvent(e);
  if (!c) return;
  e.preventDefault();
  e.stopPropagation();

  const id = newId();
  drawing = { tool: state.tool, startXPct: c.x, startYPct: c.y, newId: id };

  beginTransaction();
  update((s) => {
    if (drawing!.tool === "arrow") {
      const arr: ArrowOverlay = {
        id,
        type: "arrow",
        x1: c.x,
        y1: c.y,
        x2: c.x,
        y2: c.y,
        color: "#ef4444",
        strokeWidth: 0.6,
      };
      s.overlays.push(arr);
    } else if (drawing!.tool === "rect") {
      const rect: RectOverlay = {
        id,
        type: "rect",
        x: c.x,
        y: c.y,
        width: 0,
        height: 0,
        color: "#fbbf24",
        fill: "transparent",
        strokeWidth: 0.6,
        radius: 1,
      };
      s.overlays.push(rect);
    } else if (drawing!.tool === "blur") {
      const blur: BlurOverlay = {
        id,
        type: "blur",
        x: c.x,
        y: c.y,
        width: 0,
        height: 0,
        amount: 16,
        radius: 8,
      };
      s.overlays.push(blur);
    } else if (drawing!.tool === "pen") {
      const pen: PenOverlay = {
        id,
        type: "pen",
        points: [c.x, c.y],
        color: "#ef4444",
        strokeWidth: 0.6,
      };
      s.overlays.push(pen);
    }
    s.selectedOverlayId = id;
  }, false);
});

window.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  const c = frameCoordsFromEvent(e);
  if (!c) return;
  update((s) => {
    const o = s.overlays.find((x) => x.id === drawing!.newId);
    if (!o) return;
    if (o.type === "arrow") {
      o.x2 = Math.max(0, Math.min(100, c.x));
      o.y2 = Math.max(0, Math.min(100, c.y));
    } else if (o.type === "rect" || o.type === "blur") {
      const minX = Math.min(drawing!.startXPct, c.x);
      const minY = Math.min(drawing!.startYPct, c.y);
      o.x = Math.max(0, minX);
      o.y = Math.max(0, minY);
      o.width = Math.min(100 - o.x, Math.abs(c.x - drawing!.startXPct));
      o.height = Math.min(100 - o.y, Math.abs(c.y - drawing!.startYPct));
    } else if (o.type === "pen") {
      // Skip if last point is too close (avoids spamming the array)
      const last = o.points.length;
      if (last >= 2) {
        const dx = c.x - o.points[last - 2];
        const dy = c.y - o.points[last - 1];
        if (Math.hypot(dx, dy) < 0.4) return;
      }
      o.points.push(
        Math.max(0, Math.min(100, c.x)),
        Math.max(0, Math.min(100, c.y)),
      );
    }
  }, false);
});

window.addEventListener("mouseup", () => {
  if (!drawing) return;
  const created = state.overlays.find((o) => o.id === drawing!.newId);
  if (created) {
    let degenerate = false;
    if (created.type === "arrow") {
      const dx = created.x2 - created.x1;
      const dy = created.y2 - created.y1;
      degenerate = Math.hypot(dx, dy) < 1;
    } else if (created.type === "rect" || created.type === "blur") {
      degenerate = created.width < 1 && created.height < 1;
    } else if (created.type === "pen") {
      degenerate = created.points.length < 4;
    }
    if (degenerate) {
      update((s) => {
        s.overlays = s.overlays.filter((o) => o.id !== drawing!.newId);
      }, false);
    }
  }
  commitTransaction();
  update((s) => {
    s.tool = "select";
  }, false);
  drawing = null;
});

// ── Animation playback ────────────────────────────────────────────────────

let animRafId: number | null = null;
let animStartTime = 0;

function tickAnimation(now: number) {
  const preset = getPresetById(state.animationPresetId);
  if (preset.id === "none") {
    stopAnimation();
    return;
  }
  const duration = state.animationDuration * 1000;
  const elapsed = now - animStartTime;
  let t = elapsed / duration;
  if (t >= 1) {
    if (state.animationLoop) {
      animStartTime = now;
      t = 0;
    } else {
      animationOverride = preset.apply(1);
      render();
      stopAnimation();
      return;
    }
  }
  animationOverride = preset.apply(t);
  render();
  animRafId = requestAnimationFrame(tickAnimation);
}

function startAnimation() {
  if (animRafId !== null) return;
  if (state.animationPresetId === "none") return;
  animStartTime = performance.now();
  animRafId = requestAnimationFrame(tickAnimation);
  (document.getElementById("animPlay") as HTMLButtonElement).textContent = "❚❚ Pause";
}
function stopAnimation() {
  if (animRafId !== null) cancelAnimationFrame(animRafId);
  animRafId = null;
  animationOverride = null;
  (document.getElementById("animPlay") as HTMLButtonElement).textContent = "▶ Play";
  render();
}

document.getElementById("animPresets")!.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-anim]") as HTMLElement | null;
  if (!btn) return;
  const id = btn.dataset.anim!;
  update((s) => {
    s.animationPresetId = id;
    s.animationDuration = getPresetById(id).duration;
  });
  document
    .querySelectorAll("#animPresets [data-anim]")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  // Sync duration slider
  const dur = document.getElementById("animDuration") as HTMLInputElement;
  dur.value = String(state.animationDuration);
  document.getElementById("animDurVal")!.textContent = `${state.animationDuration}s`;
});

const animDurInput = document.getElementById("animDuration") as HTMLInputElement;
animDurInput.addEventListener("input", () => {
  update((s) => {
    s.animationDuration = parseFloat(animDurInput.value);
  }, false);
  document.getElementById("animDurVal")!.textContent = `${animDurInput.value}s`;
});
animDurInput.addEventListener("change", () => commitTransaction());
animDurInput.addEventListener("mousedown", () => beginTransaction());

document.getElementById("animLoop")!.addEventListener("change", (e) => {
  update((s) => {
    s.animationLoop = (e.target as HTMLInputElement).checked;
  });
});

document.getElementById("animPlay")!.addEventListener("click", () => {
  if (animRafId !== null) {
    stopAnimation();
  } else {
    startAnimation();
  }
});
document.getElementById("animStop")!.addEventListener("click", () => stopAnimation());

// ── GIF Export ────────────────────────────────────────────────────────────

document.getElementById("exportGif")!.addEventListener("click", async () => {
  if (!state.imageSrc) {
    alert("Sube una imagen primero.");
    return;
  }
  if (state.animationPresetId === "none") {
    alert("Elige un preset de animación primero.");
    return;
  }
  // Stop preview if playing
  stopAnimation();

  const ratio = ASPECT_RATIOS[state.aspectIdx];
  // Cap the GIF size to keep it fast & small
  const maxDim = 720;
  const exportScale = Math.min(1, maxDim / Math.max(ratio.w, ratio.h));
  const w = Math.round(ratio.w * exportScale);
  const h = Math.round(ratio.h * exportScale);

  const prevTransform = frame.style.transform;
  const prevWrapW = frameWrap.style.width;
  const prevWrapH = frameWrap.style.height;

  // Render at full size then downscale via toCanvas width/height
  frame.style.transform = "scale(1)";
  frameWrap.style.width = `${ratio.w}px`;
  frameWrap.style.height = `${ratio.h}px`;

  const progressEl = document.getElementById("videoProgress")!;
  const progressBar = document.getElementById("videoProgressBar")!;
  const progressLabel = document.getElementById("videoProgressLabel")!;
  const exportBtn = document.getElementById("exportGif") as HTMLButtonElement;
  progressEl.classList.remove("hidden");
  exportBtn.disabled = true;
  exportBtn.textContent = "Rendering…";

  const preset = getPresetById(state.animationPresetId);

  try {
    const blob = await exportGif({
      fps: 20,
      duration: state.animationDuration,
      width: w,
      height: h,
      target: frame,
      setAnimationProgress: (t) => {
        animationOverride = preset.apply(t);
        render();
        // Re-pin export sizes since render() may reset them
        frame.style.transform = "scale(1)";
        frameWrap.style.width = `${ratio.w}px`;
        frameWrap.style.height = `${ratio.h}px`;
      },
      flush: () =>
        new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined)))),
      onProgress: (i, total) => {
        const pct = Math.round((i / total) * 100);
        progressBar.style.width = `${pct}%`;
        progressLabel.textContent = `${pct}% · ${i}/${total}`;
      },
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumen-${Date.now()}.gif`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Falló la exportación GIF. Revisa la consola.");
  } finally {
    animationOverride = null;
    frame.style.transform = prevTransform;
    frameWrap.style.width = prevWrapW;
    frameWrap.style.height = prevWrapH;
    exportBtn.disabled = false;
    exportBtn.textContent = "GIF";
    setTimeout(() => progressEl.classList.add("hidden"), 1200);
    render();
  }
});

// ── MP4 Export ────────────────────────────────────────────────────────────

if (!isMp4Supported()) {
  document.getElementById("mp4Unsupported")!.classList.remove("hidden");
  (document.getElementById("exportMp4") as HTMLButtonElement).disabled = true;
}

document.getElementById("exportMp4")!.addEventListener("click", async () => {
  if (!isMp4Supported()) return;
  if (!state.imageSrc) {
    alert("Sube una imagen primero.");
    return;
  }
  if (state.animationPresetId === "none") {
    alert("Elige un preset de animación primero.");
    return;
  }
  stopAnimation();

  const ratio = ASPECT_RATIOS[state.aspectIdx];
  // Higher cap for MP4 since it compresses far better than GIF
  const maxDim = 1280;
  const exportScale = Math.min(1, maxDim / Math.max(ratio.w, ratio.h));
  const w = Math.round(ratio.w * exportScale);
  const h = Math.round(ratio.h * exportScale);

  const prevTransform = frame.style.transform;
  const prevWrapW = frameWrap.style.width;
  const prevWrapH = frameWrap.style.height;

  frame.style.transform = "scale(1)";
  frameWrap.style.width = `${ratio.w}px`;
  frameWrap.style.height = `${ratio.h}px`;

  const progressEl = document.getElementById("videoProgress")!;
  const progressBar = document.getElementById("videoProgressBar")!;
  const progressLabel = document.getElementById("videoProgressLabel")!;
  const exportBtn = document.getElementById("exportMp4") as HTMLButtonElement;
  progressEl.classList.remove("hidden");
  exportBtn.disabled = true;
  exportBtn.textContent = "Rendering…";

  const preset = getPresetById(state.animationPresetId);
  const bitrate = parseInt(
    (document.getElementById("mp4Bitrate") as HTMLSelectElement).value,
    10,
  );
  const fps = parseInt(
    (document.getElementById("videoFps") as HTMLSelectElement).value,
    10,
  );

  try {
    const blob = await exportMp4({
      fps,
      duration: state.animationDuration,
      width: w,
      height: h,
      bitrate,
      target: frame,
      setAnimationProgress: (t) => {
        animationOverride = preset.apply(t);
        render();
        frame.style.transform = "scale(1)";
        frameWrap.style.width = `${ratio.w}px`;
        frameWrap.style.height = `${ratio.h}px`;
      },
      flush: () =>
        new Promise((r) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => r(undefined)),
          ),
        ),
      onProgress: (i, total) => {
        const pct = Math.round((i / total) * 100);
        progressBar.style.width = `${pct}%`;
        progressLabel.textContent = `${pct}% · ${i}/${total}`;
      },
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumen-${Date.now()}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert(`Falló la exportación MP4: ${(err as Error).message}`);
  } finally {
    animationOverride = null;
    frame.style.transform = prevTransform;
    frameWrap.style.width = prevWrapW;
    frameWrap.style.height = prevWrapH;
    exportBtn.disabled = false;
    exportBtn.textContent = "MP4";
    setTimeout(() => progressEl.classList.add("hidden"), 1200);
    render();
  }
});

// ── Export PNG ────────────────────────────────────────────────────────────

const exportScaleSelect = document.getElementById(
  "exportScale",
) as HTMLSelectElement;
exportScaleSelect.addEventListener("change", () => {
  update((s) => {
    s.exportScale = parseInt(exportScaleSelect.value, 10) as 1 | 2 | 3;
  });
});

document.getElementById("export")!.addEventListener("click", async () => {
  if (!state.imageSrc) {
    alert("Sube una imagen primero.");
    return;
  }
  const ratio = ASPECT_RATIOS[state.aspectIdx];
  const prevTransform = frame.style.transform;
  const prevWrapW = frameWrap.style.width;
  const prevWrapH = frameWrap.style.height;
  frame.style.transform = "scale(1)";
  frameWrap.style.width = `${ratio.w}px`;
  frameWrap.style.height = `${ratio.h}px`;

  const exportBtn = document.getElementById("export") as HTMLButtonElement;
  exportBtn.disabled = true;
  exportBtn.textContent = "Rendering...";

  try {
    const dataUrl = await toPng(frame, {
      pixelRatio: state.exportScale,
      cacheBust: true,
      backgroundColor:
        state.background.kind === "transparent" ? undefined : "transparent",
    });
    const a = document.createElement("a");
    a.download = `lumen-${Date.now()}@${state.exportScale}x.png`;
    a.href = dataUrl;
    a.click();
  } catch (err) {
    console.error(err);
    alert("Falló la exportación. Revisa la consola.");
  } finally {
    frame.style.transform = prevTransform;
    frameWrap.style.width = prevWrapW;
    frameWrap.style.height = prevWrapH;
    exportBtn.disabled = false;
    exportBtn.textContent = "↑ Export PNG";
    render();
  }
});

// ── Persistence ────────────────────────────────────────────────────────────

const autoSave = makeAutoSave(() => state, 1500);
let lastImageSrc: string | null = null;
subscribe(() => {
  render();
  autoSave();
  if (state.imageSrc !== lastImageSrc) {
    lastImageSrc = state.imageSrc;
    refreshMagicPalette();
  }
});

(async () => {
  try {
    const draft = await loadDraft();
    if (draft && draft.imageSrc) {
      showRestoreToast(draft);
    }
  } catch (e) {
    console.warn("[lumen] failed to read draft", e);
  }
})();

function showRestoreToast(draft: typeof state) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `
    <span>Restore previous session?</span>
    <button class="btn" id="restoreYes">Restore</button>
    <button class="btn btn-secondary" id="restoreNo">Dismiss</button>
  `;
  document.body.appendChild(el);
  document.getElementById("restoreYes")!.addEventListener("click", () => {
    update((s) => {
      Object.assign(s, draft);
    });
    el.remove();
  });
  document.getElementById("restoreNo")!.addEventListener("click", async () => {
    await clearDraft();
    el.remove();
  });
}

// ── Init ───────────────────────────────────────────────────────────────────

render();
window.addEventListener("resize", render);
