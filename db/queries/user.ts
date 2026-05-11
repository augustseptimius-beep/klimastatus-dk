import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';

export async function getUserByEmail(email: string) {
  return db.query.user.findFirst({ where: eq(user.email, email) });
}

export async function createUser(data: {
  email: string;
  password: string;
  navn: string;
  role: string;
  kommuneId: string | null;
}) {
  const passwordHash = await hash(data.password);
  const [created] = await db
    .insert(user)
    .values({
      email: data.email,
      passwordHash,
      navn: data.navn,
      role: data.role,
      ...(data.kommuneId ? { kommuneId: data.kommuneId } : {}),
    })
    .returning({ id: user.id, email: user.email, navn: user.navn, role: user.role });
  return created;
}
