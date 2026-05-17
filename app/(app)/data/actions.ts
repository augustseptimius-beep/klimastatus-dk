'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { db } from '@/db';
import { indikator } from '@/db/schema';
import { getTemplateById } from '@/db/queries/indikator-template';
import {
  createKommuneIndikator,
  setKommuneIndikatorAktiv,
  getKommuneIndikatorById,
} from '@/db/queries/kommune-indikator';
import type { FormState } from '@/lib/definitions';

export async function activateTemplateAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

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
      kommuneId: session.kommuneId,
      templateId,
      indikatorId: newIndikator.id,
    });
  } catch {
    return { message: 'Fejl ved aktivering af indikator.' };
  }
  revalidatePath('/data');
  return { message: undefined };
}

export async function deactivateKommuneIndikatorAction(id: string): Promise<void> {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const ki = await getKommuneIndikatorById(id);
  if (!ki || ki.kommuneId !== session.kommuneId) return;

  await setKommuneIndikatorAktiv(id, false);
  revalidatePath('/data');
}

export async function activateTemplateFormAction(formData: FormData): Promise<void> {
  await activateTemplateAction(undefined, formData);
}

export async function hentNuFormAction(
  kommuneIndikatorId: string,
  formData: FormData,
): Promise<void> {
  await hentNuAction(kommuneIndikatorId, undefined, formData);
}

export async function hentNuAction(
  kommuneIndikatorId: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) redirect('/login');

  const ki = await getKommuneIndikatorById(kommuneIndikatorId);
  if (!ki || ki.kommuneId !== session.kommuneId) return { message: 'Adgang nægtet.' };

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

  revalidatePath('/data');
  return { message: undefined };
}
