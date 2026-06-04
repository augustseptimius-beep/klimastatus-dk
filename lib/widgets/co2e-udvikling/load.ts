import { getCo2eSeries } from '@/db/queries/public-dashboard';
import { getReduktionsMaal } from '@/db/queries/maal';

export type Co2ePunkt = { aar: number; vaerdi: number };
export type Co2eUdviklingData = {
  punkter: Co2ePunkt[];
  enhed: 'total' | 'per_capita';
  enhedLabel: string;
  maalAar: number | null;
  maalVaerdi: number | null;
};

export async function loadData(
  kommuneId: string,
  config: Record<string, unknown>,
  ctx: { befolkningstal: number | null },
): Promise<Co2eUdviklingData> {
  const enhed = config.enhed === 'per_capita' ? 'per_capita' : 'total';
  const [serie, maal] = await Promise.all([getCo2eSeries(kommuneId), getReduktionsMaal(kommuneId)]);
  const pop = ctx.befolkningstal ?? null;

  const skala = (v: number) => (enhed === 'per_capita' && pop ? v / pop : v);
  const punkter = serie
    .filter((d): d is { aar: number; vaerdi: number } => d.aar !== null)
    .map((d) => ({ aar: d.aar, vaerdi: Number(skala(d.vaerdi).toFixed(enhed === 'per_capita' ? 2 : 0)) }));

  return {
    punkter,
    enhed,
    enhedLabel: enhed === 'per_capita' ? 'ton CO₂e/indb.' : 'ton CO₂e',
    maalAar: maal?.maalAar ?? null,
    maalVaerdi: maal ? Number(skala(maal.maalVaerdi).toFixed(enhed === 'per_capita' ? 2 : 0)) : null,
  };
}
