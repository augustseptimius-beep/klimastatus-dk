// Regelbaseret kobling fra kommunens data til CCTF v2.5-kriterier.
// Mappings vedligeholdes automatisk ved oprettelse/redigering — en manuel
// mapping-UI ville aldrig blive vedligeholdt af en presset koordinator.
//
// Kriterienumrene følger db/seed.ts (CCTF v2.5):
//   5  Klimarisici og sårbarhed      8  Reduktionsmål      9  Tilpasningsmål
//  11  Sektorstrategier             12  Tiltag            14  Implementeringsplanlægning
//  15  MERL-system

export const KRITERIE_SEKTORSTRATEGI = 11;
export const KRITERIE_TILTAG = 12;
export const KRITERIE_IMPLEMENTERING = 14;
export const KRITERIE_MERL = 15;
export const KRITERIE_REDUKTIONSMAAL = 8;
export const KRITERIE_TILPASNINGSMAAL = 9;

/** Alle handlinger dokumenterer kriterie 12; prioriterede også kriterie 14. */
export function kriterierForTiltag(t: { prioriteretTiltag?: boolean | null }): number[] {
  const kriterier = [KRITERIE_TILTAG];
  if (t.prioriteretTiltag) kriterier.push(KRITERIE_IMPLEMENTERING);
  return kriterier;
}

/** Reduktionsmål → kriterie 8, tilpasningsmål → kriterie 9. Øvrige kategorier
 *  (co_benefits, consumption) har ikke et entydigt kriterie og mappes ikke. */
export function kriterierForMaal(m: { kategori: string }): number[] {
  if (m.kategori === 'reduction') return [KRITERIE_REDUKTIONSMAAL];
  if (m.kategori === 'adaptation') return [KRITERIE_TILPASNINGSMAAL];
  return [];
}

/** Et indsatsområde er en sektorstrategi (kriterie 11). */
export function kriterierForIndsatsOmraade(): number[] {
  return [KRITERIE_SEKTORSTRATEGI];
}

/** En aktiveret indikator dokumenterer skabelonens deklarerede kriterier —
 *  og indgår altid mindst i MERL-systemet (kriterie 15). */
export function kriterierForIndikator(template?: { cctfKriterier: number[] | null }): number[] {
  const fraTemplate = template?.cctfKriterier ?? [];
  return fraTemplate.length > 0 ? [...new Set([...fraTemplate, KRITERIE_MERL])] : [KRITERIE_MERL];
}
