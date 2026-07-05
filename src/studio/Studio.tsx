import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "../game/Modal";
import { appTitle } from "../brand";
import {
  DEFAULT_DARK,
  DEFAULT_LIGHT,
  TOKEN_GROUPS,
  sanitizeHex,
  themeCssVars,
} from "../theme/tokens";
import type { ThemeColors } from "../theme/tokens";
import { CONTRAST_CHECKS, contrastRatio, fixPalette } from "../theme/contrast";
import {
  exportEditionJson,
  parseEdition,
  sanitizeEditionName,
  wordlistFromRef,
  wordlistRefFor,
} from "../editions/edition";
import type { Edition } from "../editions/edition";
import { ImportError } from "../providers/parse";
import { gistProvider, urlProvider } from "../providers/providers";
import type { Wordlist } from "../providers/types";

type Variant = "dark" | "light";

/** Hex text field that tolerates partial input while typing. */
function HexInput({
  value,
  onCommit,
  label,
}: {
  value: string;
  onCommit: (hex: string) => void;
  label: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      className="input studio__hex"
      type="text"
      value={draft}
      aria-label={label}
      onChange={(e) => {
        setDraft(e.target.value);
        if (sanitizeHex(e.target.value)) onCommit(e.target.value);
      }}
      onBlur={() => {
        if (!sanitizeHex(draft)) setDraft(value);
      }}
    />
  );
}

interface StudioProps {
  open: boolean;
  onClose: () => void;
  edition: Edition;
  onChange: (edition: Edition) => void;
  onReset: () => void;
  lists: Wordlist[];
  activeListId: string;
  onSelectList: (id: string) => void;
  onImportedList: (list: Wordlist) => void;
}

export function Studio({
  open,
  onClose,
  edition,
  onChange,
  onReset,
  lists,
  activeListId,
  onSelectList,
  onImportedList,
}: StudioProps) {
  const [variant, setVariant] = useState<Variant>("dark");
  const [status, setStatus] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const colors = variant === "dark" ? edition.theme.colors : edition.theme.lightColors;

  function setColors(next: ThemeColors) {
    onChange({
      ...edition,
      theme: {
        colors: variant === "dark" ? next : edition.theme.colors,
        lightColors: variant === "light" ? next : edition.theme.lightColors,
      },
    });
  }

  function setToken(key: keyof ThemeColors, value: string) {
    const hex = sanitizeHex(value);
    if (!hex) return;
    setColors({ ...colors, [key]: hex });
  }

  const failures = useMemo(
    () =>
      CONTRAST_CHECKS.map((check) => ({
        ...check,
        ratio: contrastRatio(
          colors[check.fgKey as keyof ThemeColors],
          colors[check.bgKey as keyof ThemeColors],
        ),
      })).filter((check) => check.ratio < check.target),
    [colors],
  );

  function fixContrast() {
    setColors(fixPalette(colors));
    setStatus({ text: "Colors nudged to legible.", tone: "success" });
  }

  function handleExport() {
    const name = edition.editionName
      ? `qwizzle-${edition.editionName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`
      : "qwizzle-edition.json";
    const blob = new Blob([exportEditionJson(edition)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    try {
      const parsed = parseEdition(await file.text());
      onChange(parsed);
      const embedded = wordlistFromRef(parsed.wordlist);
      if (embedded) {
        onImportedList(embedded);
      } else if (parsed.wordlist.source_url) {
        const provider =
          parsed.wordlist.source_type === "gist"
            ? gistProvider(parsed.wordlist.source_url)
            : urlProvider(parsed.wordlist.source_url);
        const { wordlist } = await provider.load();
        onImportedList(parsed.wordlist.name ? { ...wordlist, name: parsed.wordlist.name } : wordlist);
      }
      setStatus({ text: "Edition imported.", tone: "success" });
    } catch (error) {
      setStatus({
        text: error instanceof ImportError ? error.message : "Could not import that edition.",
        tone: "error",
      });
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  const previewVars = themeCssVars(colors) as React.CSSProperties;

  return (
    <Modal open={open} onClose={onClose} title="Studio" wide>
      <div className="studio">
        <div className="studio__editor">
          <div className="field">
            <label htmlFor="edition-name">Edition name (optional)</label>
            <input
              id="edition-name"
              className="input"
              type="text"
              value={edition.editionName}
              maxLength={40}
              placeholder="e.g. Cyber"
              onChange={(e) =>
                onChange({ ...edition, editionName: e.target.value })
              }
              onBlur={(e) =>
                onChange({ ...edition, editionName: sanitizeEditionName(e.target.value) })
              }
            />
            <p className="hint">
              Blank shows plain “Qwizzle”; a name renders “Qwizzle: {"{name}"} Edition”. The
              Qwizzle brand and 4↓ logo are always shown.
            </p>
          </div>

          <div className="field">
            <label htmlFor="edition-wordlist">Word list</label>
            <select
              id="edition-wordlist"
              className="input"
              value={activeListId}
              onChange={(e) => {
                const list = lists.find((l) => l.id === e.target.value);
                if (!list) return;
                onSelectList(list.id);
                onChange({ ...edition, wordlist: wordlistRefFor(list) });
              }}
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.entries.length} words)
                </option>
              ))}
            </select>
            <p className="hint">Import more lists from the Words dialog.</p>
          </div>

          <div className="tabs" role="tablist" aria-label="Theme variant">
            {(["dark", "light"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={variant === v}
                className="chip"
                data-active={variant === v}
                onClick={() => setVariant(v)}
              >
                {v === "dark" ? "Dark colors" : "Light colors"}
              </button>
            ))}
          </div>

          {TOKEN_GROUPS.map(({ group, tokens }) => (
            <fieldset key={group} className="studio__group">
              <legend>{group}</legend>
              {tokens.map(({ key, label }) => (
                <div key={key} className="studio__token">
                  <label htmlFor={`token-${key}`}>{label}</label>
                  <div className="studio__inputs">
                    <input
                      id={`token-${key}`}
                      type="color"
                      value={colors[key]}
                      onChange={(e) => setToken(key, e.target.value)}
                      aria-label={`${label} color picker`}
                    />
                    <HexInput
                      value={colors[key]}
                      onCommit={(hex) => setToken(key, hex)}
                      label={`${label} hex value`}
                    />
                  </div>
                </div>
              ))}
            </fieldset>
          ))}

          <div className="modal__actions studio__actions">
            <button
              type="button"
              className="btn"
              onClick={() =>
                setColors(variant === "dark" ? { ...DEFAULT_DARK } : { ...DEFAULT_LIGHT })
              }
            >
              Reset {variant} colors
            </button>
            <button type="button" className="btn" onClick={onReset}>
              Reset edition
            </button>
            <button type="button" className="btn" onClick={handleExport}>
              Export JSON
            </button>
            <button type="button" className="btn" onClick={() => importRef.current?.click()}>
              Import JSON
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
              }}
            />
          </div>
          {status && (
            <p className="modal__status" data-tone={status.tone} aria-live="polite">
              {status.text}
            </p>
          )}
        </div>

        <div className="studio__preview" style={previewVars} data-testid="studio-preview">
          <div className="studio__preview-inner">
            <div className="studio__preview-header">
              <img src="/favicon.svg" alt="" className="title__logo" />
              <strong>{appTitle(edition.editionName)}</strong>
            </div>
            <p className="studio__preview-muted">Muted text · Puzzle #42 · Daily</p>
            <div className="studio__preview-tiles">
              <div className="t">Q</div>
              <div className="t t--correct">W</div>
              <div className="t t--present">I</div>
              <div className="t t--absent">Z</div>
            </div>
            <div className="studio__preview-keys">
              <button type="button" className="key">
                A
              </button>
              <button type="button" className="key" data-state="correct">
                B
              </button>
              <button type="button" className="key" data-state="present">
                C
              </button>
              <button type="button" className="key" data-state="absent">
                D
              </button>
            </div>
            <div className="studio__preview-buttons">
              <button type="button" className="btn btn--accent">
                Play
              </button>
              <button type="button" className="btn btn--ghost">
                Hint
              </button>
            </div>
            <div className="studio__preview-card">
              <strong>Panel</strong>
              <span className="studio__preview-muted">Definition text lives here.</span>
            </div>
            <p className="message" data-tone="success">
              Solved in 3 tries!
            </p>
            <p className="message" data-tone="error">
              Not enough letters
            </p>
          </div>

          <div className="studio__contrast" aria-live="polite">
            {failures.length === 0 ? (
              <p className="studio__contrast-ok">✓ All contrast checks pass</p>
            ) : (
              <>
                <p className="studio__contrast-bad">
                  {failures.length} contrast {failures.length === 1 ? "issue" : "issues"}:
                </p>
                <ul>
                  {failures.map((f) => (
                    <li key={f.label}>
                      {f.label} ({f.ratio.toFixed(1)}:1, needs {f.target}:1)
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn btn--small" onClick={fixContrast}>
                  Nudge to legible
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
