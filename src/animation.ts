// Animation presets + interpolation. Pure functions, no side effects.
import type { Transform3D } from "./data";

// Subset of state that animations may override.
export type AnimationOverride = {
  zoom?: number;
  rotate?: number;
  transform3d?: Transform3D;
};

export type AnimationPreset = {
  id: string;
  label: string;
  duration: number; // seconds
  apply: (t: number) => AnimationOverride; // t ∈ [0, 1]
};

// ── Easing functions ──────────────────────────────────────────────────────

export const easings = {
  linear: (t: number) => t,
  easeInOut: (t: number) => t * t * (3 - 2 * t),
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeIn: (t: number) => t * t * t,
};

// ── Animation presets ─────────────────────────────────────────────────────

const persp = 1500;

export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: "none",
    label: "None",
    duration: 3,
    apply: () => ({}),
  },
  {
    id: "spin-y",
    label: "Spin Y",
    duration: 3,
    apply: (t) => ({
      transform3d: { id: "anim", label: "", rx: 0, ry: t * 360, rz: 0, perspective: persp },
    }),
  },
  {
    id: "tilt-loop",
    label: "Tilt Loop",
    duration: 3,
    apply: (t) => {
      const wave = Math.sin(t * Math.PI * 2);
      return {
        transform3d: {
          id: "anim", label: "",
          rx: 0,
          ry: wave * 25,
          rz: 0,
          perspective: persp,
        },
      };
    },
  },
  {
    id: "zoom-in",
    label: "Zoom In",
    duration: 2,
    apply: (t) => ({ zoom: 0.5 + easings.easeInOutCubic(t) * 0.5 }),
  },
  {
    id: "zoom-pulse",
    label: "Pulse",
    duration: 2,
    apply: (t) => {
      const wave = Math.sin(t * Math.PI * 2);
      return { zoom: 1 + wave * 0.08 };
    },
  },
  {
    id: "bounce",
    label: "Bounce",
    duration: 2,
    apply: (t) => {
      const decay = Math.max(0, 1 - t);
      const wave = Math.cos(t * Math.PI * 5) * decay;
      return { rotate: wave * 8 };
    },
  },
  {
    id: "iso-orbit",
    label: "Iso Orbit",
    duration: 4,
    apply: (t) => {
      const angle = t * Math.PI * 2;
      return {
        transform3d: {
          id: "anim", label: "",
          rx: 25,
          ry: Math.cos(angle) * 30,
          rz: Math.sin(angle) * 8,
          perspective: 1800,
        },
      };
    },
  },
  {
    id: "drift-in",
    label: "Drift In",
    duration: 2.5,
    apply: (t) => {
      const e = easings.easeOut(t);
      return {
        transform3d: {
          id: "anim", label: "",
          rx: (1 - e) * -15,
          ry: (1 - e) * -25,
          rz: (1 - e) * 6,
          perspective: persp,
        },
        zoom: 0.7 + e * 0.3,
      };
    },
  },
];

export function getPresetById(id: string): AnimationPreset {
  return ANIMATION_PRESETS.find((p) => p.id === id) ?? ANIMATION_PRESETS[0];
}
