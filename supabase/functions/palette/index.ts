// AI-inspired palette from a URL. Guarded on every axis (§6 of the plan):
// requires an authenticated session (verify_jwt), per-user rate limit,
// bounded request size, cheap model with small max_tokens and a timeout,
// and a clean 503 when no LLM key is configured so the client can hide it.
import { createClient } from "npm:@supabase/supabase-js@2";

const RATE_LIMIT_PER_HOUR = 10;
const MODEL = "claude-haiku-4-5-20251001";
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const apiKey = Deno.env.get("LLM_API_KEY");
  if (!apiKey) return json(503, { error: "AI palette is not configured." });

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

  let url: string;
  try {
    const body = await req.json();
    url = String(body.url ?? "");
  } catch {
    return json(400, { error: "Send JSON: {url}" });
  }
  if (url.length > 2048) return json(400, { error: "URL too long." });
  try {
    const parsed = new URL(/^https?:\/\//.test(url) ? url : `https://${url}`);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
    url = parsed.toString();
  } catch {
    return json(400, { error: "That does not look like a valid URL." });
  }

  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin
    .from("palette_calls")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("called_at", hourAgo);
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return json(429, { error: "Rate limit reached — try again in a bit." });
  }
  await admin.from("palette_calls").insert({ user_id: userId });

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
        model: MODEL,
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
    if (!response.ok) return json(502, { error: "The palette model is unavailable right now." });
    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return json(502, { error: "The model gave an unusable answer — try again." });
    const parsed = JSON.parse(match[0]);
    const accent = HEX.test(String(parsed.accent)) ? String(parsed.accent).toLowerCase() : null;
    const swatches = Array.isArray(parsed.swatches)
      ? parsed.swatches
          .filter((s: unknown) => HEX.test(String(s)))
          .map((s: unknown) => String(s).toLowerCase())
          .slice(0, 8)
      : [];
    if (!accent && swatches.length === 0) {
      return json(502, { error: "The model gave an unusable answer — try again." });
    }
    return json(200, { accent: accent ?? swatches[0], swatches });
  } catch {
    return json(502, { error: "The palette request timed out — try again." });
  } finally {
    clearTimeout(timeout);
  }
});
