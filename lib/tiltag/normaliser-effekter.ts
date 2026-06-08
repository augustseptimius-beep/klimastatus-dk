export type RaaEffekt = {
  kategori: string | null;
  vaerdi: number | null;
  enhed: string | null;
  beskrivelse: string | null;
};

export type TiltagEffektInput = {
  kategori: string | null;
  vaerdi: number | null;
  enhed: string | null;
  beskrivelse: string | null;
  sortering: number;
};

function tom(v: string | null | undefined): boolean {
  return !v || v.trim() === '';
}

/**
 * Filtrerer og normaliserer rå effekt-rækker fra formularen.
 * - Struktureret række (kategori sat) beholdes hvis værdi ELLER enhed ELLER beskrivelse er udfyldt.
 * - Fritekst-række (kategori null) beholdes kun hvis beskrivelse er udfyldt.
 * - Tomme strenge normaliseres til null. Sortering = indeks i den filtrerede liste.
 */
export function normaliserEffekter(raa: RaaEffekt[]): TiltagEffektInput[] {
  const ud: TiltagEffektInput[] = [];
  for (const r of raa) {
    const kategori = tom(r.kategori) ? null : r.kategori!.trim();
    const enhed = tom(r.enhed) ? null : r.enhed!.trim();
    const beskrivelse = tom(r.beskrivelse) ? null : r.beskrivelse!.trim();
    const vaerdi = typeof r.vaerdi === 'number' && Number.isFinite(r.vaerdi) ? r.vaerdi : null;

    if (kategori === null) {
      // Fritekst: kræver beskrivelse
      if (beskrivelse === null) continue;
    } else {
      // Struktureret: kræver mindst ét indholdsfelt
      if (vaerdi === null && enhed === null && beskrivelse === null) continue;
    }

    ud.push({ kategori, vaerdi, enhed, beskrivelse, sortering: ud.length });
  }
  return ud;
}
