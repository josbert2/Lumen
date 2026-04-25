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

export type Overlay = TextOverlay | ImageOverlay;

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
