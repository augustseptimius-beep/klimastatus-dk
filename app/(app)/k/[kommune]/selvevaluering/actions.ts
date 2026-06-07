'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
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

export async function genererSelvevaluering(slug: string): Promise<{ ok: boolean }> {
  const { kommune } = await requireKommuneContext(slug);

  const existing = await getSelvevaluering(kommune.id);
  let data = existing?.kriterieData ?? initialiserKriterieData('2.5');

  for (const k of data.kriterier) {
    const dokRefs = await getDokumentationshenvisninger(kommune.id, k.kriterieNr);
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

  await upsertSelvevaluering(kommune.id, data);
  revalidatePath(`/k/${slug}/selvevaluering`);
  return { ok: true };
}

export async function saveKriterieBesvarelse(
  slug: string,
  kriterieNr: number,
  tekst: Pick<KriterieBesvarelse, 'hvadStaarPaa' | 'hvadOpdateres' | 'selvvurdering' | 'selvvurderingNiveau'>,
): Promise<{ ok: boolean }> {
  const { kommune } = await requireKommuneContext(slug);

  // Lazy-init: opret skemaet ved første redigering, så man ikke behøver
  // klikke "Generér skema" først.
  const existing = await getSelvevaluering(kommune.id);
  const base = existing?.kriterieData ?? initialiserKriterieData('2.5');

  const opdateret = opdaterKriterieText(base, kriterieNr, tekst);
  await upsertSelvevaluering(kommune.id, opdateret);
  return { ok: true };
}

export async function godkendKriterie(slug: string, kriterieNr: number): Promise<{ ok: boolean }> {
  const { kommune } = await requireKommuneContext(slug);

  // Lazy-init: tillad godkendelse selv hvis "Generér skema" aldrig blev klikket.
  const existing = await getSelvevaluering(kommune.id);
  const base = existing?.kriterieData ?? initialiserKriterieData('2.5');

  const dokRefs = await getDokumentationshenvisninger(kommune.id, kriterieNr);
  const opdateret = godkendKriterieInData(base, kriterieNr, dokRefs);
  await upsertSelvevaluering(kommune.id, opdateret);
  revalidatePath(`/k/${slug}/selvevaluering`);
  return { ok: true };
}

export async function genererSelvevalueringFormAction(slug: string, _formData: FormData): Promise<void> {
  await genererSelvevaluering(slug);
}
