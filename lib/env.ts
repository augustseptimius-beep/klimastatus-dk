/**
 * Miljøvariabel-tjek ved serverstart. Formålet er at fejle HØJT og TIDLIGT
 * med en besked man kan handle på kl. 22 en tirsdag — i stedet for at hver
 * eneste request fejler med en kryptisk 500 ("SESSION_SECRET is not set")
 * dybt inde i en server action.
 *
 * Ren funktion uden side effects så den kan testes; kalderen bestemmer om
 * der skal crashes (produktion) eller kun advares (udvikling).
 */
export type EnvTjekResultat = {
  fatale: string[];
  advarsler: string[];
};

export function tjekEnv(env: Record<string, string | undefined>): EnvTjekResultat {
  const fatale: string[] = [];
  const advarsler: string[] = [];

  if (!env.DATABASE_URL) {
    fatale.push('DATABASE_URL er ikke sat — appen kan ikke nå databasen.');
  }

  if (!env.SESSION_SECRET) {
    fatale.push('SESSION_SECRET er ikke sat — alle logins og sessioner vil fejle.');
  } else if (env.SESSION_SECRET.length < 32) {
    fatale.push('SESSION_SECRET er under 32 tegn — generér en ny med: openssl rand -base64 32');
  }

  // Manglende nøgler her degraderer features, men vælter ikke appen:
  if (!env.BREVO_API_KEY) {
    advarsler.push('BREVO_API_KEY mangler — tovholder-emails (magiske links, rykkere) sendes ikke.');
  }
  if (!env.ANTHROPIC_API_KEY) {
    advarsler.push('ANTHROPIC_API_KEY mangler — AI-import af handlingskataloger virker ikke.');
  }
  if (!env.KLIMAREGNSKABET_API_KEY) {
    advarsler.push('KLIMAREGNSKABET_API_KEY mangler — CO₂e-data fra Klimaregnskabet.dk kan ikke hentes.');
  }

  return { fatale, advarsler };
}

/**
 * Kør tjekket mod process.env. I produktion stopper processen ved fatale
 * mangler (fail fast ved deploy — containeren genstarter med tydelig log).
 * Uden for produktion logges der kun, så dev/CI ikke kræver fuld opsætning.
 */
export function validerEnvVedStart(): void {
  const { fatale, advarsler } = tjekEnv(process.env);

  for (const a of advarsler) console.warn(`[env] ADVARSEL: ${a}`);

  if (fatale.length > 0) {
    for (const f of fatale) console.error(`[env] FATAL: ${f}`);
    if (process.env.NODE_ENV === 'production') {
      console.error('[env] Serveren stopper. Sæt de manglende miljøvariabler og genstart.');
      process.exit(1);
    } else {
      console.warn('[env] (Uden for produktion fortsætter serveren trods fatale mangler.)');
    }
  }
}
