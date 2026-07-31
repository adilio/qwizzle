import { getDb, PATHS, wordlistSlug } from "./client";
import type { Firestore } from "firebase/firestore";
import type * as FirestoreSdk from "firebase/firestore";
import type { Edition, EditionWordlistRef } from "../editions/edition";
import { defaultEdition, sanitizeEditionName } from "../editions/edition";
import { sanitizeColors, DEFAULT_DARK, DEFAULT_LIGHT } from "../theme/tokens";
import type { Stats } from "../engine";
import { createInitialStats } from "../engine";
import type { Wordlist } from "../providers/types";
import { normalizeEntries } from "../providers/parse";

/**
 * Resolves the lazily-loaded Firestore SDK together with the database handle,
 * so each function below can do one await and then use `fs.doc(fs.db, ...)`
 * exactly as it would have used the statically imported versions.
 *
 * Returns null when accounts are not configured on this deployment, or when the
 * SDK chunk could not be loaded — both of which every caller already treats the
 * same way, by falling back to local-only behaviour. Importing the module here
 * rather than at the top of the file is what keeps the Firestore SDK out of the
 * initial bundle; see the note in client.ts.
 */
async function firestore(): Promise<(typeof FirestoreSdk & { db: Firestore }) | null> {
  const db = await getDb();
  if (!db) return null;
  const mod = await import("firebase/firestore");
  return { ...mod, db };
}

export interface CloudEdition {
  id: string;
  name: string;
  edition: Edition;
  isPublic: boolean;
  shareSlug: string | null;
  updatedAt: string;
}

/**
 * Stored shape of an edition document. Field names are camelCase now (the
 * Postgres rows were snake_case), but the *values* are unchanged — notably
 * `wordlistRef`, which stays the same portable, self-contained structure the
 * export JSON uses, so a public share link never has to touch the owner's
 * wordlist collection.
 */
interface EditionDoc {
  name?: unknown;
  themeJson?: unknown;
  wordlistRef?: unknown;
  isPublic?: unknown;
  shareSlug?: unknown;
  updatedAt?: unknown;
  ownerId?: unknown;
}

function docToEdition(id: string, data: EditionDoc): CloudEdition {
  const theme = (data.themeJson ?? {}) as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name : "";
  const edition: Edition = {
    version: 1,
    brand: "Qwizzle",
    editionName: sanitizeEditionName(name),
    theme: {
      colors: sanitizeColors(theme.colors, DEFAULT_DARK),
      lightColors: sanitizeColors(theme.lightColors, DEFAULT_LIGHT),
    },
    wordlist: sanitizeRef(data.wordlistRef),
  };
  return {
    id,
    name,
    edition,
    isPublic: data.isPublic === true,
    shareSlug: typeof data.shareSlug === "string" ? data.shareSlug : null,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  };
}

function sanitizeRef(raw: unknown): EditionWordlistRef {
  if (!raw || typeof raw !== "object") return { source_type: "builtin" };
  const ref = raw as EditionWordlistRef;
  if (ref.source_type === "builtin" || !ref.source_type) return { source_type: "builtin" };
  const clean: EditionWordlistRef = { source_type: ref.source_type };
  if (typeof ref.id === "string") clean.id = ref.id.slice(0, 64);
  if (typeof ref.name === "string") clean.name = ref.name.slice(0, 80);
  if (typeof ref.source_url === "string") clean.source_url = ref.source_url.slice(0, 2048);
  if (Array.isArray(ref.entries)) {
    try {
      clean.entries = normalizeEntries(ref.entries).entries;
    } catch {
      return { source_type: "builtin" };
    }
  }
  return clean;
}

/**
 * Fields mirrored into publicEditions/{slug}. `ownerId` is what the security
 * rules match on for writes, and it is the reason the mirror is safe to expose:
 * everything here is content the owner explicitly chose to publish.
 */
function publicMirror(uid: string, id: string, data: EditionDoc, slug: string) {
  return {
    editionId: id,
    ownerId: uid,
    name: data.name ?? "",
    themeJson: data.themeJson ?? {},
    wordlistRef: data.wordlistRef ?? { source_type: "builtin" },
    isPublic: true,
    shareSlug: slug,
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  };
}

export async function fetchCloudEditions(uid: string): Promise<CloudEdition[]> {
  const fs = await firestore();
  if (!fs) return [];
  try {
    const snap = await fs.getDocs(
      fs.query(fs.collection(fs.db, ...PATHS.editions(uid)), fs.orderBy("updatedAt", "desc")),
    );
    return snap.docs.map((d) => docToEdition(d.id, d.data() as EditionDoc));
  } catch {
    return [];
  }
}

export async function saveCloudEdition(
  userId: string,
  edition: Edition,
  existingId?: string,
): Promise<{ id: string } | { error: string }> {
  const fs = await firestore();
  if (!fs) return { error: "Accounts are not configured." };
  try {
    const ref = existingId
      ? fs.doc(fs.db, ...PATHS.editions(userId), existingId)
      : fs.doc(fs.collection(fs.db, ...PATHS.editions(userId)));
    const data = {
      ownerId: userId,
      name: edition.editionName,
      themeJson: edition.theme,
      wordlistRef: edition.wordlist,
      updatedAt: new Date().toISOString(),
    };
    // merge:true so an update leaves isPublic/shareSlug alone. Without it,
    // editing a published edition would silently unpublish it and orphan the
    // public mirror, breaking every share link already handed out.
    await fs.setDoc(ref, data, { merge: true });

    // Keep an already-published mirror in step with the edit, so a share link
    // shows the current edition rather than the version as it was at publish.
    const snap = await fs.getDoc(ref);
    const current = snap.data() as EditionDoc | undefined;
    if (current?.isPublic === true && typeof current.shareSlug === "string") {
      await fs.setDoc(
        fs.doc(fs.db, PATHS.publicEditions, current.shareSlug),
        publicMirror(userId, ref.id, current, current.shareSlug),
      );
    }
    return { id: ref.id };
  } catch (error) {
    return { error: (error as { message?: string }).message ?? "Save failed." };
  }
}

/**
 * Deletes the edition and any public mirror of it. The mirror cleanup has no
 * counterpart in the Postgres version because there the published edition and
 * the private one were the same row — deleting it removed both at once. Split
 * across two collections, forgetting this would leave a live share link
 * serving an edition its owner believes they deleted.
 */
export async function deleteCloudEdition(uid: string, id: string): Promise<void> {
  const fs = await firestore();
  if (!fs) return;
  try {
    const ref = fs.doc(fs.db, ...PATHS.editions(uid), id);
    const snap = await fs.getDoc(ref);
    const slug = (snap.data() as EditionDoc | undefined)?.shareSlug;
    const batch = fs.writeBatch(fs.db);
    batch.delete(ref);
    if (typeof slug === "string" && slug) {
      batch.delete(fs.doc(fs.db, PATHS.publicEditions, slug));
    }
    await batch.commit();
  } catch {
    // Same as before: deletion is best-effort and the UI refreshes from the
    // server afterwards, so a failure shows up as the row still being there.
  }
}

function randomSlug(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
}

/** Toggle public sharing; returns the slug when made public. */
export async function setEditionPublic(
  uid: string,
  id: string,
  isPublic: boolean,
): Promise<string | null> {
  const fs = await firestore();
  if (!fs) return null;
  try {
    const ref = fs.doc(fs.db, ...PATHS.editions(uid), id);
    const snap = await fs.getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as EditionDoc;
    const existingSlug = typeof data.shareSlug === "string" ? data.shareSlug : null;

    if (!isPublic) {
      const batch = fs.writeBatch(fs.db);
      // shareSlug is deliberately kept on the private document. Re-publishing
      // then reuses it, so a link that was shared once and revoked starts
      // working again rather than becoming a second, competing URL.
      batch.set(ref, { isPublic: false }, { merge: true });
      if (existingSlug) batch.delete(fs.doc(fs.db, PATHS.publicEditions, existingSlug));
      await batch.commit();
      return null;
    }

    const slug = existingSlug ?? randomSlug();
    const batch = fs.writeBatch(fs.db);
    batch.set(ref, { isPublic: true, shareSlug: slug }, { merge: true });
    batch.set(
      fs.doc(fs.db, PATHS.publicEditions, slug),
      publicMirror(uid, id, data, slug),
    );
    await batch.commit();
    return slug;
  } catch {
    return null;
  }
}

/** One of the user's own saved editions, by id (rules scope to owner). */
export async function fetchCloudEditionById(
  uid: string,
  id: string,
): Promise<CloudEdition | null> {
  const fs = await firestore();
  if (!fs) return null;
  try {
    const snap = await fs.getDoc(fs.doc(fs.db, ...PATHS.editions(uid), id));
    if (!snap.exists()) return null;
    return docToEdition(snap.id, snap.data() as EditionDoc);
  } catch {
    return null;
  }
}

export async function fetchDefaultEditionId(uid: string): Promise<string | null> {
  const fs = await firestore();
  if (!fs) return null;
  try {
    const snap = await fs.getDoc(fs.doc(fs.db, ...PATHS.user(uid)));
    const value = (snap.data() as { defaultEditionId?: unknown } | undefined)
      ?.defaultEditionId;
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export async function setDefaultEdition(
  userId: string,
  editionId: string | null,
): Promise<{ error: string | null }> {
  const fs = await firestore();
  if (!fs) return { error: "Accounts are not configured." };
  try {
    await fs.setDoc(
      fs.doc(fs.db, ...PATHS.user(userId)),
      { defaultEditionId: editionId, updatedAt: new Date().toISOString() },
      { merge: true },
    );
    return { error: null };
  } catch (error) {
    return { error: (error as { message?: string }).message ?? "Save failed." };
  }
}

/**
 * Anonymous read of a published edition — powers /e/<slug> links. This is the
 * one path that reads outside the caller's own subtree, which is exactly why
 * published editions are mirrored into their own top-level collection: the
 * rules can open it to the world without exposing anything else a user owns.
 */
export async function fetchEditionBySlug(slug: string): Promise<CloudEdition | null> {
  const fs = await firestore();
  if (!fs) return null;
  try {
    const snap = await fs.getDoc(fs.doc(fs.db, PATHS.publicEditions, slug));
    if (!snap.exists()) return null;
    const data = snap.data() as EditionDoc & { editionId?: unknown };
    const id = typeof data.editionId === "string" ? data.editionId : snap.id;
    return docToEdition(id, data);
  } catch {
    return null;
  }
}

interface WordlistDoc {
  name?: unknown;
  sourceType?: unknown;
  payloadJson?: unknown;
  sourceUrl?: unknown;
  itemCount?: unknown;
}

export async function fetchCloudWordlists(uid: string): Promise<Wordlist[]> {
  const fs = await firestore();
  if (!fs) return [];
  try {
    const snap = await fs.getDocs(fs.collection(fs.db, ...PATHS.wordlists(uid)));
    const lists: Wordlist[] = [];
    for (const d of snap.docs) {
      const row = d.data() as WordlistDoc;
      if (!Array.isArray(row.payloadJson)) continue;
      try {
        lists.push({
          // The `c` prefix keeps cloud list ids from colliding with builtin
          // ones, exactly as it did when the id was a UUID.
          id: `c${d.id.slice(0, 12)}`,
          name: String(row.name ?? ""),
          sourceType: row.sourceType as Wordlist["sourceType"],
          entries: normalizeEntries(row.payloadJson).entries,
          ...(typeof row.sourceUrl === "string" && row.sourceUrl
            ? { sourceUrl: row.sourceUrl }
            : {}),
        });
      } catch {
        // skip corrupt documents
      }
    }
    return lists;
  } catch {
    return [];
  }
}

export async function saveCloudWordlist(
  userId: string,
  list: Wordlist,
): Promise<{ error: string | null }> {
  if (list.sourceType === "builtin") return { error: null };
  const fs = await firestore();
  if (!fs) return { error: null };
  try {
    // The document id is slug(name), which is what replaces the old
    // (user_id, name) unique index: re-importing a list overwrites it.
    await fs.setDoc(fs.doc(fs.db, ...PATHS.wordlists(userId), wordlistSlug(list.name)), {
      ownerId: userId,
      name: list.name,
      sourceType: list.sourceType,
      payloadJson: list.entries,
      sourceUrl: list.sourceUrl ?? null,
      itemCount: list.entries.length,
      updatedAt: new Date().toISOString(),
    });
    return { error: null };
  } catch (error) {
    return { error: (error as { message?: string }).message ?? "Save failed." };
  }
}

export async function fetchCloudStats(uid: string): Promise<Stats | null> {
  const fs = await firestore();
  if (!fs) return null;
  try {
    const snap = await fs.getDoc(fs.doc(fs.db, ...PATHS.stats(uid)));
    if (!snap.exists()) return null;
    const raw = (snap.data() as { statsJson?: unknown }).statsJson as
      | Partial<Stats>
      | null
      | undefined;
    if (!raw || raw.version !== 1) return null;
    const base = createInitialStats();
    return {
      ...base,
      played: Number(raw.played) || 0,
      won: Number(raw.won) || 0,
      streak: Number(raw.streak) || 0,
      best: Number(raw.best) || 0,
      score: Number(raw.score) || 0,
      lastDailyKey: typeof raw.lastDailyKey === "string" ? raw.lastDailyKey : null,
    };
  } catch {
    return null;
  }
}

export async function saveCloudStats(
  userId: string,
  stats: Stats,
): Promise<{ error: string | null }> {
  const fs = await firestore();
  if (!fs) return { error: "Accounts are not configured." };
  try {
    await fs.setDoc(fs.doc(fs.db, ...PATHS.stats(userId)), {
      ownerId: userId,
      statsJson: stats,
      updatedAt: new Date().toISOString(),
    });
    return { error: null };
  } catch (error) {
    return { error: (error as { message?: string }).message ?? "Save failed." };
  }
}

export async function upsertProfile(
  userId: string,
  displayName: string | null,
): Promise<void> {
  const fs = await firestore();
  if (!fs) return;
  try {
    await fs.setDoc(
      fs.doc(fs.db, ...PATHS.user(userId)),
      { displayName, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  } catch {
    // Best-effort, as before: a missing display name never blocks play.
  }
}

export function editionForCloud(edition: Edition): Edition {
  return { ...defaultEdition(), ...edition };
}
