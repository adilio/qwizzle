import { useRef, useState } from "react";
import { paletteFromFile, paletteFromUrl } from "../theme/extract";
import { pickAccent, themesFromAccent } from "../theme/derive";
import { aiPaletteFromUrl } from "../theme/aiPalette";
import type { ThemeColors } from "../theme/tokens";
import { ImportError } from "../providers/parse";

interface DeriveColorsProps {
  onApply: (themes: { dark: ThemeColors; light: ThemeColors }) => void;
  /** Signed in AND the palette function reports an LLM key — shows the AI button. */
  aiEnabled: boolean;
}

/**
 * "Colors from a brand" — extract a palette from a site's favicon or an
 * uploaded screenshot, let the user pick the accent swatch, then generate
 * both theme variants for the editor to refine.
 */
export function DeriveColors({ onApply, aiEnabled }: DeriveColorsProps) {
  const [url, setUrl] = useState("");
  const [swatches, setSwatches] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function run(task: () => Promise<string[]>, preferredAccent?: () => string | undefined) {
    setBusy(true);
    setError(null);
    try {
      const palette = await task();
      setSwatches(palette);
      const accent = preferredAccent?.() ?? pickAccent(palette);
      if (accent) {
        onApply(themesFromAccent(accent));
      } else {
        setError("Found only neutral colors — tap a swatch to use it as the accent.");
      }
    } catch (err) {
      setSwatches([]);
      setError(err instanceof ImportError ? err.message : "Color extraction failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <fieldset className="studio__group">
      <legend>Colors from a brand</legend>
      <div className="derive__row">
        <input
          className="input"
          type="text"
          value={url}
          placeholder="example.com"
          aria-label="Website URL to extract colors from"
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="button"
          className="btn btn--small"
          disabled={busy || !url.trim()}
          onClick={() => void run(() => paletteFromUrl(url.trim()))}
        >
          From URL
        </button>
        <button
          type="button"
          className="btn btn--small"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          From screenshot
        </button>
        {aiEnabled && (
          <button
            type="button"
            className="btn btn--small"
            disabled={busy || !url.trim()}
            title="Ask AI for a palette inspired by this site"
            onClick={() => {
              let aiAccent: string | undefined;
              void run(
                async () => {
                  const { accent, swatches } = await aiPaletteFromUrl(url.trim());
                  aiAccent = accent;
                  return [accent, ...swatches.filter((s) => s !== accent)];
                },
                () => aiAccent,
              );
            }}
          >
            ✨ AI palette
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          aria-label="Screenshot to extract colors from"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void run(() => paletteFromFile(file));
          }}
        />
      </div>
      {busy && <p className="hint">Extracting colors…</p>}
      {swatches.length > 0 && (
        <div className="derive__swatches" aria-label="Extracted colors">
          {swatches.map((hex) => (
            <button
              key={hex}
              type="button"
              className="derive__swatch"
              style={{ backgroundColor: hex }}
              title={`Use ${hex} as the accent`}
              aria-label={`Use ${hex} as the accent`}
              onClick={() => onApply(themesFromAccent(hex))}
            />
          ))}
        </div>
      )}
      {swatches.length > 0 && (
        <p className="hint">Tap a swatch to rebuild the theme around that color, then fine-tune below.</p>
      )}
      {error && (
        <p className="modal__status" data-tone="error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
