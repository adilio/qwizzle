/** YYYY-MM-DD in UTC, so everyone flips to the next daily at the same moment. */
export function utcDateKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** FNV-1a 32-bit — tiny, deterministic, good enough spread for puzzle picks. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Per-wordlist daily puzzle: everyone playing the same wordlist gets the same
 * answer on a given UTC day, while different wordlists get independent picks.
 */
export function dailyIndex(
  wordlistId: string,
  listLength: number,
  date: Date = new Date(),
): number {
  if (listLength <= 0) throw new Error("wordlist is empty");
  return hashString(`${wordlistId}-${utcDateKey(date)}`) % listLength;
}

export function randomIndex(listLength: number, rng: () => number = Math.random): number {
  if (listLength <= 0) throw new Error("wordlist is empty");
  return Math.floor(rng() * listLength) % listLength;
}
