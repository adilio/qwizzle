import type { WordEntry } from "../engine";

export const MAX_ENTRIES = 5000;
export const MAX_TEXT_BYTES = 1_000_000;
const MAX_WORD_LENGTH = 12;
const MIN_WORD_LENGTH = 2;
const MAX_DEFINITION_LENGTH = 800;

export interface ParseResult {
  entries: WordEntry[];
  /** Rows dropped for invalid words, with the reason baked into the text. */
  warnings: string[];
}

export class ImportError extends Error {}

function normalizeOne(raw: unknown): WordEntry | string {
  let word: unknown;
  let definition: unknown;
  let expansion: unknown;
  if (typeof raw === "string") {
    word = raw;
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    word = obj.word ?? obj.w ?? obj.acronym;
    definition = obj.definition ?? obj.clue ?? obj.d;
    expansion = obj.expansion ?? obj.e;
  } else {
    return `skipped a row that is not a word or object`;
  }
  if (typeof word !== "string" || !word.trim()) {
    return `skipped a row with no word`;
  }
  const normalized = word.trim().toUpperCase();
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return `skipped "${word.trim()}" — words may only use A–Z and 0–9`;
  }
  if (normalized.length < MIN_WORD_LENGTH || normalized.length > MAX_WORD_LENGTH) {
    return `skipped "${normalized}" — words must be ${MIN_WORD_LENGTH}–${MAX_WORD_LENGTH} characters`;
  }
  const entry: WordEntry = { word: normalized };
  if (typeof definition === "string" && definition.trim()) {
    entry.definition = definition.trim().slice(0, MAX_DEFINITION_LENGTH);
  }
  if (typeof expansion === "string" && expansion.trim()) {
    entry.expansion = expansion.trim().slice(0, MAX_DEFINITION_LENGTH);
  }
  return entry;
}

export function normalizeEntries(rows: unknown[]): ParseResult {
  if (rows.length > MAX_ENTRIES) {
    throw new ImportError(`Too many rows (${rows.length}); the limit is ${MAX_ENTRIES}.`);
  }
  const entries: WordEntry[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const result = normalizeOne(row);
    if (typeof result === "string") {
      if (warnings.length < 20) warnings.push(result);
      continue;
    }
    if (seen.has(result.word)) {
      if (warnings.length < 20) warnings.push(`skipped duplicate "${result.word}"`);
      continue;
    }
    seen.add(result.word);
    entries.push(result);
  }
  if (entries.length === 0) {
    throw new ImportError("No valid words found. Check the format and try again.");
  }
  return { entries, warnings };
}

export function parseJson(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError("That JSON could not be parsed.");
  }
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? ((data as Record<string, unknown>).words ?? (data as Record<string, unknown>).data)
      : null;
  if (!Array.isArray(rows)) {
    throw new ImportError(
      "Expected a JSON array of words, or an object with a `words` or `data` array.",
    );
  }
  return normalizeEntries(rows);
}

/** Split one CSV line, honoring double quotes and "" escapes. Forgiving. */
export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

export function parseCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) throw new ImportError("The CSV is empty.");

  let columns = { word: 0, definition: 1, expansion: 2 };
  let startIndex = 0;
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  if (header.includes("word") || header.includes("acronym")) {
    const find = (...names: string[]) => {
      const index = header.findIndex((h) => names.includes(h));
      return index === -1 ? -1 : index;
    };
    columns = {
      word: find("word", "acronym"),
      definition: find("definition", "clue"),
      expansion: find("expansion"),
    };
    startIndex = 1;
  }

  const rows = lines.slice(startIndex).map((line) => {
    const fields = splitCsvLine(line);
    return {
      word: fields[columns.word],
      definition: columns.definition >= 0 ? fields[columns.definition] : undefined,
      expansion: columns.expansion >= 0 ? fields[columns.expansion] : undefined,
    };
  });
  return normalizeEntries(rows);
}

/** Line-delimited `WORD=Definition` or `WORD,Definition`, or pasted JSON/CSV. */
export function parsePaste(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) throw new ImportError("Nothing to import — paste some words first.");
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return parseJson(trimmed);
  }
  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const equalsLines = lines.filter((line) => line.includes("=")).length;
  if (equalsLines >= lines.length / 2) {
    const rows = lines.map((line) => {
      const eq = line.indexOf("=");
      return eq === -1
        ? { word: line }
        : { word: line.slice(0, eq), definition: line.slice(eq + 1) };
    });
    return normalizeEntries(rows);
  }
  return parseCsv(trimmed);
}

/** Pick a parser from a filename/content-type hint, else sniff the content. */
export function parseAny(text: string, hint?: string): ParseResult {
  if (new Blob([text]).size > MAX_TEXT_BYTES) {
    throw new ImportError("That file is too large (limit 1 MB).");
  }
  const h = hint?.toLowerCase() ?? "";
  if (h.includes("json")) return parseJson(text);
  if (h.includes("csv")) return parseCsv(text);
  return parsePaste(text);
}
