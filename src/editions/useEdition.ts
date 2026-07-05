import { useCallback, useEffect, useState } from "react";
import { defaultEdition } from "./edition";
import type { Edition } from "./edition";
import { applyTheme } from "../theme/tokens";
import type { ThemeMode } from "../theme/useTheme";
import { loadJson, saveJson } from "../lib/storage";
import { sanitizeColors, DEFAULT_DARK, DEFAULT_LIGHT } from "../theme/tokens";
import { sanitizeEditionName } from "./edition";

const KEY = "qwizzle:edition";

function loadEdition(): Edition {
  const raw = loadJson<Edition>(KEY);
  const base = defaultEdition();
  if (!raw || raw.version !== 1) return base;
  return {
    ...base,
    editionName: sanitizeEditionName(raw.editionName),
    theme: {
      colors: sanitizeColors(raw.theme?.colors, DEFAULT_DARK),
      lightColors: sanitizeColors(raw.theme?.lightColors, DEFAULT_LIGHT),
    },
    wordlist: raw.wordlist ?? base.wordlist,
  };
}

/** The active local edition; applies its palette for the current theme mode. */
export function useEdition(themeMode: ThemeMode) {
  const [edition, setEdition] = useState<Edition>(loadEdition);

  useEffect(() => {
    saveJson(KEY, edition);
  }, [edition]);

  useEffect(() => {
    applyTheme(themeMode === "dark" ? edition.theme.colors : edition.theme.lightColors);
  }, [edition, themeMode]);

  const reset = useCallback(() => setEdition(defaultEdition()), []);

  return { edition, setEdition, reset };
}
