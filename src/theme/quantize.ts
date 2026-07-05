/** Hand-rolled median-cut color quantization — no dependency needed. */

export type Rgb = [number, number, number];

/**
 * Reduce RGBA pixel data to `count` representative colors, ordered by how
 * many pixels each bucket holds. Transparent pixels are skipped.
 */
export function medianCut(data: Uint8ClampedArray | number[], count: number): Rgb[] {
  const pixels: Rgb[] = [];
  // Sample at most ~20k pixels for speed on big screenshots.
  const total = Math.floor(data.length / 4);
  const step = Math.max(1, Math.floor(total / 20_000));
  for (let i = 0; i < total; i += step) {
    const offset = i * 4;
    if (data[offset + 3] < 128) continue;
    pixels.push([data[offset], data[offset + 1], data[offset + 2]]);
  }
  if (pixels.length === 0) return [];

  interface Bucket {
    pixels: Rgb[];
  }
  const buckets: Bucket[] = [{ pixels }];

  while (buckets.length < count) {
    // Split the biggest bucket along its widest channel.
    let widest = -1;
    let widestChannel = 0;
    let widestIndex = -1;
    buckets.forEach((bucket, index) => {
      if (bucket.pixels.length < 2) return;
      for (let channel = 0; channel < 3; channel += 1) {
        let min = 255;
        let max = 0;
        for (const p of bucket.pixels) {
          if (p[channel] < min) min = p[channel];
          if (p[channel] > max) max = p[channel];
        }
        const range = max - min;
        if (range > widest) {
          widest = range;
          widestChannel = channel;
          widestIndex = index;
        }
      }
    });
    if (widestIndex === -1 || widest === 0) break;

    const bucket = buckets[widestIndex];
    bucket.pixels.sort((a, b) => a[widestChannel] - b[widestChannel]);
    // Split at the value midpoint (not the pixel median) so a small distinct
    // color cluster separates cleanly from a dominant one.
    const low = bucket.pixels[0][widestChannel];
    const high = bucket.pixels[bucket.pixels.length - 1][widestChannel];
    const threshold = (low + high) / 2;
    let middle = bucket.pixels.findIndex((p) => p[widestChannel] > threshold);
    middle = Math.min(Math.max(middle, 1), bucket.pixels.length - 1);
    buckets.splice(widestIndex, 1, { pixels: bucket.pixels.slice(0, middle) }, {
      pixels: bucket.pixels.slice(middle),
    });
  }

  return buckets
    .filter((bucket) => bucket.pixels.length > 0)
    .sort((a, b) => b.pixels.length - a.pixels.length)
    .map((bucket) => {
      const sum = bucket.pixels.reduce(
        (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]] as Rgb,
        [0, 0, 0] as Rgb,
      );
      const n = bucket.pixels.length;
      return [Math.round(sum[0] / n), Math.round(sum[1] / n), Math.round(sum[2] / n)] as Rgb;
    });
}

export function rgbToHexString([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
