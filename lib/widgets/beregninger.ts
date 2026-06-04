export function reduktionPct(baseline: number, nuvaerende: number): number {
  if (baseline === 0) return 0;
  return ((baseline - nuvaerende) / baseline) * 100;
}

export function aarTilMaal(maalAar: number, nuAar: number): number {
  return maalAar - nuAar;
}

export function aendringPct(forrige: number, nuvaerende: number): number | null {
  if (forrige === 0) return null;
  return ((nuvaerende - forrige) / forrige) * 100;
}

export function maalProgressPct(baseline: number, nuvaerende: number, maal: number): number {
  const planlagt = baseline - maal;
  if (planlagt <= 0) return 0;
  const opnaaet = baseline - nuvaerende;
  return Math.max(0, Math.min(100, (opnaaet / planlagt) * 100));
}
