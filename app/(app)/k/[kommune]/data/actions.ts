'use server';
import { revalidatePath } from 'next/cache';
import { tilknytIndikatorTiltag, fjernIndikatorTiltag } from '@/db/queries/indikator-kobling';
import { requireKommuneContext } from '@/lib/kommune-context';
import { db } from '@/db';
import { indikator } from '@/db/schema';
import { getTemplateById } from '@/db/queries/indikator-template';
import { getTiltagById } from '@/db/queries/tiltag';
import { syncCctfMappings } from '@/db/queries/cctf';
import { kriterierForIndikator } from '@/lib/cctf/auto-mapping';
import {
  createKommuneIndikator,
  setKommuneIndikatorAktiv,
  getKommuneIndikatorById,
} from '@/db/queries/kommune-indikator';
import type { FormState } from '@/lib/definitions';

export async function activateTemplateAction(
  slug: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);

  const templateId = formData.get('templateId') as string;
  const template = await getTemplateById(templateId);
  if (!template || !template.aktiv) return { message: 'Indikator ikke tilgængelig.' };

  try {
    const [newIndikator] = await db.insert(indikator).values({
      niveau: 'impact',
      beskrivelse: template.titel,
      enhed: template.enhed,
      datakildeType: 'api',
      apiKilde: template.kilde as 'klimaregnskab' | 'energidataservice' | 'dst',
      apiQuery: template.apiQuery,
    }).returning();
    await createKommuneIndikator({
      kommuneId: kommune.id,
      templateId,
      indikatorId: newIndikator.id,
    });
    await syncCctfMappings('indikator', newIndikator.id, kriterierForIndikator(template));
  } catch {
    return { message: 'Fejl ved aktivering af indikator.' };
  }
  revalidatePath(`/k/${slug}/data`);
  return { message: undefined };
}

export async function deactivateKommuneIndikatorAction(slug: string, id: string): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);

  const ki = await getKommuneIndikatorById(id);
  if (!ki || ki.kommuneId !== kommune.id) return;

  await setKommuneIndikatorAktiv(id, false);
  revalidatePath(`/k/${slug}/data`);
}

export async function activateTemplateFormAction(slug: string, formData: FormData): Promise<void> {
  await activateTemplateAction(slug, undefined, formData);
}

export async function hentNuFormAction(
  slug: string,
  kommuneIndikatorId: string,
  formData: FormData,
): Promise<void> {
  await hentNuAction(slug, kommuneIndikatorId, undefined, formData);
}

export async function hentNuAction(
  slug: string,
  kommuneIndikatorId: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);

  const ki = await getKommuneIndikatorById(kommuneIndikatorId);
  if (!ki || ki.kommuneId !== kommune.id) return { message: 'Adgang nægtet.' };

  const fromYearRaw = formData.get('fromYear') as string | null;
  const fromYear = fromYearRaw && fromYearRaw !== '' ? Number(fromYearRaw) : undefined;

  try {
    const template = await getTemplateById(ki.templateId);
    if (!template) return { message: 'Template ikke fundet.' };

    const { getBoss } = await import('@/lib/jobs/boss-client');
    const boss = await getBoss();
    const jobName = `fetch-${template.kilde}`;
    await boss.send(jobName, { kommuneIndikatorId, fromYear });
  } catch {
    return { message: 'Fejl ved opstart af hentning.' };
  }

  revalidatePath(`/k/${slug}/data`);
  return { message: undefined };
}

export async function tilknytIndikatorTiltagAction(
  slug: string,
  kommuneIndikatorId: string,
  tiltagId: string,
): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);
  const ki = await getKommuneIndikatorById(kommuneIndikatorId);
  if (!ki || ki.kommuneId !== kommune.id) return;
  const t = await getTiltagById(tiltagId);
  if (!t || t.kommuneId !== kommune.id) return;
  await tilknytIndikatorTiltag(ki.indikatorId, tiltagId);
  revalidatePath(`/k/${slug}/data`);
}

export async function fjernIndikatorTiltagAction(
  slug: string,
  kommuneIndikatorId: string,
  tiltagId: string,
): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);
  const ki = await getKommuneIndikatorById(kommuneIndikatorId);
  if (!ki || ki.kommuneId !== kommune.id) return;
  const t = await getTiltagById(tiltagId);
  if (!t || t.kommuneId !== kommune.id) return;
  await fjernIndikatorTiltag(ki.indikatorId, tiltagId);
  revalidatePath(`/k/${slug}/data`);
}
