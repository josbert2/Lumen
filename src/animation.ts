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
    id: "custom",
    label: "Custom",
    duration: 3,
    apply: () => ({}), // overridden by keyframes when this preset is active
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

// ── Custom keyframes ──────────────────────────────────────────────────────

export type EasingId = keyof typeof easings;

export type Keyframe = {
  id: string;
  time: number; // seconds
  zoom?: number;
  rotate?: number;
  transform3d?: Transform3D;
  /** Easing applied between this keyframe and the next */
  easing?: EasingId;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpT3d(a: Transform3D, b: Transform3D, t: number): Transform3D {
  return {
    id: "kf",
    label: "",
    rx: lerp(a.rx, b.rx, t),
    ry: lerp(a.ry, b.ry, t),
    rz: lerp(a.rz, b.rz, t),
    perspective: lerp(a.perspective, b.perspective, t),
  };
}

function kfToOverride(k: Keyframe): AnimationOverride {
  return {
    zoom: k.zoom,
    rotate: k.rotate,
    transform3d: k.transform3d,
  };
}

export function interpolateKeyframes(
  time: number,
  kfs: Keyframe[],
): AnimationOverride {
  if (kfs.length === 0) return {};
  const sorted = [...kfs].sort((a, b) => a.time - b.time);
  if (kfs.length === 1) return kfToOverride(sorted[0]);

  if (time <= sorted[0].time) return kfToOverride(sorted[0]);
  if (time >= sorted[sorted.length - 1].time)
    return kfToOverride(sorted[sorted.length - 1]);

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (time >= a.time && time <= b.time) {
      const segT = b.time === a.time ? 0 : (time - a.time) / (b.time - a.time);
      const ease = easings[a.easing ?? "easeInOut"];
      const eT = ease(segT);
      return {
        zoom:
          a.zoom !== undefined && b.zoom !== undefined
            ? lerp(a.zoom, b.zoom, eT)
            : (a.zoom ?? b.zoom),
        rotate:
          a.rotate !== undefined && b.rotate !== undefined
            ? lerp(a.rotate, b.rotate, eT)
            : (a.rotate ?? b.rotate),
        transform3d:
          a.transform3d && b.transform3d
            ? lerpT3d(a.transform3d, b.transform3d, eT)
            : (a.transform3d ?? b.transform3d),
      };
    }
  }
  return kfToOverride(sorted[0]);
}

/**
 * Sample a baked preset at `count` evenly spaced points and return them as
 * keyframes — gives the user a starting point to edit.
 */
export function bakePresetToKeyframes(
  preset: AnimationPreset,
  count = 9,
): Keyframe[] {
  const kfs: Keyframe[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const o = preset.apply(t);
    kfs.push({
      id: `kf-${Math.random().toString(36).slice(2, 8)}-${i}`,
      time: t * preset.duration,
      zoom: o.zoom,
      rotate: o.rotate,
      transform3d: o.transform3d,
      easing: "easeInOut",
    });
  }
  return kfs;
}
