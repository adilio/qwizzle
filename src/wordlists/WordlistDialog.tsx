import { useRef, useState } from "react";
import { Modal } from "../game/Modal";
import { ImportError } from "../providers/parse";
import {
  fileProvider,
  gistProvider,
  pasteProvider,
  urlProvider,
} from "../providers/providers";
import type { WordProvider } from "../providers/providers";
import type { Wordlist } from "../providers/types";

type ImportTab = "file" | "paste" | "url" | "gist";

interface WordlistDialogProps {
  open: boolean;
  onClose: () => void;
  lists: Wordlist[];
  activeId: string;
  onSelect: (id: string) => void;
  onImported: (wordlist: Wordlist) => void;
  onRemove: (id: string) => void;
}

export function WordlistDialog({
  open,
  onClose,
  lists,
  activeId,
  onSelect,
  onImported,
  onRemove,
}: WordlistDialogProps) {
  const [tab, setTab] = useState<ImportTab>("file");
  const [pasteText, setPasteText] = useState("");
  const [url, setUrl] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [gistUrl, setGistUrl] = useState("");
  const [listName, setListName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function runImport(provider: WordProvider) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    setWarnings([]);
    try {
      const { wordlist, warnings: importWarnings } = await provider.load();
      const named = listName.trim() ? { ...wordlist, name: listName.trim() } : wordlist;
      onImported(named);
      setSuccess(`Imported ${named.entries.length} words as “${named.name}” — now active.`);
      setWarnings(importWarnings);
      setPasteText("");
      setListName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof ImportError ? err.message : "Import failed unexpectedly.");
    } finally {
      setBusy(false);
    }
  }

  function handleImportClick() {
    if (tab === "file") {
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        setError("Choose a .json or .csv file first.");
        return;
      }
      void runImport(fileProvider(file));
    } else if (tab === "paste") {
      void runImport(pasteProvider(pasteText, listName.trim() || "Pasted list"));
    } else if (tab === "url") {
      void runImport(urlProvider(url.trim(), authHeader.trim() || undefined));
    } else {
      void runImport(gistProvider(gistUrl.trim()));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Word lists">
      <section aria-label="Your lists" className="wordlists">
        {lists.map((list) => (
          <div key={list.id} className="wordlists__row">
            <label className="wordlists__pick">
              <input
                type="radio"
                name="active-wordlist"
                checked={list.id === activeId}
                onChange={() => onSelect(list.id)}
              />
              <span>
                <strong>{list.name}</strong>{" "}
                <span className="wordlists__meta">
                  {list.entries.length} words · {list.sourceType}
                </span>
              </span>
            </label>
            {list.sourceType !== "builtin" && (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => onRemove(list.id)}
                aria-label={`Delete ${list.name}`}
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </section>

      <hr className="rule" />

      <h3 className="subheading">Import a new list</h3>
      <div className="tabs" role="tablist" aria-label="Import source">
        {(
          [
            ["file", "File"],
            ["paste", "Paste"],
            ["url", "URL / API"],
            ["gist", "Gist"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className="chip"
            data-active={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="import-name">List name (optional)</label>
        <input
          id="import-name"
          className="input"
          type="text"
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          placeholder="My custom list"
        />
      </div>

      {tab === "file" && (
        <div className="field">
          <label htmlFor="import-file">JSON or CSV file</label>
          <input id="import-file" ref={fileInputRef} type="file" accept=".json,.csv" />
          <p className="hint">
            JSON: an array of {"{word, definition, expansion}"}. CSV columns:
            word,definition,expansion (header optional).
          </p>
        </div>
      )}
      {tab === "paste" && (
        <div className="field">
          <label htmlFor="import-paste">Paste words</label>
          <textarea
            id="import-paste"
            className="input"
            rows={6}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"SOC=Security Operations Center\nIOC=Indicator of Compromise"}
          />
          <p className="hint">One per line: WORD=Definition or WORD,Definition — or paste JSON/CSV.</p>
        </div>
      )}
      {tab === "url" && (
        <>
          <div className="field">
            <label htmlFor="import-url">URL of a JSON or CSV list</label>
            <input
              id="import-url"
              className="input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/words.csv"
            />
            <p className="hint">
              Tip: a published Google Sheet works here — File → Share → Publish to web → CSV, then
              paste that link.
            </p>
          </div>
          <div className="field">
            <label htmlFor="import-auth">Auth header (optional)</label>
            <input
              id="import-auth"
              className="input"
              type="text"
              value={authHeader}
              onChange={(e) => setAuthHeader(e.target.value)}
              placeholder="Authorization: Bearer …"
            />
          </div>
        </>
      )}
      {tab === "gist" && (
        <div className="field">
          <label htmlFor="import-gist">GitHub Gist URL</label>
          <input
            id="import-gist"
            className="input"
            type="url"
            value={gistUrl}
            onChange={(e) => setGistUrl(e.target.value)}
            placeholder="https://gist.github.com/you/abc123"
          />
          <p className="hint">The first JSON or CSV file in the gist is used.</p>
        </div>
      )}

      <div className="modal__actions">
        <button
          type="button"
          className="btn btn--accent"
          onClick={handleImportClick}
          disabled={busy}
        >
          {busy ? "Importing…" : "Import"}
        </button>
      </div>

      {error && (
        <p className="modal__status" data-tone="error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="modal__status" data-tone="success" aria-live="polite">
          {success}
        </p>
      )}
      {warnings.length > 0 && (
        <details className="warnings">
          <summary>{warnings.length} rows were skipped</summary>
          <ul>
            {warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
    </Modal>
  );
}
