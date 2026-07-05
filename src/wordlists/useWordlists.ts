import { useCallback, useMemo, useState } from "react";
import { BUILTIN_WORDLIST } from "../providers/builtin";
import type { Wordlist } from "../providers/types";
import { loadJson, saveJson } from "../lib/storage";

const KEYS = {
  lists: "qwizzle:wordlists",
  active: "qwizzle:active-wordlist",
};

const MAX_SAVED_LISTS = 20;

function loadSaved(): Wordlist[] {
  const raw = loadJson<Wordlist[]>(KEYS.lists);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (list): list is Wordlist =>
      Boolean(list) &&
      typeof list.id === "string" &&
      typeof list.name === "string" &&
      Array.isArray(list.entries) &&
      list.entries.length > 0,
  );
}

export function useWordlists() {
  const [saved, setSaved] = useState<Wordlist[]>(loadSaved);
  const [activeId, setActiveId] = useState<string>(
    () => loadJson<string>(KEYS.active) ?? BUILTIN_WORDLIST.id,
  );

  const lists = useMemo(() => [BUILTIN_WORDLIST, ...saved], [saved]);
  const active = useMemo(
    () => lists.find((list) => list.id === activeId) ?? BUILTIN_WORDLIST,
    [lists, activeId],
  );

  const setActive = useCallback((id: string) => {
    setActiveId(id);
    saveJson(KEYS.active, id);
  }, []);

  const addList = useCallback(
    (wordlist: Wordlist) => {
      setSaved((prev) => {
        const next = [wordlist, ...prev.filter((l) => l.id !== wordlist.id)].slice(
          0,
          MAX_SAVED_LISTS,
        );
        saveJson(KEYS.lists, next);
        return next;
      });
      setActive(wordlist.id);
    },
    [setActive],
  );

  const removeList = useCallback(
    (id: string) => {
      setSaved((prev) => {
        const next = prev.filter((l) => l.id !== id);
        saveJson(KEYS.lists, next);
        return next;
      });
      if (activeId === id) setActive(BUILTIN_WORDLIST.id);
    },
    [activeId, setActive],
  );

  return { lists, active, setActive, addList, removeList };
}
