import type { ImportIndsats, ImportHandling } from './types';

/** Navne sammenlignes uafhængigt af case og overflødigt whitespace. */
export function normaliserNavn(navn: string): string {
  return navn.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type EksisterendeKatalog = {
  indsatser: { id: string; navn: string }[];
  /** Eksisterende tiltag-titler pr. indsatsOmraade-id. */
  tiltagTitler: Map<string, string[]>;
};

export type MergePlanIndsats = {
  indsats: ImportIndsats;
  /** Sat hvis indsatsområdet allerede findes — handlinger flettes ind i det. */
  eksisterendeId: string | null;
  nyeHandlinger: ImportHandling[];
  /** Titler der springes over fordi de allerede findes i indsatsområdet. */
  sprungetOver: string[];
};

export type MergePlan = {
  indsatser: MergePlanIndsats[];
  antalNyeIndsatser: number;
  antalFlettedeIndsatser: number;
  antalNyeHandlinger: number;
  antalSprungetOver: number;
};

export type ImportDiff = {
  /** Indeks-justeret med input-arrayet (ikke foldet), til brug i review-UI. */
  indsatser: { findes: boolean; handlingerFindes: boolean[] }[];
};

/** Hvad i en påtænkt import findes allerede? Til diff-visning før der oprettes noget. */
export function beregnImportDiff(
  eksisterende: EksisterendeKatalog,
  indsatser: ImportIndsats[],
): ImportDiff {
  const eksisterendeByNavn = new Map(
    eksisterende.indsatser.map((io) => [normaliserNavn(io.navn), io.id]),
  );
  return {
    indsatser: indsatser.map((io) => {
      const id = eksisterendeByNavn.get(normaliserNavn(io.navn)) ?? null;
      const kendteTitler = new Set(
        (id ? (eksisterende.tiltagTitler.get(id) ?? []) : []).map(normaliserNavn),
      );
      return {
        findes: id !== null,
        handlingerFindes: io.handlinger.map((h) => kendteTitler.has(normaliserNavn(h.titel))),
      };
    }),
  };
}

/**
 * Beregn hvad en import reelt vil oprette, så samme katalog kan importeres
 * igen uden at duplikere indsatsområder eller handlinger.
 */
export function lavMergePlan(
  eksisterende: EksisterendeKatalog,
  indsatser: ImportIndsats[],
): MergePlan {
  const eksisterendeByNavn = new Map(
    eksisterende.indsatser.map((io) => [normaliserNavn(io.navn), io.id]),
  );

  // Fold dubletter i selve importen (samme indsatsnavn flere gange) til én.
  const foldede = new Map<string, ImportIndsats>();
  for (const io of indsatser) {
    const key = normaliserNavn(io.navn);
    const found = foldede.get(key);
    if (found) {
      found.handlinger = [...found.handlinger, ...io.handlinger];
    } else {
      foldede.set(key, { ...io, handlinger: [...io.handlinger] });
    }
  }

  const plan: MergePlanIndsats[] = [];
  for (const [key, io] of foldede) {
    const eksisterendeId = eksisterendeByNavn.get(key) ?? null;
    const kendteTitler = new Set(
      (eksisterendeId ? (eksisterende.tiltagTitler.get(eksisterendeId) ?? []) : [])
        .map(normaliserNavn),
    );

    const nyeHandlinger: ImportHandling[] = [];
    const sprungetOver: string[] = [];
    for (const h of io.handlinger) {
      const titelKey = normaliserNavn(h.titel);
      if (kendteTitler.has(titelKey)) {
        sprungetOver.push(h.titel);
      } else {
        kendteTitler.add(titelKey);
        nyeHandlinger.push(h);
      }
    }

    plan.push({ indsats: io, eksisterendeId, nyeHandlinger, sprungetOver });
  }

  return {
    indsatser: plan,
    antalNyeIndsatser: plan.filter((p) => p.eksisterendeId === null).length,
    antalFlettedeIndsatser: plan.filter((p) => p.eksisterendeId !== null).length,
    antalNyeHandlinger: plan.reduce((n, p) => n + p.nyeHandlinger.length, 0),
    antalSprungetOver: plan.reduce((n, p) => n + p.sprungetOver.length, 0),
  };
}
