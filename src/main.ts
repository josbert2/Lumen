import "./style.css";
import { toPng } from "html-to-image";

type AspectRatio = { label: string; w: number; h: number };
type Background =
  | { kind: "solid"; value: string }
  | { kind: "gradient"; value: string }
  | { kind: "transparent" };

const ASPECT_RATIOS: AspectRatio[] = [
  { label: "4:3 · 1920×1440", w: 1920, h: 1440 },
  { label: "16:9 · 1920×1080", w: 1920, h: 1080 },
  { label: "1:1 · 1440×1440", w: 1440, h: 1440 },
  { label: "9:16 · 1080×1920", w: 1080, h: 1920 },
  { label: "3:2 · 1800×1200", w: 1800, h: 1200 },
];

const SOLID_COLORS = [
  "#ffffff",
  "#f3f4f6",
  "#a1a1aa",
  "#111111",
  "#fde047",
  "#fb923c",
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
];

const GRADIENTS = [
  "linear-gradient(135deg, #ff6b35 0%, #ec4899 50%, #8b5cf6 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
  "linear-gradient(135deg, #fbcfe8 0%, #fde68a 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
  "linear-gradient(135deg, #fef3c7 0%, #fbbf24 50%, #f97316 100%)",
  "radial-gradient(circle at 30% 30%, #ec4899 0%, #1e1b4b 70%)",
  "linear-gradient(135deg, #fb7185 0%, #f472b6 50%, #c084fc 100%)",
];

const LAYOUT_PRESETS = [
  { label: "Center", zoom: 1, rotate: 0, tilt: 0 },
  { label: "Tilt L", zoom: 0.85, rotate: -8, tilt: 0 },
  { label: "Tilt R", zoom: 0.85, rotate: 8, tilt: 0 },
  { label: "Zoom out", zoom: 0.7, rotate: 0, tilt: 0 },
];

interface State {
  imageSrc: string | null;
  aspectIdx: number;
  background: Background;
  padding: number;
  radius: number;
  shadow: number;
  zoom: number;
  rotate: number;
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
};

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
<div class="flex h-full w-full">
  <!-- LEFT SIDEBAR -->
  <aside class="w-72 shrink-0 border-r border-line bg-white scroll-y">
    <div class="p-4 border-b border-line">
      <div class="flex gap-1 p-1 bg-zinc-100 rounded-lg">
        <button class="tab active" data-tab="mockup">Mockup</button>
        <button class="tab" data-tab="frame">Frame</button>
      </div>
      <div class="section-title">Aspect Ratio</div>
      <select id="aspect" class="w-full text-sm border border-line rounded-lg px-3 py-2 bg-white">
        ${ASPECT_RATIOS.map((a, i) => `<option value="${i}">${a.label}</option>`).join("")}
      </select>
    </div>

    <div class="p-4">
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

      <div class="section-title">Background</div>
      <div class="flex gap-2 mb-3">
        <button class="btn-secondary btn flex-1 justify-center" data-bg="transparent">None</button>
        <label class="btn-secondary btn flex-1 justify-center cursor-pointer">
          Color
          <input id="colorPicker" type="color" class="hidden" value="#ffffff" />
        </label>
      </div>

      <div class="text-xs font-medium text-zinc-700 mb-2">Solid</div>
      <div class="grid grid-cols-5 gap-2 mb-4" id="solidSwatches">
        ${SOLID_COLORS.map(
          (c) =>
            `<div class="swatch" data-solid="${c}" style="background:${c}"></div>`,
        ).join("")}
      </div>

      <div class="text-xs font-medium text-zinc-700 mb-2">Gradient</div>
      <div class="grid grid-cols-5 gap-2" id="gradientSwatches">
        ${GRADIENTS.map(
          (g, i) =>
            `<div class="swatch ${i === 0 ? "active" : ""}" data-gradient="${i}" style="background:${g}"></div>`,
        ).join("")}
      </div>
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
        (p, i) => `
        <button data-preset="${i}" class="aspect-[4/3] rounded-lg border border-line hover:border-zinc-400 bg-white flex items-center justify-center text-xs text-zinc-600 transition">
          ${p.label}
        </button>`,
      ).join("")}
    </div>

    <div class="section-title">Zoom</div>
    <label class="text-xs text-zinc-500 flex items-center justify-between">
      <span>Scale</span><span id="zoomVal">100%</span>
    </label>
    <input id="zoom" type="range" min="40" max="120" value="100" />

    <div class="section-title">Rotation</div>
    <label class="text-xs text-zinc-500 flex items-center justify-between">
      <span>Tilt</span><span id="rotateVal">0°</span>
    </label>
    <input id="rotate" type="range" min="-30" max="30" value="0" />
  </aside>
</div>
`;

// === REFERENCES ===
const frame = document.getElementById("frame") as HTMLDivElement;
const frameWrap = document.getElementById("frameWrap") as HTMLDivElement;
const stage = document.getElementById("stage") as HTMLDivElement;
const aspectSelect = document.getElementById("aspect") as HTMLSelectElement;

// === RENDER ===
function render() {
  const ratio = ASPECT_RATIOS[state.aspectIdx];

  // Fit the frame inside the stage at preview scale
  const stageRect = stage.getBoundingClientRect();
  const maxW = stageRect.width - 64;
  const maxH = stageRect.height - 64;
  const scale = Math.min(maxW / ratio.w, maxH / ratio.h, 1);

  frameWrap.style.width = `${ratio.w * scale}px`;
  frameWrap.style.height = `${ratio.h * scale}px`;

  // The frame internally stays at the *real* export size
  frame.style.width = `${ratio.w}px`;
  frame.style.height = `${ratio.h}px`;
  frame.style.transformOrigin = "top left";
  frame.style.transform = `scale(${scale})`;
  frame.style.padding = `${state.padding}px`;

  // Background
  if (state.background.kind === "transparent") {
    frame.style.background = "transparent";
  } else {
    frame.style.background = state.background.value;
  }

  // Shadow on the inner image
  const shadowStrength = state.shadow / 100;
  const shadowCss =
    state.shadow > 0
      ? `0 ${20 + state.shadow / 2}px ${40 + state.shadow}px rgba(0,0,0,${
          0.15 + shadowStrength * 0.3
        })`
      : "none";

  // Inner content
  if (state.imageSrc) {
    frame.innerHTML = `
      <img id="canvasImg" class="canvas-image" src="${state.imageSrc}" style="
        border-radius:${state.radius}px;
        box-shadow:${shadowCss};
        transform: scale(${state.zoom}) rotate(${state.rotate}deg);
      " />
    `;
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

// === IMAGE LOADING ===
function loadImageFromFile(file: File) {
  if (!file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    state.imageSrc = e.target?.result as string;
    render();
  };
  reader.readAsDataURL(file);
}

// Drop & paste
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
// Click placeholder to upload
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

// === CONTROLS ===
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

// Zoom: separate because it's percentage
const zoomInput = document.getElementById("zoom") as HTMLInputElement;
const zoomVal = document.getElementById("zoomVal")!;
zoomInput.addEventListener("input", () => {
  state.zoom = parseInt(zoomInput.value, 10) / 100;
  zoomVal.textContent = `${zoomInput.value}%`;
  render();
});

// Backgrounds
function setActiveSwatch(group: string, target: HTMLElement | null) {
  document
    .querySelectorAll(`#${group} .swatch`)
    .forEach((s) => s.classList.remove("active"));
  target?.classList.add("active");
}

document.getElementById("solidSwatches")!.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  const c = t.dataset.solid;
  if (!c) return;
  state.background = { kind: "solid", value: c };
  setActiveSwatch("solidSwatches", t);
  setActiveSwatch("gradientSwatches", null);
  render();
});

document.getElementById("gradientSwatches")!.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  const i = t.dataset.gradient;
  if (i === undefined) return;
  state.background = { kind: "gradient", value: GRADIENTS[parseInt(i, 10)] };
  setActiveSwatch("gradientSwatches", t);
  setActiveSwatch("solidSwatches", null);
  render();
});

document.querySelectorAll("[data-bg]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const kind = (btn as HTMLElement).dataset.bg;
    if (kind === "transparent") {
      state.background = { kind: "transparent" };
      setActiveSwatch("solidSwatches", null);
      setActiveSwatch("gradientSwatches", null);
      render();
    }
  });
});

const colorPicker = document.getElementById("colorPicker") as HTMLInputElement;
colorPicker.addEventListener("input", () => {
  state.background = { kind: "solid", value: colorPicker.value };
  setActiveSwatch("solidSwatches", null);
  setActiveSwatch("gradientSwatches", null);
  render();
});

// Layout presets
document.getElementById("layoutPresets")!.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-preset]") as HTMLElement;
  if (!btn) return;
  const preset = LAYOUT_PRESETS[parseInt(btn.dataset.preset!, 10)];
  state.zoom = preset.zoom;
  state.rotate = preset.rotate;
  zoomInput.value = String(preset.zoom * 100);
  zoomVal.textContent = `${Math.round(preset.zoom * 100)}%`;
  (document.getElementById("rotate") as HTMLInputElement).value = String(
    preset.rotate,
  );
  document.getElementById("rotateVal")!.textContent = `${preset.rotate}°`;
  render();
});

// Reset
document.getElementById("reset")!.addEventListener("click", () => {
  if (!confirm("¿Empezar de nuevo? Se perderá la imagen.")) return;
  state.imageSrc = null;
  render();
});

// === EXPORT ===
document.getElementById("export")!.addEventListener("click", async () => {
  if (!state.imageSrc) {
    alert("Sube una imagen primero.");
    return;
  }
  // Temporarily reset preview scale so export captures real-size frame
  const prevTransform = frame.style.transform;
  frame.style.transform = "scale(1)";
  frameWrap.style.width = `${ASPECT_RATIOS[state.aspectIdx].w}px`;
  frameWrap.style.height = `${ASPECT_RATIOS[state.aspectIdx].h}px`;

  try {
    const dataUrl = await toPng(frame, {
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor:
        state.background.kind === "transparent" ? undefined : "transparent",
    });
    const a = document.createElement("a");
    a.download = `shot-${Date.now()}.png`;
    a.href = dataUrl;
    a.click();
  } catch (err) {
    console.error(err);
    alert("Falló la exportación. Revisa la consola.");
  } finally {
    // Restore preview scale
    frame.style.transform = prevTransform;
    render();
  }
});

// === TABS (placeholder for future Frame tab) ===
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

// === INIT ===
render();
window.addEventListener("resize", render);
