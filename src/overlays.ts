import type { TextOverlay, ImageOverlay, State } from "./state";

// Render all overlays on top of the device. Returns HTML string.
export function renderOverlays(state: State): string {
  return state.overlays
    .map((o) => {
      const selected = o.id === state.selectedOverlayId;
      if (o.type === "text") return renderTextOverlay(o, selected);
      return renderImageOverlay(o, selected);
    })
    .join("");
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Drag handling ──────────────────────────────────────────────────────────

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
    e.preventDefault();
    e.stopPropagation();

    const id = overlay.dataset.overlayId!;
    handlers.onSelect(id);

    const scale = getStageScale();
    // Frame's CSS dimensions are real (e.g. 1920px). Effective size on screen = real * scale
    const frameW = container.offsetWidth * scale;
    const frameH = container.offsetHeight * scale;

    // Read current pct from inline style (or compute from element rect)
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
