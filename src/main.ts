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
import type { DeviceFrameId, Transform3D } from "./data";
import { renderDevice } from "./devices";

// ── State ──────────────────────────────────────────────────────────────────

type Background =
  | { kind: "solid"; value: string }
  | { kind: "gradient"; value: string }
  | { kind: "transparent" };

interface State {
  imageSrc: string | null;
  aspectIdx: number;
  background: Background;
  padding: number;
  radius: number;
  shadow: number;
  zoom: number;
  rotate: number;
  device: DeviceFrameId;
  transform3d: Transform3D;
}

const state: State = {
  imageSrc: null,
  aspectIdx: 0,
  background: { kind: "gradient", value: GRADIENTS[0] },
  padding: 80,
  radius: 16,
  shadow: 40,
  zoom: 1,
  rotate: 0,
  device: "none",
  transform3d: TRANSFORM_PRESETS[0],
};

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
  <!-- LEFT SIDEBAR -->
  <aside class="w-72 shrink-0 border-r border-line bg-white scroll-y">
    <div class="p-4 border-b border-line">
      <div class="flex gap-1 p-1 bg-zinc-100 rounded-lg" id="tabs">
        <button class="tab active" data-tab="mockup">Mockup</button>
        <button class="tab" data-tab="frame">Frame</button>
      </div>
      <div class="section-title">Aspect Ratio</div>
      <select id="aspect" class="w-full text-sm border border-line rounded-lg px-3 py-2 bg-white">
        ${ASPECT_RATIOS.map((a, i) => `<option value="${i}">${a.label}</option>`).join("")}
      </select>
    </div>

    <!-- MOCKUP TAB -->
    <div class="tab-panel active p-4" data-panel="mockup">
      <div class="section-title">Background</div>
      <div class="flex gap-2 mb-3">
        <button class="btn-secondary btn flex-1 justify-center" data-bg="transparent">None</button>
        <label class="btn-secondary btn flex-1 justify-center cursor-pointer">
          Color
          <input id="colorPicker" type="color" class="hidden" value="#ffffff" />
        </label>
      </div>

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

    <!-- FRAME TAB -->
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
    </div>
  </aside>

  <!-- CENTER STAGE -->
  <main class="flex-1 flex flex-col">
    <header class="h-14 border-b border-line flex items-center justify-between px-4 bg-white">
      <div class="flex items-center gap-3">
        <div class="font-semibold text-sm tracking-tight">✦ Lumen</div>
        <button id="reset" class="btn btn-secondary">Start Over</button>
      </div>
      <div class="flex items-center gap-2">
        <button id="export" class="btn">↑ Export PNG</button>
      </div>
    </header>

    <div class="flex-1 stage" id="stage">
      <div id="frameWrap" style="position:relative;">
        <div class="frame" id="frame"></div>
      </div>
    </div>
  </main>

  <!-- RIGHT SIDEBAR -->
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

// ── Render ─────────────────────────────────────────────────────────────────

function render() {
  const ratio = ASPECT_RATIOS[state.aspectIdx];

  // Fit the frame inside the stage at preview scale
  const stageRect = stage.getBoundingClientRect();
  const maxW = stageRect.width - 64;
  const maxH = stageRect.height - 64;
  const scale = Math.min(maxW / ratio.w, maxH / ratio.h, 1);

  frameWrap.style.width = `${ratio.w * scale}px`;
  frameWrap.style.height = `${ratio.h * scale}px`;

  frame.style.width = `${ratio.w}px`;
  frame.style.height = `${ratio.h}px`;
  frame.style.transformOrigin = "top left";
  frame.style.transform = `scale(${scale})`;
  frame.style.padding = `${state.padding}px`;
  frame.style.perspective = `${state.transform3d.perspective}px`;

  // Background
  if (state.background.kind === "transparent") {
    frame.style.background = "transparent";
  } else {
    frame.style.background = state.background.value;
  }

  // Shadow CSS for the inner image / device
  const shadowStrength = state.shadow / 100;
  const shadowCss =
    state.shadow > 0
      ? `0 ${20 + state.shadow / 2}px ${40 + state.shadow}px rgba(0,0,0,${
          0.15 + shadowStrength * 0.3
        })`
      : "none";

  // Combined transform: 3D preset + Z-axis rotation slider + zoom
  const t = state.transform3d;
  const innerTransform = `rotateX(${t.rx}deg) rotateY(${t.ry}deg) rotateZ(${
    t.rz + state.rotate
  }deg) scale(${state.zoom})`;

  const innerStyle = `
    border-radius:${state.radius}px;
    box-shadow:${shadowCss};
    transform:${innerTransform};
    transform-style:preserve-3d;
  `;

  if (state.imageSrc) {
    frame.innerHTML = renderDevice(state.device, state.imageSrc, innerStyle);
  } else {
    frame.innerHTML = `
      <div class="placeholder" style="border-radius:${state.radius}px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>
        <div>Drop or Paste</div>
        <div class="text-sm font-normal text-zinc-400">Images & Videos</div>
      </div>
    `;
  }
}

// ── Image loading ──────────────────────────────────────────────────────────

function loadImageFromFile(file: File) {
  if (!file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    state.imageSrc = e.target?.result as string;
    render();
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
  if (file) loadImageFromFile(file);
});
window.addEventListener("paste", (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of Array.from(items)) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) loadImageFromFile(file);
    }
  }
});
frame.addEventListener("click", () => {
  if (state.imageSrc) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) loadImageFromFile(file);
  };
  input.click();
});

// ── Controls ───────────────────────────────────────────────────────────────

aspectSelect.addEventListener("change", () => {
  state.aspectIdx = parseInt(aspectSelect.value, 10);
  render();
});

function bindRange(id: string, key: keyof State, suffix = "px") {
  const input = document.getElementById(id) as HTMLInputElement;
  const valEl = document.getElementById(`${id}Val`);
  input.addEventListener("input", () => {
    (state as any)[key] = parseInt(input.value, 10);
    if (valEl) valEl.textContent = `${input.value}${suffix}`;
    render();
  });
}
bindRange("padding", "padding");
bindRange("radius", "radius");
bindRange("shadow", "shadow", "");
bindRange("rotate", "rotate", "°");

const zoomInput = document.getElementById("zoom") as HTMLInputElement;
const zoomVal = document.getElementById("zoomVal")!;
zoomInput.addEventListener("input", () => {
  state.zoom = parseInt(zoomInput.value, 10) / 100;
  zoomVal.textContent = `${zoomInput.value}%`;
  render();
});

// Background swatches: clear other groups, set this one active
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
    state.background = { kind: group.kind, value: group.values[idx] };
    clearSwatchActive();
    t.classList.add("active");
    render();
  });
});

// "None" background button
document.querySelectorAll("[data-bg]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if ((btn as HTMLElement).dataset.bg === "transparent") {
      state.background = { kind: "transparent" };
      clearSwatchActive();
      render();
    }
  });
});

// Color picker
const colorPicker = document.getElementById("colorPicker") as HTMLInputElement;
colorPicker.addEventListener("input", () => {
  state.background = { kind: "solid", value: colorPicker.value };
  clearSwatchActive();
  render();
});

// Device picker
document.getElementById("devicePicker")!.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-device]") as HTMLElement;
  if (!btn) return;
  state.device = btn.dataset.device as DeviceFrameId;
  document
    .querySelectorAll("#devicePicker .device-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  render();
});

// 3D transform picker
document.getElementById("transformPicker")!.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-transform]") as HTMLElement;
  if (!btn) return;
  const idx = parseInt(btn.dataset.transform!, 10);
  state.transform3d = TRANSFORM_PRESETS[idx];
  document
    .querySelectorAll("#transformPicker .preset-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  render();
});

// Layout presets
document.getElementById("layoutPresets")!.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-preset]") as HTMLElement;
  if (!btn) return;
  const preset = LAYOUT_PRESETS.find((p) => p.id === btn.dataset.preset)!;
  state.zoom = preset.zoom;
  state.rotate = preset.rotate;
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
  render();
});

// Tabs (Mockup / Frame)
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

// Reset
document.getElementById("reset")!.addEventListener("click", () => {
  if (!confirm("¿Empezar de nuevo? Se perderá la imagen.")) return;
  state.imageSrc = null;
  render();
});

// ── Export ─────────────────────────────────────────────────────────────────

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

  try {
    const dataUrl = await toPng(frame, {
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor:
        state.background.kind === "transparent" ? undefined : "transparent",
    });
    const a = document.createElement("a");
    a.download = `lumen-${Date.now()}.png`;
    a.href = dataUrl;
    a.click();
  } catch (err) {
    console.error(err);
    alert("Falló la exportación. Revisa la consola.");
  } finally {
    frame.style.transform = prevTransform;
    frameWrap.style.width = prevWrapW;
    frameWrap.style.height = prevWrapH;
    render();
  }
});

// ── Init ───────────────────────────────────────────────────────────────────

render();
window.addEventListener("resize", render);
