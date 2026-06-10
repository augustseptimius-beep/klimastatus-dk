export type ForespoergselStatus = 'sendt' | 'besvaret' | 'forfalden';
export type IndhentningsKadence = 'maanedlig' | 'kvartalsvis' | 'halvaarlig' | 'aarlig' | 'manuel';

/** Antal dage en forespørgsel må stå ubesvaret før den regnes som forfalden. */
export const SVARVINDUE_DAGE = 14;
/** Antal dage hvor en ny manuel anmodning regnes som "nylig" (anti-spam). */
export const ANMOD_IGEN_SPAERRE_DAGE = 7;

function dageMellem(fraISO: string, tilDatoISO: string): number {
  const fra = Date.parse(fraISO);
  const til = Date.parse(tilDatoISO);
  return Math.floor((til - fra) / 86_400_000);
}

/**
 * Afledt forfalden-tilstand. Beregnes ved læsning (pg-boss er no-op), samme
 * mønster som "forsinket"-overlayet. En forespørgsel er forfalden når den
 * stadig er 'sendt' og blev sendt for mere end svarvinduet siden.
 */
export function erForfalden(
  status: ForespoergselStatus,
  sendtAtISO: string,
  iDagISO: string,
  svarvindueDage = SVARVINDUE_DAGE,
): boolean {
  if (status !== 'sendt') return false;
  return dageMellem(sendtAtISO, iDagISO) > svarvindueDage;
}

/** True hvis seneste anmodning er sket inden for spærren (advar mod gentagelse). */
export function nyligAnmodet(
  sidstAnmodetISO: string | null,
  iDagISO: string,
  spaerreDage = ANMOD_IGEN_SPAERRE_DAGE,
): boolean {
  if (!sidstAnmodetISO) return false;
  return dageMellem(sidstAnmodetISO, iDagISO) <= spaerreDage;
}

const KADENCE_LABELS: Record<IndhentningsKadence, string> = {
  maanedlig: 'Månedlig',
  kvartalsvis: 'Kvartalsvis',
  halvaarlig: 'Halvårlig',
  aarlig: 'Årlig',
  manuel: 'Manuel (slukket)',
};

export function kadenceLabel(kadence: IndhentningsKadence): string {
  return KADENCE_LABELS[kadence];
}

/**
 * Periodenøgle for en kadence på en given dato — bruges af den (udskudte)
 * scheduler til at afgøre om en ny periode er begyndt. 'manuel' → null.
 */
export function kadencePeriodeNoegle(kadence: IndhentningsKadence, datoISO: string): string | null {
  const aar = datoISO.slice(0, 4);
  const maaned = Number(datoISO.slice(5, 7)); // 1-12
  switch (kadence) {
    case 'aarlig': return aar;
    case 'halvaarlig': return `${aar}-H${maaned <= 6 ? 1 : 2}`;
    case 'kvartalsvis': return `${aar}-Q${Math.ceil(maaned / 3)}`;
    case 'maanedlig': return `${aar}-${datoISO.slice(5, 7)}`;
    case 'manuel': return null;
  }
}
