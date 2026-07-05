export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/** Native share where available, clipboard otherwise. */
export async function shareOrCopy(text: string, title: string): Promise<ShareOutcome> {
  if (navigator.share) {
    try {
      await navigator.share({ text, title });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // fall through to clipboard
    }
  }
  return copyText(text);
}

export async function copyText(text: string): Promise<ShareOutcome> {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      // fall through
    }
  }
  return "failed";
}
