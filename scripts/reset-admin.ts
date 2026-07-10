import { hash } from '@node-rs/argon2';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { resolveSeedPassword } from '../lib/seed-guard';

const EMAIL = process.env.ADMIN_EMAIL ?? 'augustseptimius@gmail.com';
const resultat = resolveSeedPassword({
  envNavn: 'ADMIN_PASSWORD',
  envVaerdi: process.env.ADMIN_PASSWORD,
  fallback: 'admin123!',
  erProduktion: process.env.NODE_ENV === 'production',
});
if (resultat.password === null) {
  console.error(`[reset-admin] ${resultat.fejl}`);
  process.exit(1);
}
const PASSWORD = resultat.password;

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const passwordHash = await hash(PASSWORD);

const existing = await db.select().from(user).where(eq(user.email, EMAIL)).limit(1);

if (existing.length > 0) {
  await db.update(user).set({ passwordHash }).where(eq(user.email, EMAIL));
  console.log(`Opdateret kodeord for ${EMAIL}`);
} else {
  await db.insert(user).values({
    email: EMAIL,
    passwordHash,
    navn: 'August Septimius',
    role: 'admin',
  });
  console.log(`Oprettet admin-bruger: ${EMAIL}`);
}

await client.end();
