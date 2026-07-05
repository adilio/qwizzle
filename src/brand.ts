/**
 * The one source of truth for the product name. Always visible, never
 * overridable by an edition; editions only add an optional name suffix.
 */
export const BRAND = "Qwizzle";

/** `Qwizzle` when no edition name is set, `Qwizzle: X Edition` otherwise. */
export function appTitle(editionName?: string | null): string {
  const name = editionName?.trim();
  return name ? `${BRAND}: ${name} Edition` : BRAND;
}
