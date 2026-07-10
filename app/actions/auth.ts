'use server';
import { z } from 'zod';
import { verify } from '@node-rs/argon2';
import { getUserByEmail, getKommuneById } from '@/db/queries';
import { createSession, deleteSession } from '@/lib/session';
import { erBlokeret, registrerFejletForsoeg, nulstilForsoeg } from '@/lib/rate-limit';
import { redirect } from 'next/navigation';
import type { FormState } from '@/lib/definitions';

const LoginSchema = z.object({
  email: z.string().email('Indtast en gyldig email.'),
  password: z.string().min(1, 'Adgangskode er påkrævet.'),
});

export async function login(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = { email: formData.get('email'), password: formData.get('password') };
  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { email, password } = parsed.data;
  const rateNoegle = email.toLowerCase();

  if (erBlokeret(rateNoegle)) {
    return { message: 'For mange loginforsøg. Prøv igen om 15 minutter.' };
  }

  const foundUser = await getUserByEmail(email);
  if (!foundUser || !foundUser.passwordHash) {
    registrerFejletForsoeg(rateNoegle);
    return { message: 'Forkert email eller adgangskode.' };
  }

  const passwordValid = await verify(foundUser.passwordHash, password);
  if (!passwordValid) {
    registrerFejletForsoeg(rateNoegle);
    return { message: 'Forkert email eller adgangskode.' };
  }
  nulstilForsoeg(rateNoegle);

  // Koordinator: hent slug til session og redirect
  let kommuneSlug: string | null = null;
  if (foundUser.role === 'koordinator' && foundUser.kommuneId) {
    const k = await getKommuneById(foundUser.kommuneId);
    kommuneSlug = k?.subdomain ?? null;
  }

  await createSession({
    userId: foundUser.id,
    kommuneId: foundUser.kommuneId ?? null,
    kommuneSlug,
    role: foundUser.role as 'admin' | 'koordinator',
    navn: foundUser.navn,
  });

  if (foundUser.role === 'admin') {
    redirect('/admin/kommuner');
  } else {
    redirect(kommuneSlug ? `/k/${kommuneSlug}/dashboard` : '/dashboard');
  }
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
