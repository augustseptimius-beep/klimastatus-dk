// Value-first datafriskheds-motor. Ren logik: tager allerede-hentede data + injiceret "nu".
// Sproget er hjælp, aldrig dom. Ingen data → null (ingen falsk advarsel).

export type FriskhedsNiveau = 'frisk' | 'snart' | 'forældet';
export type IndsigtType = 'emissionsdata' | 'indikator' | 'kadence' | 'delmaal';

export type Indsigt = {
  type: IndsigtType;
  niveau: FriskhedsNiveau;
  besked: string;
  link?: string;
  entitetId?: string;
};

/**
 * Emissionsdata-friskhed ud fra seneste tilgængelige dataår.
 * CCTF anbefaler opdatering min. hvert 2.-3. år [evidensgrundlag §5].
 */
export function emissionsdataFriskhed(senesteAar: number | null, nu: Date): Indsigt | null {
  if (senesteAar == null) return null;
  const alder = nu.getFullYear() - senesteAar;
  const niveau: FriskhedsNiveau = alder >= 3 ? 'forældet' : alder === 2 ? 'snart' : 'frisk';
  const besked =
    niveau === 'forældet'
      ? `Jeres seneste drivhusgasregnskab er fra ${senesteAar}. Nyere tal giver bedre styring og mere troværdige tal til byrådet.`
      : niveau === 'snart'
        ? `Jeres drivhusgasregnskab (${senesteAar}) nærmer sig at skulle opdateres — nye tal holder styringsgrundlaget skarpt.`
        : `Drivhusgasregnskabet er opdateret (${senesteAar}).`;
  return { type: 'emissionsdata', niveau, besked, link: 'data' };
}

export type Kadence = 'maanedlig' | 'kvartalsvis' | 'halvaarlig' | 'aarlig' | 'manuel';

const KADENCE_MAANEDER: Record<Exclude<Kadence, 'manuel'>, number> = {
  maanedlig: 1,
  kvartalsvis: 3,
  halvaarlig: 6,
  aarlig: 12,
};

const KADENCE_ORD: Record<Exclude<Kadence, 'manuel'>, string> = {
  maanedlig: 'månedlige',
  kvartalsvis: 'kvartalsvise',
  halvaarlig: 'halvårlige',
  aarlig: 'årlige',
};

/**
 * Kadence-påmindelse ud fra kommunens valgte opdateringsrytme og seneste dataopdatering.
 * manuel → intet signal. Ingen opdatering endnu → intet signal (undgå falsk positiv).
 */
export function kadenceFriskhed(kadence: Kadence, senesteOpdatering: Date | null, nu: Date): Indsigt | null {
  if (kadence === 'manuel') return null;
  if (senesteOpdatering == null) return null;

  const intervalMaaneder = KADENCE_MAANEDER[kadence];
  const maanederSiden =
    (nu.getFullYear() - senesteOpdatering.getFullYear()) * 12 +
    (nu.getMonth() - senesteOpdatering.getMonth());

  let niveau: FriskhedsNiveau;
  if (maanederSiden > intervalMaaneder) niveau = 'forældet';
  else if (maanederSiden >= intervalMaaneder * 0.8) niveau = 'snart';
  else niveau = 'frisk';

  const ord = KADENCE_ORD[kadence];
  const besked =
    niveau === 'forældet'
      ? `Det er tid til jeres ${ord} dataopdatering — seneste var for ${maanederSiden} måneder siden.`
      : niveau === 'snart'
        ? `Jeres ${ord} dataopdatering nærmer sig.`
        : `I er ajour med jeres ${ord} opdateringsrytme.`;
  return { type: 'kadence', niveau, besked, link: 'data' };
}

export type IndikatorInput = {
  kommuneIndikatorId: string;
  visningsnavn: string;
  kilde: string | null;
  sidstHentet: Date | null;
  sidsteFejl: Date | null;
  sidsteFejlBesked: string | null;
  senesteMaalingDato: Date | null;
  senesteMaalingAar: number | null;
};

const DAG_MS = 1000 * 60 * 60 * 24;

/**
 * Per-indikator friskhed. API-indikatorer: sidstHentet (>35 dage = snart).
 * Manuelle (kilde=null): seneste målings-år. Fejl: forældet. Ingen data → null.
 */
export function indikatorFriskhed(i: IndikatorInput, nu: Date): Indsigt | null {
  const baseIndsigt = (niveau: FriskhedsNiveau, besked: string): Indsigt => ({
    type: 'indikator', niveau, besked, entitetId: i.kommuneIndikatorId, link: 'data',
  });

  if (i.sidsteFejl && (!i.sidstHentet || i.sidsteFejl > i.sidstHentet)) {
    return baseIndsigt('forældet', `Fejl ved seneste hentning${i.sidsteFejlBesked ? `: ${i.sidsteFejlBesked}` : ''}.`);
  }

  // API-indikator: vurdér på sidstHentet
  if (i.kilde != null) {
    if (i.sidstHentet == null) return null; // afventer første hentning — intet advarende signal
    const dage = Math.floor((nu.getTime() - i.sidstHentet.getTime()) / DAG_MS);
    const niveau: FriskhedsNiveau = dage > 35 ? 'snart' : 'frisk';
    return baseIndsigt(niveau, niveau === 'snart' ? `Senest hentet for ${dage} dage siden.` : `Hentet ${i.sidstHentet.toLocaleDateString('da-DK')}.`);
  }

  // Manuel indikator: vurdér på seneste målings-år
  if (i.senesteMaalingAar == null) return null;
  const alder = nu.getFullYear() - i.senesteMaalingAar;
  const niveau: FriskhedsNiveau = alder >= 3 ? 'forældet' : alder === 2 ? 'snart' : 'frisk';
  return baseIndsigt(niveau, `Seneste data: ${i.senesteMaalingAar}.`);
}

/** Bonus: et reduktionsmål uden delmål undervejs gør det umuligt at følge fremdrift. */
export function delmaalTjek(harReduktionsMaal: boolean, antalDelmaal: number): Indsigt | null {
  if (!harReduktionsMaal) return null;
  if (antalDelmaal >= 2) return null;
  return {
    type: 'delmaal',
    niveau: 'snart',
    besked: 'I har et reduktionsmål, men ingen delmål undervejs — uden dem kan I ikke følge fremdriften løbende.',
    link: 'indsatser',
  };
}

export type MotorInput = {
  senesteEmissionsAar: number | null;
  kadence: Kadence;
  senesteDataopdatering: Date | null;
  indikatorer: IndikatorInput[];
  harReduktionsMaal: boolean;
  antalReduktionsDelmaal: number;
};

/** Kører alle signaler og returnerer de ikke-null indsigter. */
export function beregnIndsigter(input: MotorInput, nu: Date): Indsigt[] {
  const ud: (Indsigt | null)[] = [
    emissionsdataFriskhed(input.senesteEmissionsAar, nu),
    kadenceFriskhed(input.kadence, input.senesteDataopdatering, nu),
    delmaalTjek(input.harReduktionsMaal, input.antalReduktionsDelmaal),
    ...input.indikatorer.map((i) => indikatorFriskhed(i, nu)),
  ];
  return ud.filter((i): i is Indsigt => i !== null);
}
