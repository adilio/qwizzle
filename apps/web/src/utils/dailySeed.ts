import type { Category } from "@qwizzle/providers";

export function dailySeed(category: Category, listLength: number): number {
  const date = new Date().toISOString().split("T")[0];
  const key = `${category}-${date}`;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) % Math.max(listLength, 1);
}
