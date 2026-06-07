'use server';
import { z } from 'zod';
import { createKommune } from '@/db/queries';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { FormState } from '@/lib/definitions';
import { verifySession } from '@/lib/dal';
import { findKommune } from '@/lib/kommuner-liste';
import { deleteKommune } from '@/db/queries';

const CreateKommuneSchema = z.object({
  kommunekode: z.string().min(3).max(3),
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
  const session = await verifySession();
  if (!session || session.role !== 'admin') redirect('/login');

  const parsed = CreateKommuneSchema.safeParse({ kommunekode: formData.get('kommunekode') });
  if (!parsed.success) {
    return { errors: { kommunekode: ['Vælg en kommune fra listen.'] } };
  }

  const kommune = findKommune(parsed.data.kommunekode);
  if (!kommune) {
    return { errors: { kommunekode: ['Ukendt kommunekode.'] } };
  }

  const { navn, kode: kommunekode } = kommune;
  const subdomain = toSubdomain(navn);

  try {
    await createKommune({ navn, kommunekode, subdomain });
  } catch {
    return { message: 'Kommunen er allerede oprettet.' };
  }

  revalidatePath('/admin/kommuner');
  redirect('/admin/kommuner');
}

export async function deleteKommuneAction(formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session || session.role !== 'admin') redirect('/login');

  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return;

  await deleteKommune(id);
  revalidatePath('/admin/kommuner');
}
