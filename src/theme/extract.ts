import { medianCut, rgbToHexString } from "./quantize";
import { ImportError } from "../providers/parse";

const PALETTE_SIZE = 6;

function paletteFromImage(img: HTMLImageElement | ImageBitmap): string[] {
  const width = Math.min(256, img.width || 256);
  const scale = width / (img.width || width);
  const height = Math.max(1, Math.round((img.height || width) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImportError("Canvas is not available in this browser.");
  ctx.drawImage(img, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  return medianCut(data, PALETTE_SIZE).map(rgbToHexString);
}

/** Extract dominant colors from an uploaded screenshot/image file. */
export async function paletteFromFile(file: File): Promise<string[]> {
  if (!/^image\//.test(file.type)) {
    throw new ImportError("Choose an image file (PNG, JPEG, WebP…).");
  }
  if (file.size > 10_000_000) {
    throw new ImportError("That image is too large (limit 10 MB).");
  }
  try {
    const bitmap = await createImageBitmap(file);
    const palette = paletteFromImage(bitmap);
    bitmap.close();
    if (palette.length === 0) throw new ImportError("Could not read any colors from that image.");
    return palette;
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError("Could not decode that image.");
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => reject(new Error("timeout")), 8000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("load failed"));
    };
    img.src = src;
  });
}

/**
 * Extract colors from a website by sampling its favicon. Everything runs
 * client-side, so we lean on CORS-friendly favicon mirrors first and fall
 * back to the site's own /favicon.ico.
 */
export async function paletteFromUrl(url: string): Promise<string[]> {
  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//.test(url) ? url : `https://${url}`);
  } catch {
    throw new ImportError("That does not look like a valid URL.");
  }
  const host = parsed.hostname;
  // Ordered by reliability; all three mirrors send Access-Control-Allow-Origin: *
  // (Google/DuckDuckGo favicon endpoints do not, so a canvas would taint).
  const candidates = [
    `https://unavatar.io/${encodeURIComponent(host)}`,
    `https://icon.horse/icon/${encodeURIComponent(host)}`,
    `https://favicone.com/${encodeURIComponent(host)}?s=128`,
    `${parsed.origin}/favicon.ico`,
  ];
  for (const candidate of candidates) {
    try {
      const img = await loadImage(candidate);
      const palette = paletteFromImage(img);
      if (palette.length > 0) return palette;
    } catch {
      // tainted canvas, CORS block, or 404 — try the next source
    }
  }
  throw new ImportError(
    "Could not read that site's colors (its icons block cross-origin access). Try uploading a screenshot instead.",
  );
}
