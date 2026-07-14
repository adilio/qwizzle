import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Modal } from "../game/Modal";
import type { Edition } from "../editions/edition";
import {
  deleteCloudEdition,
  fetchCloudEditions,
  fetchDefaultEditionId,
  saveCloudEdition,
  setDefaultEdition,
  setEditionPublic,
} from "../supabase/sync";
import type { CloudEdition } from "../supabase/sync";
import { copyText } from "../lib/share";
import { appTitle } from "../brand";

interface AccountDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSignIn: () => Promise<string | null>;
  onSignOut: () => Promise<void>;
  edition: Edition;
  onLoadEdition: (edition: Edition) => void;
}

export function AccountDialog({
  open,
  onClose,
  user,
  onSignIn,
  onSignOut,
  edition,
  onLoadEdition,
}: AccountDialogProps) {
  const [cloudEditions, setCloudEditions] = useState<CloudEdition[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  const refresh = useCallback(async () => {
    const [editions, currentDefault] = await Promise.all([
      fetchCloudEditions(),
      fetchDefaultEditionId(),
    ]);
    setCloudEditions(editions);
    setDefaultId(currentDefault);
  }, []);

  useEffect(() => {
    if (open && user) void refresh();
  }, [open, user, refresh]);

  async function handleSave(existingId?: string) {
    if (!user) return;
    setBusy(true);
    const result = await saveCloudEdition(user.id, edition, existingId);
    setBusy(false);
    if ("error" in result) {
      setStatus({ text: result.error, tone: "error" });
    } else {
      setStatus({ text: existingId ? "Edition updated." : "Edition saved.", tone: "success" });
      void refresh();
    }
  }

  async function handleSetDefault(item: CloudEdition) {
    if (!user) return;
    const next = defaultId === item.id ? null : item.id;
    const { error } = await setDefaultEdition(user.id, next);
    if (error) {
      setStatus({ text: error, tone: "error" });
      return;
    }
    setDefaultId(next);
    setStatus({
      text: next
        ? `“${appTitle(item.edition.editionName)}” will load when you sign in on a new device.`
        : "Default cleared.",
      tone: "success",
    });
  }

  async function handleShare(item: CloudEdition) {
    if (item.isPublic && item.shareSlug) {
      await setEditionPublic(item.id, false);
      setStatus({ text: "Sharing turned off.", tone: "success" });
    } else {
      const slug = await setEditionPublic(item.id, true);
      if (slug) {
        const link = `${window.location.origin}/e/${slug}`;
        const copied = await copyText(link);
        setStatus({
          text:
            copied === "copied"
              ? `Share link copied: ${link}`
              : `Share link: ${link}`,
          tone: "success",
        });
      } else {
        setStatus({ text: "Could not create a share link.", tone: "error" });
      }
    }
    void refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Account">
      {!user ? (
        <>
          <p>
            Sign in to save your editions and word lists to your account and sync stats across
            devices. Playing without an account keeps everything on this device.
          </p>
          <div className="modal__actions">
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => {
                void onSignIn().then((error) => {
                  if (error) setStatus({ text: error, tone: "error" });
                });
              }}
            >
              Sign in with Google
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            Signed in as{" "}
            <strong>{user.user_metadata?.full_name ?? user.email ?? "player"}</strong>
            {user.email ? ` (${user.email})` : ""}.
          </p>

          <h3 className="subheading">Saved editions</h3>
          {cloudEditions.length === 0 && (
            <p className="hint">Nothing saved yet — save your current setup below.</p>
          )}
          <div className="wordlists">
            {cloudEditions.map((item) => (
              <div key={item.id} className="wordlists__row">
                <span>
                  <strong>{appTitle(item.edition.editionName)}</strong>{" "}
                  <span className="wordlists__meta">
                    {[
                      item.isPublic && item.shareSlug ? "· shared" : "",
                      defaultId === item.id ? "· default" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                </span>
                <span className="account__row-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => {
                      onLoadEdition(item.edition);
                      setStatus({ text: "Edition loaded.", tone: "success" });
                    }}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => void handleSetDefault(item)}
                    title="Load this edition automatically when you sign in on a new device"
                  >
                    {defaultId === item.id ? "Unset default" : "Set default"}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    disabled={busy}
                    onClick={() => void handleSave(item.id)}
                    title="Overwrite with the current edition"
                  >
                    Overwrite
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => void handleShare(item)}
                  >
                    {item.isPublic ? "Unshare" : "Share"}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => {
                      void deleteCloudEdition(item.id).then(refresh);
                    }}
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))}
          </div>

          <div className="modal__actions">
            <button
              type="button"
              className="btn btn--accent"
              disabled={busy}
              onClick={() => void handleSave()}
            >
              Save current edition
            </button>
            <button type="button" className="btn" onClick={() => void onSignOut()}>
              Sign out
            </button>
          </div>
        </>
      )}
      {status && (
        <p className="modal__status" data-tone={status.tone} aria-live="polite">
          {status.text}
        </p>
      )}
    </Modal>
  );
}
