import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";
import { ImportError } from "../providers/parse";

export interface AiPalette {
  accent: string;
  swatches: string[];
}

/**
 * Ask the palette function whether an LLM key is actually configured, so the
 * AI button can hide (not just fail) on deployments without one. Any error —
 * missing function, network, auth — reads as "not configured".
 */
export async function aiPaletteConfigured(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.functions.invoke("palette", {
      body: { probe: true },
    });
    if (error) return false;
    return Boolean((data as { configured?: boolean } | null)?.configured);
  } catch {
    return false;
  }
}

/** Ask the server-side palette function (LLM key never reaches the client). */
export async function aiPaletteFromUrl(url: string): Promise<AiPalette> {
  if (!supabase) throw new ImportError("Accounts are not configured on this deployment.");
  const { data, error } = await supabase.functions.invoke("palette", { body: { url } });
  if (error) {
    let message = "The AI palette is unavailable right now.";
    if (error instanceof FunctionsHttpError) {
      try {
        const body = (await error.context.json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // keep the generic message
      }
    }
    throw new ImportError(message);
  }
  const result = data as Partial<AiPalette> | null;
  if (!result?.accent) throw new ImportError("The AI palette gave an unusable answer.");
  return { accent: result.accent, swatches: result.swatches ?? [] };
}
