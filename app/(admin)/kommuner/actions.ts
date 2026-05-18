'use server';
import { z } from 'zod';
import { createKommune } from '@/db/queries';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { FormState } from '@/lib/definitions';

const CreateKommuneSchema = z.object({
  navn: z.string().min(2, 'Navn skal være mindst 2 tegn.').max(100),
  kommunekode: z.string().min(3, 'Kommunekode skal være mindst 3 tegn.').max(10),
});

function toSubdomain(navn: string): string {
  return navn
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function createKommuneAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    navn: formData.get('navn'),
    kommunekode: formData.get('kommunekode'),
  };
  const parsed = CreateKommuneSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { navn, kommunekode } = parsed.data;
  const subdomain = toSubdomain(navn);

  try {
    await createKommune({ navn, kommunekode, subdomain });
  } catch {
    return { message: 'Subdomæne eller kommunekode er allerede i brug.' };
  }

  revalidatePath('/admin/kommuner');
  redirect('/admin/kommuner');
}
