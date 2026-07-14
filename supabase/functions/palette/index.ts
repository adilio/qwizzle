// AI-inspired palette from a URL. Guarded on every axis (§6 of the plan):
// requires an authenticated session (verify_jwt), per-user rate limit that
// FAILS CLOSED when its storage is unavailable, bounded request size, cheap
// model with small max_tokens and a timeout plus a server-side fallback model,
// a clean 503 when no LLM key is configured, and a {probe:true} mode so the
// client can discover configuration and hide the feature when absent.
import { createClient } from "npm:@supabase/supabase-js@2";

const RATE_LIMIT_PER_HOUR = 10;
// Primary is the cheap model; the fallback keeps the feature working when the
// primary is unavailable or declines. Both run server-side; the key never
// leaves this function.
const MODELS = ["claude-haiku-4-5-20251001", "claude-opus-4-8"];
const MODEL_TIMEOUT_MS = 12_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const HEX = /^#[0-9a-f]{6}$/i;

interface Palette {
  accent: string;
  swatches: string[];
}

/** One bounded model call; null on any failure so the caller can fall back. */
async function requestPalette(apiKey: string, model: string, url: string): Promise<Palette | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content:
              `Suggest a color palette inspired by the brand or website at ${url}. ` +
              `Reply with ONLY a JSON object, no prose: ` +
              `{"accent":"#rrggbb","swatches":["#rrggbb", ...4-6 supporting colors...]}`,
          },
        ],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.stop_reason === "refusal") return null;
    const text: string = data?.content?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const accent = HEX.test(String(parsed.accent)) ? String(parsed.accent).toLowerCase() : null;
    const swatches = Array.isArray(parsed.swatches)
      ? parsed.swatches
          .filter((s: unknown) => HEX.test(String(s)))
          .map((s: unknown) => String(s).toLowerCase())
          .slice(0, 8)
      : [];
    if (!accent && swatches.length === 0) return null;
    return { accent: accent ?? swatches[0], swatches };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const apiKey = Deno.env.get("LLM_API_KEY");

  // verify_jwt already rejected anonymous calls; resolve the user for the
  // rate limit ledger.
  const authHeader = req.headers.get("Authorization") ?? "";
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: userData, error: userError } = await admin.auth.getUser(
    authHeader.replace(/^Bearer\s+/i, ""),
  );
  if (userError || !userData.user) return json(401, { error: "Sign in to use the AI palette." });
  const userId = userData.user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Send JSON: {url}" });
  }

  // Configuration discovery: lets the client hide the AI button when no key
  // is set, without spending a rate-limit slot or a model call.
  if (body.probe === true) {
    return json(200, { configured: Boolean(apiKey) });
  }

  if (!apiKey) return json(503, { error: "AI palette is not configured." });

  let url = String(body.url ?? "");
  if (url.length > 2048) return json(400, { error: "URL too long." });
  try {
    const parsed = new URL(/^https?:\/\//.test(url) ? url : `https://${url}`);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
    url = parsed.toString();
  } catch {
    return json(400, { error: "That does not look like a valid URL." });
  }

  // Rate limiting FAILS CLOSED: if the ledger can't be read or written, this
  // paid endpoint refuses rather than running unmetered.
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count, error: countError } = await admin
    .from("palette_calls")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("called_at", hourAgo);
  if (countError) {
    return json(503, { error: "The AI palette is temporarily unavailable — try again later." });
  }
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return json(429, { error: "Rate limit reached — try again in a bit." });
  }
  const { error: insertError } = await admin.from("palette_calls").insert({ user_id: userId });
  if (insertError) {
    return json(503, { error: "The AI palette is temporarily unavailable — try again later." });
  }

  for (const model of MODELS) {
    const palette = await requestPalette(apiKey, model, url);
    if (palette) return json(200, palette);
  }
  return json(502, { error: "The palette model is unavailable right now — try again." });
});
