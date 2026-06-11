'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import { createTiltag, updateTiltag, getTiltagById, getIndsatsOmraadeById, setTiltagTovholdere, setTiltagEffekter } from '@/db/queries';
import { syncCctfMappings } from '@/db/queries/cctf';
import { kriterierForTiltag } from '@/lib/cctf/auto-mapping';
import { normaliserEffekter, type RaaEffekt } from '@/lib/tiltag/normaliser-effekter';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { FormState } from '@/lib/definitions';

const schema = z.object({
  indsatsOmraadeId: z.string().min(1, 'Indsatsområde er påkrævet'),
  titel: z.string().min(1, 'Titel er påkrævet'),
  type: z.enum(['reduction', 'adaptation', 'both']),
  status: z.enum(['planned', 'in_progress', 'completed', 'discontinued']).default('planned'),
  beskrivelse: z.string().optional(),
  tidsrammeStartAar: z.string().optional().transform((v) => v?.trim() || undefined),
  tidsrammeStartMaaned: z.string().optional().transform((v) => v?.trim() || undefined),
  tidsrammeSlutAar: z.string().optional().transform((v) => v?.trim() || undefined),
  tidsrammeSlutMaaned: z.string().optional().transform((v) => v?.trim() || undefined),
});

function parseEffekter(formData: FormData): RaaEffekt[] {
  const raw = formData.get('effekter');
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((e) => ({
      kategori: typeof e?.kategori === 'string' ? e.kategori : null,
      vaerdi: typeof e?.vaerdi === 'number' ? e.vaerdi : null,
      enhed: typeof e?.enhed === 'string' ? e.enhed : null,
      beskrivelse: typeof e?.beskrivelse === 'string' ? e.beskrivelse : null,
    }));
  } catch {
    return [];
  }
}

function byggDato(aar?: string, maaned?: string): string | undefined {
  if (!aar) return undefined;
  const mm = maaned || '01';
  return `${aar}-${mm}-01`;
}

export async function createTiltagAction(slug: string, _state: FormState, formData: FormData): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const indsatsOmraade = await getIndsatsOmraadeById(parsed.data.indsatsOmraadeId);
  if (!indsatsOmraade || indsatsOmraade.kommuneId !== kommune.id) return { message: 'Ugyldigt indsatsområde' };

  const { tidsrammeStartAar, tidsrammeStartMaaned, tidsrammeSlutAar, tidsrammeSlutMaaned, ...rest } = parsed.data;
  const nytTiltag = await createTiltag({
    ...rest,
    kommuneId: kommune.id,
    tidsrammeStart: byggDato(tidsrammeStartAar, tidsrammeStartMaaned),
    tidsrammeSlut: byggDato(tidsrammeSlutAar, tidsrammeSlutMaaned),
  });
  const tovholderIds = formData.getAll('tovholderIds') as string[];
  if (tovholderIds.length > 0) {
    await setTiltagTovholdere(nytTiltag.id, tovholderIds);
  }
  await setTiltagEffekter(nytTiltag.id, normaliserEffekter(parseEffekter(formData)));
  await syncCctfMappings('tiltag', nytTiltag.id, kriterierForTiltag(nytTiltag));
  redirect(`/k/${slug}/tiltag`);
}

export async function updateTiltagAction(
  slug: string,
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);

  const existing = await getTiltagById(id);
  if (!existing || existing.kommuneId !== kommune.id) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const indsatsOmraade = await getIndsatsOmraadeById(parsed.data.indsatsOmraadeId);
  if (!indsatsOmraade || indsatsOmraade.kommuneId !== kommune.id) return { message: 'Ugyldigt indsatsområde' };

  const { tidsrammeStartAar, tidsrammeStartMaaned, tidsrammeSlutAar, tidsrammeSlutMaaned, ...rest } = parsed.data;
  const opdateret = await updateTiltag(id, {
    ...rest,
    tidsrammeStart: byggDato(tidsrammeStartAar, tidsrammeStartMaaned),
    tidsrammeSlut: byggDato(tidsrammeSlutAar, tidsrammeSlutMaaned),
  });
  const tovholderIds = formData.getAll('tovholderIds') as string[];
  await setTiltagTovholdere(id, tovholderIds);
  await setTiltagEffekter(id, normaliserEffekter(parseEffekter(formData)));
  await syncCctfMappings('tiltag', id, kriterierForTiltag(opdateret));
  redirect(`/k/${slug}/tiltag`);
}
