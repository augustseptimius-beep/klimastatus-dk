/**
 * Vagt for seed-passwords: i produktion må der ALDRIG oprettes brugere med
 * fallback-passwords fra kildekoden (repoet er offentligt — AGPL), så uden
 * miljøvariabel springes brugeroprettelsen over med en tydelig fejlbesked.
 * I udvikling er fallback fint.
 */
export type SeedPasswordResultat =
  | { password: string; fejl: null }
  | { password: null; fejl: string };

export function resolveSeedPassword(opts: {
  envNavn: string;
  envVaerdi: string | undefined;
  fallback: string;
  erProduktion: boolean;
}): SeedPasswordResultat {
  const { envNavn, envVaerdi, fallback, erProduktion } = opts;
  if (envVaerdi && envVaerdi.trim().length >= 8) {
    return { password: envVaerdi, fejl: null };
  }
  if (envVaerdi && envVaerdi.trim().length < 8) {
    return { password: null, fejl: `${envNavn} er sat, men er under 8 tegn — brugeren oprettes/opdateres ikke.` };
  }
  if (erProduktion) {
    return {
      password: null,
      fejl: `${envNavn} er ikke sat. I produktion oprettes brugeren ikke med fallback-password (det står i det offentlige repo). Sæt ${envNavn} og genstart.`,
    };
  }
  return { password: fallback, fejl: null };
}
