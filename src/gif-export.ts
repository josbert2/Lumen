import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { toCanvas } from "html-to-image";

export type GifExportOptions = {
  fps: number;
  duration: number; // seconds
  width: number;
  height: number;
  /** Called once per frame with (frameIndex, total). */
  onProgress?: (i: number, total: number) => void;
  /**
   * Called before each frame. Should mutate animation state so the next render
   * shows that frame.
   */
  setAnimationProgress: (t: number) => void;
  /** Wait one tick so the DOM updates between progress calls. */
  flush: () => Promise<void>;
  /** The element to capture. */
  target: HTMLElement;
};

export async function exportGif(opts: GifExportOptions): Promise<Blob> {
  const totalFrames = Math.max(2, Math.round(opts.fps * opts.duration));
  const delay = Math.round(1000 / opts.fps);
  const gif = GIFEncoder();

  for (let i = 0; i < totalFrames; i++) {
    const t = i / (totalFrames - 1);
    opts.setAnimationProgress(t);
    await opts.flush();

    const canvas = await toCanvas(opts.target, {
      pixelRatio: 1,
      cacheBust: false,
      width: opts.width,
      height: opts.height,
    });

    const ctx = canvas.getContext("2d")!;
    const data = ctx.getImageData(0, 0, opts.width, opts.height).data;
    // gifenc expects Uint8Array RGBA
    const rgba = new Uint8Array(data.buffer);
    const palette = quantize(rgba, 256, { format: "rgba4444" });
    const indexed = applyPalette(rgba, palette, "rgba4444");
    gif.writeFrame(indexed, opts.width, opts.height, { palette, delay });

    opts.onProgress?.(i + 1, totalFrames);
    // Yield to UI
    await new Promise((r) => setTimeout(r, 0));
  }

  gif.finish();
  const bytes = gif.bytes();
  // Copy into a fresh ArrayBuffer to satisfy the BlobPart type (avoids SAB issue)
  const ab = new ArrayBuffer(bytes.length);
  new Uint8Array(ab).set(bytes);
  return new Blob([ab], { type: "image/gif" });
}
