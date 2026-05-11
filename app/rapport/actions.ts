'use server';
import { cookies } from 'next/headers';
import { decryptTovholder } from '@/lib/tovholder-session';
import { upsertRapport } from '@/db/queries/rapport';
import { getTiltagForTovholder } from '@/db/queries/tiltag';
import type { FormState } from '@/lib/definitions';

export async function saveRapportAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const cookieStore = await cookies();
  const token = cookieStore.get('tovholder-session')?.value;
  if (!token) return { message: 'Ikke autoriseret — brug linket fra din email.' };

  const session = await decryptTovholder(token);
  if (!session || new Date(session.expiresAt) < new Date()) {
    return { message: 'Session udløbet — brug linket fra din email igen.' };
  }

  const dato = new Date().toISOString().split('T')[0];

  const tiltagIds = [...new Set(
    [...formData.keys()]
      .filter((k) => k.startsWith('tiltag_') && k.endsWith('_id'))
      .map((k) => formData.get(k) as string)
      .filter(Boolean),
  )];

  const ownedTiltag = await getTiltagForTovholder(session.tovholderId);
  const ownedIds = new Set(ownedTiltag.map((t) => t.id));
  const safeTiltagIds = tiltagIds.filter((id) => ownedIds.has(id));

  await Promise.all(
    safeTiltagIds.map((tiltagId) =>
      upsertRapport(session.tovholderId, tiltagId, dato, {
        statusImplementering: (formData.get(`tiltag_${tiltagId}_statusImplementering`) as string) || undefined,
        barrierer: (formData.get(`tiltag_${tiltagId}_barrierer`) as string) || undefined,
        naesteSkrid: (formData.get(`tiltag_${tiltagId}_naesteSkrid`) as string) || undefined,
      }),
    ),
  );

  return { message: 'Status gemt ✓' };
}
