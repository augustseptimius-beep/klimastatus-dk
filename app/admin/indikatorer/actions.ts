'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createTemplate, setTemplateAktiv } from '@/db/queries/indikator-template';
import type { FormState } from '@/lib/definitions';

const TemplateSchema = z.object({
  titel: z.string().min(2, 'Titel skal være mindst 2 tegn.').max(200),
  kilde: z.enum(['klimaregnskab', 'energidataservice', 'dst']),
  apiQuery: z.string().min(2, 'API-query er påkrævet.').refine((s) => {
    try { JSON.parse(s); return true; } catch { return false; }
  }, 'API-query skal være gyldigt JSON.'),
  enhed: z.string().min(1, 'Enhed er påkrævet.').max(50),
  beskrivelse: z.string().min(2, 'Beskrivelse er påkrævet.'),
  cctfKriterier: z.string().optional(),
});

export async function createTemplateAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    titel: formData.get('titel'),
    kilde: formData.get('kilde'),
    apiQuery: formData.get('apiQuery'),
    enhed: formData.get('enhed'),
    beskrivelse: formData.get('beskrivelse'),
    cctfKriterier: formData.get('cctfKriterier'),
  };
  const parsed = TemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { titel, kilde, apiQuery, enhed, beskrivelse, cctfKriterier } = parsed.data;
  const cctfArr = cctfKriterier
    ? cctfKriterier.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0)
    : [];

  try {
    await createTemplate({ titel, kilde, apiQuery, enhed, beskrivelse, cctfKriterier: cctfArr });
  } catch {
    return { message: 'Fejl ved oprettelse af indikator.' };
  }
  revalidatePath('/admin/indikatorer');
  return { message: undefined };
}

export async function toggleTemplateAktivAction(id: string, aktiv: boolean): Promise<void> {
  await setTemplateAktiv(id, aktiv);
  revalidatePath('/admin/indikatorer');
}
