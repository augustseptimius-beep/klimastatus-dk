import { getCo2eSeries } from '@/db/queries/public-dashboard';
import { getReduktionsMaal } from '@/db/queries/maal';
import { reduktionPct, aarTilMaal, maalProgressPct } from '../beregninger';

export type HeroData = {
  kommuneNavn: string;
  nuvaerendeAar: number | null;
  nuvaerendeVaerdi: number | null;
  enhed: string | null;
  reduktionPct: number | null;
  maalAar: number | null;
  aarTilMaal: number | null;
  progressPct: number | null;
};

export async function loadData(
  kommuneId: string,
  _config: Record<string, unknown>,
  kommuneNavn: string,
  nuAar: number,
): Promise<HeroData> {
  const [serie, maal] = await Promise.all([getCo2eSeries(kommuneId), getReduktionsMaal(kommuneId)]);
  const medAar = serie.filter((d) => d.aar !== null);
  const seneste = medAar.length ? medAar[medAar.length - 1] : null;

  let red: number | null = null;
  let progress: number | null = null;
  if (maal && seneste) {
    red = reduktionPct(maal.baselineVaerdi, seneste.vaerdi);
    progress = maalProgressPct(maal.baselineVaerdi, seneste.vaerdi, maal.maalVaerdi);
  }

  return {
    kommuneNavn,
    nuvaerendeAar: seneste?.aar ?? null,
    nuvaerendeVaerdi: seneste?.vaerdi ?? null,
    enhed: maal?.enhed ?? 'ton CO₂e',
    reduktionPct: red,
    maalAar: maal?.maalAar ?? null,
    aarTilMaal: maal ? aarTilMaal(maal.maalAar, nuAar) : null,
    progressPct: progress,
  };
}
