import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export type TovholderSessionPayload = {
  tovholderId: string;
  kommuneId: string;
  expiresAt: Date;
};

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function encryptTovholder(payload: TovholderSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getKey());
}

export async function decryptTovholder(token: string): Promise<TovholderSessionPayload | undefined> {
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ['HS256'] });
    return payload as unknown as TovholderSessionPayload;
  } catch {
    return undefined;
  }
}

export async function createTovholderSession(data: Omit<TovholderSessionPayload, 'expiresAt'>) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = await encryptTovholder({ ...data, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set('tovholder-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function verifyTovholderSession(): Promise<TovholderSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('tovholder-session')?.value;
  if (!token) return null;
  const payload = await decryptTovholder(token);
  if (!payload) return null;
  if (new Date(payload.expiresAt) < new Date()) return null;
  return payload;
}
