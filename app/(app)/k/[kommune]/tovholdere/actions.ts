'use server';
import { requireKommuneContext } from '@/lib/kommune-context';
import {
  createTovholder, updateTovholder, getAllTovholdere,
  assignTiltagToTovholder, removeTiltagFromTovholder,
  getTovholderById, getTiltagById,
} from '@/db/queries';
import { createMagicLink } from '@/db/queries/magic-link';
import { sendMagicLinkEmail } from '@/lib/email';
import { getKommuneById } from '@/db/queries';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { FormState } from '@/lib/definitions';

const schema = z.object({
  navn: z.string().min(1, 'Navn er påkrævet'),
  email: z.string().email('Ugyldig email-adresse'),
  forvaltning: z.string().optional(),
});

export async function createTovholderAction(slug: string, _state: FormState, formData: FormData): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await createTovholder({ ...parsed.data, kommuneId: kommune.id });
  redirect(`/k/${slug}/tovholdere`);
}

export async function updateTovholderAction(
  slug: string,
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const { kommune } = await requireKommuneContext(slug);

  const existing = await getTovholderById(id);
  if (!existing || existing.kommuneId !== kommune.id) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await updateTovholder(id, parsed.data);
  redirect(`/k/${slug}/tovholdere`);
}

export async function assignTiltagAction(slug: string, tovholderId: string, tiltagId: string) {
  const { kommune } = await requireKommuneContext(slug);
  const th = await getTovholderById(tovholderId);
  if (!th || th.kommuneId !== kommune.id) throw new Error('Ikke autoriseret');
  const tiltag = await getTiltagById(tiltagId);
  if (!tiltag || tiltag.kommuneId !== kommune.id) throw new Error('Ikke autoriseret');
  await assignTiltagToTovholder(tovholderId, tiltagId);
  revalidatePath(`/k/${slug}/tovholdere/${tovholderId}`);
}

export async function removeTiltagAction(slug: string, tovholderId: string, tiltagId: string) {
  const { kommune } = await requireKommuneContext(slug);
  const th = await getTovholderById(tovholderId);
  if (!th || th.kommuneId !== kommune.id) throw new Error('Ikke autoriseret');
  const tiltag = await getTiltagById(tiltagId);
  if (!tiltag || tiltag.kommuneId !== kommune.id) throw new Error('Ikke autoriseret');
  await removeTiltagFromTovholder(tovholderId, tiltagId);
  revalidatePath(`/k/${slug}/tovholdere/${tovholderId}`);
}

export async function sendRundeAction(slug: string): Promise<void> {
  const { kommune } = await requireKommuneContext(slug);

  const [tovholdere, kommuneRow] = await Promise.all([
    getAllTovholdere(kommune.id),
    getKommuneById(kommune.id),
  ]);
  if (!kommuneRow) throw new Error('Kommune ikke fundet');

  const base = process.env.NODE_ENV === 'production'
    ? `https://${kommuneRow.subdomain}.klimastatus.dk`
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

  const aktiveTovholdere = tovholdere.filter((t) => t.aktiv);
  await Promise.all(
    aktiveTovholdere.map(async (tovholder) => {
      const token = await createMagicLink(tovholder.id);
      await sendMagicLinkEmail(tovholder.email, `${base}/rapport/${token}`, kommuneRow.navn);
    }),
  );

  redirect(`/k/${slug}/tovholdere`);
}
