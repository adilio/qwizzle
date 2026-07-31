// AI-inspired palette from a URL. Ported from the Supabase Edge Function
// (supabase/functions/palette/index.ts) with every guard intact: requires an
// authenticated caller, per-user rate limit that FAILS CLOSED when its storage
// is unavailable, bounded request size, cheap model with small max_tokens and a
// timeout plus a server-side fallback model, a clean 503 when no LLM key is
// configured, and a {probe:true} mode so the client can discover configuration
// and hide the feature when absent.
//
// It runs on Netlify rather than Firebase because Cloud Functions now require
// the Blaze plan, and this app is deliberately staying on Spark. The two pieces
// Supabase used to provide are replaced like-for-like: `verify_jwt` becomes a
// Firebase Admin `verifyIdToken`, and the `palette_calls` table becomes a
// Netlify Blobs store.
import { getStore } from "@netlify/blobs";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const RATE_LIMIT_PER_HOUR = 10;
const RATE_WINDOW_MS = 3_600_000;
// Primary is the cheap model; the fallback keeps the feature working when the
// primary is unavailable or declines. Both run server-side; the key never
// leaves this function.
const MODELS = ["claude-haiku-4-5-20251001", "claude-opus-4-8"];
const MODEL_TIMEOUT_MS = 12_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
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

/**
 * Firebase Admin, initialised once per container from a service-account JSON in
 * the environment. Returns null when the credential is absent or unparseable,
 * which the caller turns into a refusal — an unverifiable caller must never be
 * treated as authenticated.
 */
function adminAuth() {
  try {
    if (!getApps().length) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) return null;
      initializeApp({ credential: cert(JSON.parse(raw)) });
    }
    return getAuth(getApp());
  } catch {
    return null;
  }
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

/**
 * Sliding-hour rate limit over Netlify Blobs, replacing the `palette_calls`
 * table. One blob per user holds the timestamps of recent calls; entries older
 * than the window are dropped on each read.
 *
 * Returns "ok" | "limited" | "unavailable". "unavailable" is deliberately
 * distinct: every storage failure has to be visible to the caller so it can
 * refuse. This endpoint spends money, and running unmetered because the ledger
 * is down is worse than being briefly unavailable.
 *
 * Note this is best-effort under concurrency — Blobs has no compare-and-swap,
 * so two simultaneous calls can both read the same count and each write back.
 * The Postgres version had the same weakness (count-then-insert, no
 * constraint). The limit is a cost guard, not a security boundary, and the
 * worst case is a couple of extra calls in the same second.
 */
async function checkRate(userId: string): Promise<"ok" | "limited" | "unavailable"> {
  try {
    const store = getStore("palette-calls");
    const now = Date.now();
    const existing = (await store.get(userId, { type: "json" })) as number[] | null;
    const recent = (Array.isArray(existing) ? existing : []).filter(
      (t) => typeof t === "number" && now - t < RATE_WINDOW_MS,
    );
    if (recent.length >= RATE_LIMIT_PER_HOUR) return "limited";
    recent.push(now);
    await store.setJSON(userId, recent);
    return "ok";
  } catch {
    return "unavailable";
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const apiKey = process.env.LLM_API_KEY;

  // Supabase enforced this with verify_jwt before the function ever ran; here
  // it is the first thing the handler does, and it fails closed if the Admin
  // credential itself is missing.
  const auth = adminAuth();
  if (!auth) {
    return json(503, { error: "The AI palette is temporarily unavailable — try again later." });
  }
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Sign in to use the AI palette." });

  let userId: string;
  try {
    userId = (await auth.verifyIdToken(token)).uid;
  } catch {
    return json(401, { error: "Sign in to use the AI palette." });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
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

  const rate = await checkRate(userId);
  if (rate === "unavailable") {
    return json(503, { error: "The AI palette is temporarily unavailable — try again later." });
  }
  if (rate === "limited") {
    return json(429, { error: "Rate limit reached — try again in a bit." });
  }

  for (const model of MODELS) {
    const palette = await requestPalette(apiKey, model, url);
    if (palette) return json(200, palette);
  }
  return json(502, { error: "The palette model is unavailable right now — try again." });
}
