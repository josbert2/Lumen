// MP4 export via WebCodecs + mp4-muxer.
// Browser support: Chrome/Edge fully, Safari 16.4+, Firefox 130+.
// We feature-detect with isMp4Supported() before exposing the button.

import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { toCanvas } from "html-to-image";

export type Mp4ExportOptions = {
  fps: number;
  duration: number; // seconds
  width: number;
  height: number;
  bitrate: number; // bits per second
  target: HTMLElement;
  setAnimationProgress: (t: number) => void;
  flush: () => Promise<void>;
  onProgress?: (i: number, total: number) => void;
};

export function isMp4Supported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as any).VideoEncoder !== "undefined" &&
    typeof (window as any).VideoFrame !== "undefined"
  );
}

/**
 * Pick an H.264 codec string by resolution. We use Constrained Baseline (42)
 * for broad compatibility. Levels jump up with resolution.
 */
function pickH264Codec(width: number, height: number): string {
  const pixels = width * height;
  // Levels: 3.0 (CIF), 3.1 (480p), 4.0 (1080p), 4.1 (1080p high bitrate), 5.0 (4K)
  if (pixels <= 480 * 360) return "avc1.42001E"; // 3.0
  if (pixels <= 720 * 480) return "avc1.42001F"; // 3.1
  if (pixels <= 1280 * 720) return "avc1.420028"; // 4.0
  if (pixels <= 1920 * 1080) return "avc1.420029"; // 4.1
  return "avc1.420032"; // 5.0
}

export async function exportMp4(opts: Mp4ExportOptions): Promise<Blob> {
  if (!isMp4Supported()) {
    throw new Error("WebCodecs / VideoEncoder not available in this browser.");
  }

  // mp4-muxer requires even dimensions for H.264
  const w = opts.width % 2 === 0 ? opts.width : opts.width + 1;
  const h = opts.height % 2 === 0 ? opts.height : opts.height + 1;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: "avc",
      width: w,
      height: h,
      frameRate: opts.fps,
    },
    fastStart: "in-memory",
  });

  const encoder = new (window as any).VideoEncoder({
    output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
    error: (e: Error) => console.error("[mp4] encoder error", e),
  });

  encoder.configure({
    codec: pickH264Codec(w, h),
    width: w,
    height: h,
    bitrate: opts.bitrate,
    framerate: opts.fps,
  });

  const totalFrames = Math.max(2, Math.round(opts.fps * opts.duration));
  const frameDurationUs = Math.round(1_000_000 / opts.fps);

  for (let i = 0; i < totalFrames; i++) {
    const t = i / (totalFrames - 1);
    opts.setAnimationProgress(t);
    await opts.flush();

    const canvas = await toCanvas(opts.target, {
      pixelRatio: 1,
      cacheBust: false,
      width: w,
      height: h,
    });

    // VideoFrame copies the bitmap, so we can dispose the canvas after this
    const frame = new (window as any).VideoFrame(canvas, {
      timestamp: i * frameDurationUs,
      duration: frameDurationUs,
    });
    // Force a keyframe every ~2 seconds for seekability
    const keyFrame = i % Math.round(opts.fps * 2) === 0;
    encoder.encode(frame, { keyFrame });
    frame.close();

    opts.onProgress?.(i + 1, totalFrames);

    // Yield to UI / avoid encoder backpressure
    if (encoder.encodeQueueSize > 4) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  const buffer = muxer.target.buffer;
  return new Blob([buffer], { type: "video/mp4" });
}
