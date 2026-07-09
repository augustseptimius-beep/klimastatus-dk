/**
 * Minimal in-memory rate limiter til login-forsøg.
 *
 * Bevidst simpel: appen kører som ÉN container (Coolify/Hetzner), så delt
 * state på tværs af instanser er ikke et behov. Nulstilles ved genstart/
 * deploy — acceptabelt: formålet er at stoppe brute force af kommunale
 * koordinator-konti, ikke at være et perfekt distribueret system.
 *
 * Kun FEJLEDE forsøg tæller; succesfuldt login nulstiller tælleren.
 */
type Vindue = { fejl: number; vinduesStart: number };

const MAKS_FEJL = 10;
const VINDUE_MS = 15 * 60 * 1000;
const MAKS_NOEGLER = 10_000;

const vinduer = new Map<string, Vindue>();

function rensUdloebne(nu: number): void {
  for (const [noegle, v] of vinduer) {
    if (nu - v.vinduesStart > VINDUE_MS) vinduer.delete(noegle);
  }
}

/** Er nøglen (fx email) blokeret lige nu? */
export function erBlokeret(noegle: string, nu: number = Date.now()): boolean {
  const v = vinduer.get(noegle);
  if (!v) return false;
  if (nu - v.vinduesStart > VINDUE_MS) {
    vinduer.delete(noegle);
    return false;
  }
  return v.fejl >= MAKS_FEJL;
}

/** Registrér et fejlet forsøg. */
export function registrerFejletForsoeg(noegle: string, nu: number = Date.now()): void {
  if (vinduer.size > MAKS_NOEGLER) rensUdloebne(nu);
  const v = vinduer.get(noegle);
  if (!v || nu - v.vinduesStart > VINDUE_MS) {
    vinduer.set(noegle, { fejl: 1, vinduesStart: nu });
    return;
  }
  v.fejl += 1;
}

/** Nulstil efter succesfuldt login. */
export function nulstilForsoeg(noegle: string): void {
  vinduer.delete(noegle);
}

/** Kun til tests. */
export function _ryddAlle(): void {
  vinduer.clear();
}
