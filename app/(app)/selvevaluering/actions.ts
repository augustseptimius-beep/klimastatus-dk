'use server';
import { verifySession } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import {
  getSelvevaluering,
  upsertSelvevaluering,
  getDokumentationshenvisninger,
  initialiserKriterieData,
  opdaterKriterieText,
  godkendKriterieInData,
} from '@/db/queries/selvevaluering';
import type { KriterieBesvarelse } from '@/lib/cctf/selvevaluering-types';

/**
 * Opret selvevaluering hvis den mangler.
 * Opdatér dokumentationshenvisninger for alle 16 kriterier.
 * Overskriver ALDRIG fritekst-felter (idempotent).
 */
export async function genererSelvevaluering(): Promise<{ ok: boolean }> {
  const session = await verifySession();
  if (!session?.kommuneId) return { ok: false };

  const existing = await getSelvevaluering(session.kommuneId);
  let data = existing?.kriterieData ?? initialiserKriterieData('2.5');

  // Opdatér dokumentationshenvisninger for alle 16 — bevar tekstfelter
  for (const k of data.kriterier) {
    const dokRefs = await getDokumentationshenvisninger(session.kommuneId, k.kriterieNr);
    // Kun opdatér dok-refs på ikke-godkendte (godkendte er immutable snapshots)
    if (k.status !== 'godkendt') {
      data = {
        ...data,
        kriterier: data.kriterier.map(kr =>
          kr.kriterieNr === k.kriterieNr
            ? { ...kr, dokumentationshenvisninger: dokRefs }
            : kr
        ),
      };
    }
  }

  await upsertSelvevaluering(session.kommuneId, data);
  revalidatePath('/selvevaluering');
  return { ok: true };
}

/**
 * Auto-save tekstfelter pr. kriterie.
 * Kalder IKKE revalidatePath — undgår re-render-thrash ved debounced save.
 */
export async function saveKriterieBesvarelse(
  kriterieNr: number,
  tekst: Pick<KriterieBesvarelse, 'hvadStaarPaa' | 'hvadOpdateres' | 'selvvurdering'>,
): Promise<{ ok: boolean }> {
  const session = await verifySession();
  if (!session?.kommuneId) return { ok: false };

  const existing = await getSelvevaluering(session.kommuneId);
  if (!existing) return { ok: false };

  const opdateret = opdaterKriterieText(existing.kriterieData, kriterieNr, tekst);
  await upsertSelvevaluering(session.kommuneId, opdateret);
  return { ok: true };
}

/**
 * Godkend ét kriterie: snapshot live dokumentationshenvisninger, sæt status godkendt.
 */
export async function godkendKriterie(kriterieNr: number): Promise<{ ok: boolean }> {
  const session = await verifySession();
  if (!session?.kommuneId) return { ok: false };

  const existing = await getSelvevaluering(session.kommuneId);
  if (!existing) return { ok: false };

  const dokRefs = await getDokumentationshenvisninger(session.kommuneId, kriterieNr);
  const opdateret = godkendKriterieInData(existing.kriterieData, kriterieNr, dokRefs);
  await upsertSelvevaluering(session.kommuneId, opdateret);
  revalidatePath('/selvevaluering');
  return { ok: true };
}

/** Thin form action wrapper — bruges af <form action={...}> i page.tsx. */
export async function genererSelvevalueringFormAction(_formData: FormData): Promise<void> {
  await genererSelvevaluering();
}
