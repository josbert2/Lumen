import type {
  TextOverlay,
  ImageOverlay,
  ArrowOverlay,
  RectOverlay,
  BlurOverlay,
  PenOverlay,
  State,
} from "./state";

// Render all overlays on top of the device. Returns HTML string.
export function renderOverlays(state: State): string {
  let body = "";
  // Annotations (arrows, rects, pens) live inside one shared SVG layer.
  const annotations = state.overlays.filter(
    (o) => o.type === "arrow" || o.type === "rect" || o.type === "pen",
  ) as (ArrowOverlay | RectOverlay | PenOverlay)[];
  if (annotations.length > 0) {
    body += renderAnnotationLayer(annotations, state.selectedOverlayId);
  }
  // Text, image, blur overlays each get their own div
  for (const o of state.overlays) {
    const selected = o.id === state.selectedOverlayId;
    if (o.type === "text") body += renderTextOverlay(o, selected);
    else if (o.type === "image") body += renderImageOverlay(o, selected);
    else if (o.type === "blur") body += renderBlurOverlay(o, selected);
  }
  return body;
}

function renderBlurOverlay(o: BlurOverlay, selected: boolean): string {
  return `
    <div
      class="overlay overlay-blur ${selected ? "selected" : ""}"
      data-overlay-id="${o.id}"
      style="
        left:${o.x}%; top:${o.y}%;
        width:${o.width}%; height:${o.height}%;
        backdrop-filter: blur(${o.amount}px);
        -webkit-backdrop-filter: blur(${o.amount}px);
        border-radius:${o.radius}px;
        transform:translate(0,0);
      "
    ></div>`;
}

function renderTextOverlay(o: TextOverlay, selected: boolean): string {
  const shadow = o.shadow ? "0 4px 24px rgba(0,0,0,0.4)" : "none";
  return `
    <div
      class="overlay overlay-text ${selected ? "selected" : ""}"
      data-overlay-id="${o.id}"
      style="
        left:${o.x}%; top:${o.y}%;
        transform:translate(-50%,-50%) rotate(${o.rotation}deg);
        font-size:${o.fontSize}px;
        color:${o.color};
        font-weight:${o.fontWeight};
        font-family:${o.fontFamily};
        text-shadow:${shadow};
      "
    >${escapeHtml(o.text)}</div>`;
}

function renderImageOverlay(o: ImageOverlay, selected: boolean): string {
  return `
    <div
      class="overlay overlay-image ${selected ? "selected" : ""}"
      data-overlay-id="${o.id}"
      style="
        left:${o.x}%; top:${o.y}%;
        width:${o.width}%;
        transform:translate(-50%,-50%) rotate(${o.rotation}deg);
      "
    >
      <img src="${o.src}" draggable="false" />
    </div>`;
}

function renderAnnotationLayer(
  shapes: (ArrowOverlay | RectOverlay | PenOverlay)[],
  selectedId: string | null,
): string {
  const defs = shapes
    .filter((s): s is ArrowOverlay => s.type === "arrow")
    .map(
      (a) => `
      <marker id="m-${a.id}" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="${4 + a.strokeWidth * 2}" markerHeight="${4 + a.strokeWidth * 2}"
              orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <path d="M0,0 L10,5 L0,10 z" fill="${a.color}"/>
      </marker>`,
    )
    .join("");

  const body = shapes
    .map((s) => {
      const selected = s.id === selectedId;
      const selectStroke = selected ? `stroke-dasharray="2 2"` : "";
      if (s.type === "arrow") {
        return `
          <line
            data-overlay-id="${s.id}"
            class="overlay-svg ${selected ? "selected" : ""}"
            x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}"
            stroke="${s.color}" stroke-width="${s.strokeWidth}"
            stroke-linecap="round"
            marker-end="url(#m-${s.id})"
            vector-effect="non-scaling-stroke"
          />`;
      } else if (s.type === "rect") {
        return `
          <rect
            data-overlay-id="${s.id}"
            class="overlay-svg ${selected ? "selected" : ""}"
            x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}"
            rx="${s.radius}" ry="${s.radius}"
            fill="${s.fill}"
            stroke="${s.color}" stroke-width="${s.strokeWidth}"
            ${selectStroke}
            vector-effect="non-scaling-stroke"
          />`;
      } else {
        // pen
        if (s.points.length < 4) return "";
        const pts: string[] = [];
        for (let i = 0; i < s.points.length; i += 2) {
          pts.push(`${s.points[i]},${s.points[i + 1]}`);
        }
        return `
          <polyline
            data-overlay-id="${s.id}"
            class="overlay-svg ${selected ? "selected" : ""}"
            points="${pts.join(" ")}"
            fill="none"
            stroke="${s.color}" stroke-width="${s.strokeWidth}"
            stroke-linecap="round" stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />`;
      }
    })
    .join("");

  return `
    <svg class="annotations-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>${defs}</defs>
      ${body}
    </svg>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Drag handling for text/image overlays ─────────────────────────────────

export type OverlayDragHandlers = {
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onCommit: () => void;
};

export function attachOverlayDragHandlers(
  container: HTMLElement, // .frame
  getStageScale: () => number,
  handlers: OverlayDragHandlers,
) {
  let dragging: {
    id: string;
    startX: number;
    startY: number;
    initialPctX: number;
    initialPctY: number;
    frameW: number;
    frameH: number;
  } | null = null;

  container.addEventListener("mousedown", (e) => {
    const target = e.target as HTMLElement;
    const overlay = target.closest("[data-overlay-id]") as HTMLElement | null;
    if (!overlay) {
      handlers.onSelect(null);
      return;
    }
    // Drag only applies to text/image/blur overlays — SVG shapes are select-only here
    if (
      overlay.tagName === "line" ||
      overlay.tagName === "rect" ||
      overlay.tagName === "polyline" ||
      overlay.classList?.contains("overlay-svg")
    ) {
      handlers.onSelect(overlay.getAttribute("data-overlay-id"));
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const id = overlay.dataset.overlayId!;
    handlers.onSelect(id);

    const scale = getStageScale();
    const frameW = container.offsetWidth * scale;
    const frameH = container.offsetHeight * scale;

    const left = parseFloat(overlay.style.left);
    const top = parseFloat(overlay.style.top);

    dragging = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialPctX: left,
      initialPctY: top,
      frameW,
      frameH,
    };
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragging.startX;
    const dy = e.clientY - dragging.startY;
    const dPctX = (dx / dragging.frameW) * 100;
    const dPctY = (dy / dragging.frameH) * 100;
    handlers.onMove(
      dragging.id,
      Math.max(0, Math.min(100, dragging.initialPctX + dPctX)),
      Math.max(0, Math.min(100, dragging.initialPctY + dPctY)),
    );
  });

  window.addEventListener("mouseup", () => {
    if (dragging) {
      handlers.onCommit();
      dragging = null;
    }
  });
}
