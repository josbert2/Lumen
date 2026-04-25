// All static data for Lumen: aspect ratios, colors, gradients, devices, presets.

export type AspectRatio = { label: string; w: number; h: number };

export const ASPECT_RATIOS: AspectRatio[] = [
  { label: "4:3 · 1920×1440", w: 1920, h: 1440 },
  { label: "16:9 · 1920×1080", w: 1920, h: 1080 },
  { label: "1:1 · 1440×1440", w: 1440, h: 1440 },
  { label: "9:16 · 1080×1920", w: 1080, h: 1920 },
  { label: "3:2 · 1800×1200", w: 1800, h: 1200 },
  { label: "Twitter · 1600×900", w: 1600, h: 900 },
  { label: "Story · 1080×1920", w: 1080, h: 1920 },
];

// ── Backgrounds ────────────────────────────────────────────────────────────

export const SOLID_COLORS = [
  "#ffffff",
  "#f3f4f6",
  "#a1a1aa",
  "#3f3f46",
  "#111111",
  "#fde047",
  "#fb923c",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#84cc16",
  "#f97316",
];

export const GRADIENTS = [
  "linear-gradient(135deg, #ff6b35 0%, #ec4899 50%, #8b5cf6 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
  "linear-gradient(135deg, #fbcfe8 0%, #fde68a 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
  "linear-gradient(135deg, #fef3c7 0%, #fbbf24 50%, #f97316 100%)",
  "linear-gradient(135deg, #fb7185 0%, #f472b6 50%, #c084fc 100%)",
  "linear-gradient(180deg, #fde047 0%, #f97316 100%)",
];

export const GLASS_GRADIENTS = [
  "radial-gradient(circle at 30% 30%, #4f46e5 0%, #0e7490 50%, #0f172a 100%)",
  "radial-gradient(circle at 70% 30%, #f472b6 0%, #c026d3 40%, #1e1b4b 100%)",
  "radial-gradient(circle at 50% 50%, #fde047 0%, #f97316 50%, #831843 100%)",
  "radial-gradient(circle at 20% 80%, #34d399 0%, #0891b2 50%, #0f172a 100%)",
  "conic-gradient(from 0deg at 50% 50%, #ec4899, #8b5cf6, #06b6d4, #ec4899)",
  "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05)), radial-gradient(circle at 30% 30%, #ec4899, #1e1b4b)",
];

export const COSMIC_GRADIENTS = [
  "radial-gradient(ellipse at top, #312e81, #0f0f23 70%)",
  "radial-gradient(circle at 50% 0%, #6d28d9 0%, #1e1b4b 60%, #020617 100%)",
  "radial-gradient(circle at 80% 20%, #ec4899 0%, #6d28d9 30%, #0f0f23 70%)",
  "linear-gradient(180deg, #020617 0%, #1e1b4b 50%, #4c1d95 100%)",
  "radial-gradient(circle at 20% 50%, #f59e0b 0%, #be185d 30%, #0f0f23 70%)",
];

export const MYSTIC_GRADIENTS = [
  "linear-gradient(135deg, #34d399 0%, #6366f1 100%)",
  "radial-gradient(circle at 30% 70%, #fcd34d 0%, #ec4899 50%, #6d28d9 100%)",
  "linear-gradient(135deg, #fbbf24 0%, #ec4899 50%, #312e81 100%)",
  "radial-gradient(ellipse at center, #fef3c7 0%, #ec4899 50%, #1e1b4b 100%)",
];

// ── Devices ────────────────────────────────────────────────────────────────

export type DeviceFrameId =
  | "none"
  | "browser-safari"
  | "browser-chrome"
  | "browser-dark"
  | "macbook"
  | "iphone"
  | "ipad";

export const DEVICE_FRAMES: { id: DeviceFrameId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "browser-safari", label: "Safari" },
  { id: "browser-chrome", label: "Chrome" },
  { id: "browser-dark", label: "Dark" },
  { id: "macbook", label: "MacBook" },
  { id: "iphone", label: "iPhone" },
  { id: "ipad", label: "iPad" },
];

// ── 3D transform presets ───────────────────────────────────────────────────

export type Transform3D = {
  id: string;
  label: string;
  rx: number;
  ry: number;
  rz: number;
  perspective: number;
};

export const TRANSFORM_PRESETS: Transform3D[] = [
  { id: "flat", label: "Flat", rx: 0, ry: 0, rz: 0, perspective: 1500 },
  { id: "tilt-l", label: "Tilt L", rx: 0, ry: 15, rz: 0, perspective: 1500 },
  { id: "tilt-r", label: "Tilt R", rx: 0, ry: -15, rz: 0, perspective: 1500 },
  { id: "lean-back", label: "Lean", rx: 15, ry: 0, rz: 0, perspective: 1500 },
  { id: "tower", label: "Tower", rx: -8, ry: 0, rz: 0, perspective: 1500 },
  { id: "iso-l", label: "Iso L", rx: 25, ry: -25, rz: 15, perspective: 1800 },
  { id: "iso-r", label: "Iso R", rx: 25, ry: 25, rz: -15, perspective: 1800 },
  { id: "orbit", label: "Orbit", rx: 18, ry: 18, rz: -3, perspective: 1500 },
  { id: "spin", label: "Spin", rx: 5, ry: 35, rz: 0, perspective: 1500 },
  { id: "drift", label: "Drift", rx: -10, ry: -20, rz: 5, perspective: 1500 },
  { id: "card", label: "Card", rx: 8, ry: 12, rz: -2, perspective: 1500 },
  { id: "deep", label: "Deep", rx: 30, ry: 0, rz: 0, perspective: 1200 },
];

// ── Layout presets (stage-level zoom + rotation) ───────────────────────────

export const LAYOUT_PRESETS = [
  { id: "center", label: "Center", zoom: 1, rotate: 0 },
  { id: "tilt-l", label: "Tilt L", zoom: 0.85, rotate: -8 },
  { id: "tilt-r", label: "Tilt R", zoom: 0.85, rotate: 8 },
  { id: "zoom-out", label: "Zoom out", zoom: 0.7, rotate: 0 },
];
