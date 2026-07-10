/**
 * Vurderer om et magic link (opslag fra DB) stadig kan indløses.
 * Holdes som ren funktion så både side og action deler præcis samme regel.
 */
export type MagicLinkTilstand = {
  used: boolean;
  expiresAt: Date | string;
};

export function erMagicLinkGyldig(link: MagicLinkTilstand | undefined | null): boolean {
  if (!link) return false;
  if (link.used) return false;
  return new Date(link.expiresAt) >= new Date();
}
