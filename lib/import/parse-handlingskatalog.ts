import type { ImportIndsats, ImportHandling } from './types';
import {
  normaliserHeader,
  INDSATS_TYPE_ALIAS, SEKTOR_ALIAS, TILTAG_TYPE_ALIAS, TILTAG_STATUS_ALIAS,
  type KolonneNoegle,
} from './handlingskatalog-skabelon';

export type ParseResultat = { indsatser: ImportIndsats[]; advarsler: string[] };

export function parseHandlingskatalog(raekker: Record<string, string>[]): ParseResultat {
  const advarsler: string[] = [];
  const grupper = new Map<string, ImportIndsats>();

  raekker.forEach((raw, i) => {
    const linje = i + 2;

    const c: Partial<Record<KolonneNoegle, string>> = {};
    for (const [header, val] of Object.entries(raw)) {
      const noegle = normaliserHeader(header);
      if (noegle) c[noegle] = (val ?? '').toString().trim();
    }

    if (!Object.values(c).some((v) => v && v.length > 0)) return;

    const indsatsNavn = c.indsatsomraade ?? '';
    const tiltagTitel = c.tiltag_titel ?? '';
    if (!indsatsNavn) { advarsler.push(`Linje ${linje}: mangler indsatsområde — sprunget over`); return; }
    if (!tiltagTitel) { advarsler.push(`Linje ${linje}: mangler tiltag-titel — sprunget over`); return; }

    const iType = INDSATS_TYPE_ALIAS[(c.indsats_type ?? '').toLowerCase()];
    const sektor = SEKTOR_ALIAS[(c.sektor ?? '').toLowerCase()];
    const tType = TILTAG_TYPE_ALIAS[(c.tiltag_type ?? '').toLowerCase()];
    const tStatus = TILTAG_STATUS_ALIAS[(c.tiltag_status ?? '').toLowerCase()];
    if (!iType)   { advarsler.push(`Linje ${linje}: ukendt indsats-type "${c.indsats_type ?? ''}" — sprunget over`); return; }
    if (!sektor)  { advarsler.push(`Linje ${linje}: ukendt sektor "${c.sektor ?? ''}" — sprunget over`); return; }
    if (!tType)   { advarsler.push(`Linje ${linje}: ukendt tiltag-type "${c.tiltag_type ?? ''}" — sprunget over`); return; }
    if (!tStatus) { advarsler.push(`Linje ${linje}: ukendt tiltag-status "${c.tiltag_status ?? ''}" — sprunget over`); return; }

    let gruppe = grupper.get(indsatsNavn);
    if (!gruppe) {
      gruppe = { navn: indsatsNavn, type: iType, sektor, beskrivelse: c.indsats_beskrivelse || undefined, handlinger: [] };
      grupper.set(indsatsNavn, gruppe);
    } else if (gruppe.type !== iType || gruppe.sektor !== sektor) {
      advarsler.push(`Linje ${linje}: "${indsatsNavn}" har anden type/sektor end første forekomst — beholder den første`);
    }

    const handling: ImportHandling = { titel: tiltagTitel, type: tType, status: tStatus };
    if (c.tiltag_beskrivelse) handling.beskrivelse = c.tiltag_beskrivelse;
    gruppe.handlinger.push(handling);
  });

  return { indsatser: [...grupper.values()], advarsler };
}
