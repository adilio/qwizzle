import { ImportError, MAX_TEXT_BYTES } from "./parse";

const FETCH_TIMEOUT_MS = 10_000;

/** Bounded fetch: 10s timeout, 1 MB cap — imported URLs are untrusted. */
export async function fetchText(url: string, authHeader?: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ImportError("That does not look like a valid URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new ImportError("Only http(s) URLs are supported.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {};
    if (authHeader) {
      const colon = authHeader.indexOf(":");
      if (colon > 0) {
        headers[authHeader.slice(0, colon).trim()] = authHeader.slice(colon + 1).trim();
      } else {
        headers.Authorization = authHeader.trim();
      }
    }
    const response = await fetch(parsed.toString(), { headers, signal: controller.signal });
    if (!response.ok) {
      throw new ImportError(`The server answered ${response.status} ${response.statusText}.`);
    }
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_TEXT_BYTES) {
      throw new ImportError("That resource is too large (limit 1 MB).");
    }
    const text = await response.text();
    if (new Blob([text]).size > MAX_TEXT_BYTES) {
      throw new ImportError("That resource is too large (limit 1 MB).");
    }
    return text;
  } catch (error) {
    if (error instanceof ImportError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ImportError("The request timed out after 10 seconds.");
    }
    throw new ImportError(
      "Could not fetch that URL — the site may not allow cross-origin requests.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export interface GistRef {
  id: string;
  /** Set when the URL already points at one raw file. */
  rawUrl?: string;
}

/** Accepts gist.github.com/user/id[/...] and gist.githubusercontent.com raw links. */
export function parseGistUrl(url: string): GistRef {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ImportError("That does not look like a valid URL.");
  }
  if (parsed.hostname === "gist.githubusercontent.com") {
    const id = parsed.pathname.split("/").filter(Boolean)[1];
    if (!id) throw new ImportError("Could not find a gist id in that URL.");
    return { id, rawUrl: parsed.toString() };
  }
  if (parsed.hostname === "gist.github.com") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    const id = segments.find((s) => /^[0-9a-f]{8,}$/i.test(s));
    if (!id) throw new ImportError("Could not find a gist id in that URL.");
    return { id };
  }
  throw new ImportError("Expected a gist.github.com URL.");
}

interface GistFile {
  filename: string;
  raw_url: string;
  truncated?: boolean;
  content?: string;
}

/** Resolve a gist to the text + format hint of its first JSON/CSV file. */
export async function fetchGist(ref: GistRef): Promise<{ text: string; hint: string }> {
  if (ref.rawUrl) {
    return { text: await fetchText(ref.rawUrl), hint: ref.rawUrl };
  }
  const body = await fetchText(`https://api.github.com/gists/${ref.id}`);
  let files: GistFile[];
  try {
    const data = JSON.parse(body) as { files?: Record<string, GistFile> };
    files = Object.values(data.files ?? {});
  } catch {
    throw new ImportError("Unexpected response from the GitHub API.");
  }
  if (files.length === 0) throw new ImportError("That gist has no files.");
  const file =
    files.find((f) => /\.(json|csv)$/i.test(f.filename)) ??
    files.find((f) => /\.(txt)$/i.test(f.filename)) ??
    files[0];
  if (file.content && !file.truncated) {
    return { text: file.content, hint: file.filename };
  }
  return { text: await fetchText(file.raw_url), hint: file.filename };
}
