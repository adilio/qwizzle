import { getAuthClient } from "../firebase/client";
import { ImportError } from "../providers/parse";

export interface AiPalette {
  accent: string;
  swatches: string[];
}

const ENDPOINT = "/.netlify/functions/palette";

/**
 * The palette endpoint is authenticated, so every call carries the current
 * Firebase ID token. Returns null when nobody is signed in, which callers turn
 * into "feature unavailable" rather than sending an anonymous request the
 * server would reject anyway.
 */
async function idToken(): Promise<string | null> {
  const auth = await getAuthClient();
  const user = auth?.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/**
 * Ask the palette function whether an LLM key is actually configured, so the
 * AI button can hide (not just fail) on deployments without one. Any error —
 * missing function, network, auth — reads as "not configured".
 */
export async function aiPaletteConfigured(): Promise<boolean> {
  const token = await idToken();
  if (!token) return false;
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ probe: true }),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { configured?: boolean } | null;
    return Boolean(data?.configured);
  } catch {
    return false;
  }
}

/** Ask the server-side palette function (LLM key never reaches the client). */
export async function aiPaletteFromUrl(url: string): Promise<AiPalette> {
  const token = await idToken();
  if (!token) throw new ImportError("Sign in to use the AI palette.");

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new ImportError("The AI palette is unavailable right now.");
  }

  // The function returns a specific, user-facing reason for every refusal
  // (rate limited, not configured, bad URL). Surface it when present rather
  // than flattening all of them into one generic message.
  if (!response.ok) {
    let message = "The AI palette is unavailable right now.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // keep the generic message
    }
    throw new ImportError(message);
  }

  const result = (await response.json()) as Partial<AiPalette> | null;
  if (!result?.accent) throw new ImportError("The AI palette gave an unusable answer.");
  return { accent: result.accent, swatches: result.swatches ?? [] };
}
