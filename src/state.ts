import { GRADIENTS, TRANSFORM_PRESETS } from "./data";
import type { DeviceFrameId, Transform3D } from "./data";

// ── Types ──────────────────────────────────────────────────────────────────

export type Background =
  | { kind: "solid"; value: string }
  | { kind: "gradient"; value: string }
  | { kind: "transparent" };

export type TextOverlay = {
  id: string;
  type: "text";
  text: string;
  x: number; // % of frame width
  y: number; // % of frame height
  fontSize: number;
  color: string;
  fontWeight: number;
  fontFamily: string;
  shadow: boolean;
  rotation: number;
};

export type ImageOverlay = {
  id: string;
  type: "image";
  src: string;
  x: number;
  y: number;
  width: number; // % of frame width
  rotation: number;
};

export type ArrowOverlay = {
  id: string;
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number; // SVG units; the SVG viewBox is 0..100, so 0.5 ≈ 0.5% of frame
};

export type RectOverlay = {
  id: string;
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fill: string; // "transparent" or rgba(...)
  strokeWidth: number;
  radius: number;
};

export type BlurOverlay = {
  id: string;
  type: "blur";
  x: number;
  y: number;
  width: number;
  height: number;
  amount: number; // px of blur
  radius: number;
};

export type PenOverlay = {
  id: string;
  type: "pen";
  points: number[]; // flat [x1, y1, x2, y2, ...] in % of frame
  color: string;
  strokeWidth: number;
};

export type Overlay =
  | TextOverlay
  | ImageOverlay
  | ArrowOverlay
  | RectOverlay
  | BlurOverlay
  | PenOverlay;

export type Tool =
  | "select"
  | "text"
  | "image"
  | "arrow"
  | "rect"
  | "blur"
  | "pen";

export interface State {
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
  overlays: Overlay[];
  selectedOverlayId: string | null;
  watermark: boolean;
  exportScale: 1 | 2 | 3;
  tool: Tool;
  bgNoise: number; // 0..1
  animationPresetId: string;
  animationDuration: number; // seconds
  animationLoop: boolean;
}

export const initialState: State = {
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
  overlays: [],
  selectedOverlayId: null,
  watermark: false,
  exportScale: 1,
  tool: "select",
  bgNoise: 0,
  animationPresetId: "none",
  animationDuration: 3,
  animationLoop: true,
};

// ── Mutable state container ────────────────────────────────────────────────

export const state: State = structuredClone(initialState);

// ── History (undo / redo) ──────────────────────────────────────────────────

const HISTORY_LIMIT = 50;
let past: State[] = [];
let future: State[] = [];

const subscribers = new Set<() => void>();
export function subscribe(cb: () => void) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}
function notify() {
  subscribers.forEach((cb) => cb());
}

function snapshot(): State {
  return structuredClone(state);
}
function apply(s: State) {
  Object.assign(state, s);
}

/**
 * Mutate state. If `commit=true`, push the previous state to history.
 * Use commit=false for continuous interactions (range sliders during drag),
 * then call commitHistory() once on mouseup.
 */
export function update(mutator: (s: State) => void, commit = true) {
  if (commit) {
    past.push(snapshot());
    if (past.length > HISTORY_LIMIT) past.shift();
    future = [];
  }
  mutator(state);
  notify();
}

let pendingPre: State | null = null;
export function beginTransaction() {
  pendingPre = snapshot();
}
export function commitTransaction() {
  if (pendingPre) {
    past.push(pendingPre);
    if (past.length > HISTORY_LIMIT) past.shift();
    future = [];
    pendingPre = null;
  }
}

export function undo(): boolean {
  if (past.length === 0) return false;
  future.push(snapshot());
  apply(past.pop()!);
  notify();
  return true;
}
export function redo(): boolean {
  if (future.length === 0) return false;
  past.push(snapshot());
  apply(future.pop()!);
  notify();
  return true;
}
export function canUndo() {
  return past.length > 0;
}
export function canRedo() {
  return future.length > 0;
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function newId(): string {
  return Math.random().toString(36).slice(2, 9);
}
