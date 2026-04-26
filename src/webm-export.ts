// WebM export via WebCodecs (VP9) + webm-muxer.
// Same browser support story as MP4: Chrome/Edge fully, Safari 16.4+,
// Firefox 130+ (Firefox actually has BETTER VP9 support than H.264).

import { Muxer, ArrayBufferTarget } from "webm-muxer";
import { toCanvas } from "html-to-image";

export type WebmExportOptions = {
  fps: number;
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  target: HTMLElement;
  setAnimationProgress: (t: number) => void;
  flush: () => Promise<void>;
  onProgress?: (i: number, total: number) => void;
};

export function isWebmSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as any).VideoEncoder !== "undefined" &&
    typeof (window as any).VideoFrame !== "undefined"
  );
}

export async function exportWebm(opts: WebmExportOptions): Promise<Blob> {
  if (!isWebmSupported()) {
    throw new Error("WebCodecs not available in this browser.");
  }

  const w = opts.width;
  const h = opts.height;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: "V_VP9",
      width: w,
      height: h,
      frameRate: opts.fps,
    },
  });

  const encoder = new (window as any).VideoEncoder({
    output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
    error: (e: Error) => console.error("[webm] encoder error", e),
  });

  encoder.configure({
    codec: "vp09.00.10.08", // VP9 profile 0, level 1.0, 8-bit
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

    const frame = new (window as any).VideoFrame(canvas, {
      timestamp: i * frameDurationUs,
      duration: frameDurationUs,
    });
    const keyFrame = i % Math.round(opts.fps * 2) === 0;
    encoder.encode(frame, { keyFrame });
    frame.close();

    opts.onProgress?.(i + 1, totalFrames);

    if (encoder.encodeQueueSize > 4) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  return new Blob([muxer.target.buffer], { type: "video/webm" });
}
