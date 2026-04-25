// "Magic" background: extract dominant colors from an image and
// build a gradient with them. Pure client-side, no dependencies.

export type RGB = [number, number, number];

/** Extract up to N dominant colors from an image data URL or blob URL. */
export function extractPalette(
  imageSrc: string,
  count = 5,
): Promise<RGB[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        // Downsample for speed — 80×80 is plenty
        const w = 80;
        const h = Math.max(1, Math.round((80 * img.height) / img.width));
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        // Bucket by quantizing each channel to 32-step intervals
        const buckets: Map<string, { count: number; r: number; g: number; b: number }> = new Map();
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 200) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Skip near-white and near-black to find "interesting" colors
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (max < 25) continue; // too dark
          if (min > 240 && max - min < 15) continue; // too white/grey
          // Quantize
          const qr = r & 0xe0;
          const qg = g & 0xe0;
          const qb = b & 0xe0;
          const key = `${qr}|${qg}|${qb}`;
          const cur = buckets.get(key);
          if (cur) {
            cur.count++;
            cur.r += r;
            cur.g += g;
            cur.b += b;
          } else {
            buckets.set(key, { count: 1, r, g, b });
          }
        }

        // Sort buckets by frequency, return averaged center colors
        const sorted = Array.from(buckets.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, Math.max(count * 3, 10));

        // Diversify: drop near-duplicates
        const result: RGB[] = [];
        for (const b of sorted) {
          const rgb: RGB = [
            Math.round(b.r / b.count),
            Math.round(b.g / b.count),
            Math.round(b.b / b.count),
          ];
          if (result.every((p) => colorDistance(p, rgb) > 60)) {
            result.push(rgb);
            if (result.length >= count) break;
          }
        }
        if (result.length === 0) result.push([60, 60, 80]);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Could not load image for palette"));
    img.src = imageSrc;
  });
}

function colorDistance(a: RGB, b: RGB): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function rgbToHex(rgb: RGB): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(rgb[0])}${h(rgb[1])}${h(rgb[2])}`;
}

/** Build a smooth diagonal gradient from a palette. */
export function buildMagicGradient(palette: RGB[]): string {
  if (palette.length === 0) return "linear-gradient(135deg, #1e1b4b, #4c1d95)";
  if (palette.length === 1) {
    const c = rgbToHex(palette[0]);
    return `linear-gradient(135deg, ${c}, ${darken(palette[0], 0.4)})`;
  }
  const stops = palette.slice(0, 3).map(rgbToHex);
  return `linear-gradient(135deg, ${stops.join(", ")})`;
}

/** Build a radial mesh gradient — a more dramatic "magic" look. */
export function buildMagicMesh(palette: RGB[]): string {
  if (palette.length < 2) return buildMagicGradient(palette);
  const c0 = rgbToHex(palette[0]);
  const c1 = rgbToHex(palette[1]);
  const c2 = palette[2] ? rgbToHex(palette[2]) : darken(palette[0], 0.5);
  return `
    radial-gradient(circle at 20% 20%, ${c0} 0%, transparent 50%),
    radial-gradient(circle at 80% 30%, ${c1} 0%, transparent 50%),
    radial-gradient(circle at 50% 80%, ${c2} 0%, transparent 60%),
    linear-gradient(180deg, #0f0f23 0%, #1e1b4b 100%)
  `.replace(/\s+/g, " ").trim();
}

function darken(rgb: RGB, amount: number): string {
  const factor = 1 - amount;
  return rgbToHex([
    Math.round(rgb[0] * factor),
    Math.round(rgb[1] * factor),
    Math.round(rgb[2] * factor),
  ]);
}
