import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { firebaseEnabled, getAuthClient, getGoogleProvider } from "./client";

/**
 * Same shape the Supabase `useAuth` exposed, so the call sites in App.tsx and
 * AccountDialog didn't have to change: { enabled, user, ready, signInWithGoogle,
 * signOut }. The one difference callers see is that `user.id` is now `user.uid`.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  // With no project configured there is nothing to resolve, so report ready
  // immediately rather than leaving the account UI in a permanent spinner.
  const [ready, setReady] = useState(!firebaseEnabled);

  useEffect(() => {
    if (!firebaseEnabled) return;
    // The SDK loads asynchronously, so the subscription may not exist yet when
    // this effect is cleaned up. `cancelled` covers the gap: an unmount before
    // the load finishes must not leave a live listener writing into a dead
    // component, and must not flip `ready` after the fact.
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    void (async () => {
      const auth = await getAuthClient();
      if (cancelled) return;
      if (!auth) {
        // Configured but unreachable — the SDK chunk failed to load. Report
        // ready so the UI settles on "signed out" instead of spinning.
        setReady(true);
        return;
      }
      const { onAuthStateChanged } = await import("firebase/auth");
      if (cancelled) return;
      // onAuthStateChanged fires once with the restored session (or null)
      // before any user interaction, which covers what getSession() did
      // previously — hence `ready` is set from inside the listener.
      unsubscribe = onAuthStateChanged(auth, (next) => {
        setUser(next);
        setReady(true);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    const [auth, provider] = await Promise.all([getAuthClient(), getGoogleProvider()]);
    if (!auth || !provider) return "Accounts are not configured on this deployment.";
    try {
      const { signInWithPopup } = await import("firebase/auth");
      await signInWithPopup(auth, provider);
      return null;
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      // Closing the popup or clicking sign-in twice is a normal thing to do,
      // not a failure worth showing an error for.
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return null;
      }
      // A blocked popup is the one failure a user can actually act on, so it
      // gets a message that says what to do rather than the raw SDK string.
      if (code === "auth/popup-blocked") {
        return "Your browser blocked the sign-in popup — allow popups for this site and try again.";
      }
      return (error as { message?: string }).message ?? "Sign-in failed.";
    }
  }, []);

  const signOut = useCallback(async () => {
    const auth = await getAuthClient();
    if (!auth) return;
    const { signOut: firebaseSignOut } = await import("firebase/auth");
    await firebaseSignOut(auth);
  }, []);

  return { enabled: firebaseEnabled, user, ready, signInWithGoogle, signOut };
}
