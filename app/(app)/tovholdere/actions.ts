'use server';
import { verifySession } from '@/lib/dal';
import {
  createTovholder, updateTovholder, getAllTovholdere,
  assignTiltagToTovholder, removeTiltagFromTovholder,
  getTovholderById,
} from '@/db/queries';
import { createMagicLink } from '@/db/queries/magic-link';
import { sendMagicLinkEmail } from '@/lib/email';
import { getKommuneById } from '@/db/queries';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { FormState } from '@/lib/definitions';

const schema = z.object({
  navn: z.string().min(1, 'Navn er påkrævet'),
  email: z.string().email('Ugyldig email-adresse'),
  forvaltning: z.string().optional(),
});

export async function createTovholderAction(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await createTovholder({ ...parsed.data, kommuneId: session.kommuneId });
  redirect('/tovholdere');
}

export async function updateTovholderAction(
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();
  if (!session?.kommuneId) return { message: 'Ikke autoriseret' };

  const existing = await getTovholderById(id);
  if (!existing || existing.kommuneId !== session.kommuneId) return { message: 'Ikke autoriseret' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await updateTovholder(id, parsed.data);
  redirect('/tovholdere');
}

export async function assignTiltagAction(tovholderId: string, tiltagId: string) {
  const session = await verifySession();
  if (!session?.kommuneId) throw new Error('Ikke autoriseret');
  const th = await getTovholderById(tovholderId);
  if (!th || th.kommuneId !== session.kommuneId) throw new Error('Ikke autoriseret');
  await assignTiltagToTovholder(tovholderId, tiltagId);
}

export async function removeTiltagAction(tovholderId: string, tiltagId: string) {
  const session = await verifySession();
  if (!session?.kommuneId) throw new Error('Ikke autoriseret');
  const th = await getTovholderById(tovholderId);
  if (!th || th.kommuneId !== session.kommuneId) throw new Error('Ikke autoriseret');
  await removeTiltagFromTovholder(tovholderId, tiltagId);
}

export async function sendRundeAction(): Promise<void> {
  const session = await verifySession();
  if (!session?.kommuneId) throw new Error('Ikke autoriseret');

  const [tovholdere, kommune] = await Promise.all([
    getAllTovholdere(session.kommuneId),
    getKommuneById(session.kommuneId),
  ]);
  if (!kommune) throw new Error('Kommune ikke fundet');

  const base = process.env.NODE_ENV === 'production'
    ? `https://${kommune.subdomain}.klimastatus.dk`
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

  const aktiveTovholdere = tovholdere.filter((t) => t.aktiv);
  await Promise.all(
    aktiveTovholdere.map(async (tovholder) => {
      const token = await createMagicLink(tovholder.id);
      await sendMagicLinkEmail(tovholder.email, `${base}/rapport/${token}`, kommune.navn);
    }),
  );

  redirect('/tovholdere');
}
