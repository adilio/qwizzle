import type { FirebaseApp } from "firebase/app";
import type { Auth, GoogleAuthProvider } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/**
 * False when the env vars are absent — every account/sync feature checks this
 * and hides itself, so the app still fully works as a local-only game. This
 * mirrors the behaviour the Supabase client had, and it is load-bearing: the
 * production site ran this way, with no backend configured at all, for months.
 *
 * Only these four are checked because they are what `initializeApp` genuinely
 * needs to reach a project; the other two matter only for Storage and FCM,
 * which this app doesn't use. Checking before initializing matters because
 * `initializeApp` accepts a half-empty config without complaint and then fails
 * at the first call, which would surface as a broken account UI rather than an
 * absent one.
 */
export const firebaseEnabled = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);

/**
 * The Firebase SDK is loaded on demand rather than imported at module scope.
 *
 * It is by far the heaviest thing this app would ship: statically importing
 * app + auth + firestore took the production bundle from 104 kB to 267 kB
 * gzipped, a 2.6x increase paid by every visitor on first paint. Qwizzle is
 * playable end to end without an account — that is the whole point of the
 * null-client design above — so the overwhelming majority of that cost was
 * being paid by people who never sign in. Deferring it keeps the game's first
 * load exactly as fast as it was on Supabase, and moves the SDK behind the
 * first actual account interaction.
 *
 * The promise is cached, so concurrent callers share one load and one app
 * instance. A failed load resolves to nulls, which every caller already
 * handles as "accounts are not configured".
 */
interface FirebaseBundle {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  newGoogleProvider: (() => GoogleAuthProvider) | null;
}

const EMPTY: FirebaseBundle = { app: null, auth: null, db: null, newGoogleProvider: null };

let pending: Promise<FirebaseBundle> | null = null;

function loadFirebase(): Promise<FirebaseBundle> {
  if (!firebaseEnabled) return Promise.resolve(EMPTY);
  pending ??= (async () => {
    try {
      const [{ initializeApp }, authMod, { getFirestore }] = await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
        import("firebase/firestore"),
      ]);
      const app = initializeApp(config as Required<typeof config>);
      return {
        app,
        auth: authMod.getAuth(app),
        db: getFirestore(app),
        newGoogleProvider: () => {
          const provider = new authMod.GoogleAuthProvider();
          // Always land on the account chooser. Without this, a browser holding
          // one Google session signs that account straight back in after a
          // sign-out, which reads as "sign out is broken" on shared machines.
          provider.setCustomParameters({ prompt: "select_account" });
          return provider;
        },
      };
    } catch {
      // Reset so a transient chunk-load failure (offline, deploy mid-session)
      // can be retried by the next caller instead of being cached forever.
      pending = null;
      return EMPTY;
    }
  })();
  return pending;
}

export async function getAuthClient(): Promise<Auth | null> {
  return (await loadFirebase()).auth;
}

export async function getDb(): Promise<Firestore | null> {
  return (await loadFirebase()).db;
}

export async function getGoogleProvider(): Promise<GoogleAuthProvider | null> {
  const { newGoogleProvider } = await loadFirebase();
  return newGoogleProvider ? newGoogleProvider() : null;
}

/**
 * Firestore layout (see docs/BACKEND-MIGRATION.md for the mapping from the
 * old Postgres tables):
 *
 *   users/{uid}                      profile: displayName, defaultEditionId
 *   users/{uid}/meta/stats           the single stats document
 *   users/{uid}/wordlists/{slug}     slug(name) — the old (user_id, name)
 *                                    unique index becomes the document id, so
 *                                    re-importing a list overwrites it for free
 *   users/{uid}/editions/{id}        private editions
 *   publicEditions/{shareSlug}       world-readable mirror of published ones
 */
export const PATHS = {
  user: (uid: string) => ["users", uid] as const,
  stats: (uid: string) => ["users", uid, "meta", "stats"] as const,
  wordlists: (uid: string) => ["users", uid, "wordlists"] as const,
  editions: (uid: string) => ["users", uid, "editions"] as const,
  publicEditions: "publicEditions",
};

/**
 * Document id for a wordlist. The Postgres schema enforced uniqueness on
 * (user_id, name) so that re-importing a list replaced it instead of piling up
 * duplicates. Firestore has no unique indexes, so that guarantee has to live in
 * the key itself — same name, same document, and `setDoc` overwrites.
 *
 * Kept deliberately lossy-but-total: anything outside [a-z0-9] collapses to a
 * dash, and an empty result falls back to "list" so a name of only punctuation
 * still produces a legal id. Two names that differ only in punctuation collide,
 * which is the same behaviour a case-insensitive unique index would give and is
 * preferable to silently accumulating near-duplicate lists.
 */
export function wordlistSlug(name: string): string {
  // Truncate before trimming, not after: slicing at 80 can land mid-separator
  // and leave a trailing dash, which would make two otherwise-identical names
  // produce ids differing only by that dash.
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
  return slug || "list";
}
