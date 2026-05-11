'use server';
import { z } from 'zod';
import { verify } from '@node-rs/argon2';
import { getUserByEmail } from '@/db/queries';
import { createSession, deleteSession } from '@/lib/session';
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

  const foundUser = await getUserByEmail(email);
  if (!foundUser || !foundUser.passwordHash) {
    return { message: 'Forkert email eller adgangskode.' };
  }

  const passwordValid = await verify(foundUser.passwordHash, password);
  if (!passwordValid) {
    return { message: 'Forkert email eller adgangskode.' };
  }

  await createSession({
    userId: foundUser.id,
    kommuneId: foundUser.kommuneId ?? null,
    role: foundUser.role as 'admin' | 'koordinator',
    navn: foundUser.navn,
  });

  redirect(foundUser.role === 'admin' ? '/admin/kommuner' : '/dashboard');
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
