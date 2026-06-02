// Kører pending Drizzle-migrationer mod DATABASE_URL og afslutter.
// Eksekveres ved container-opstart (før server.js) — inde i Docker-netværket,
// hvor den interne Postgres er tilgængelig. Bruger kun production-deps
// (postgres + drizzle-orm), som allerede ligger i standalone-imaget.
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[migrate] DATABASE_URL er ikke sat — afbryder.');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

try {
  console.log('[migrate] Kører migrationer...');
  await migrate(drizzle(sql), { migrationsFolder: './db/migrations' });
  console.log('[migrate] Færdig.');
  await sql.end();
  process.exit(0);
} catch (err) {
  console.error('[migrate] Migrering fejlede:', err);
  await sql.end({ timeout: 5 }).catch(() => {});
  process.exit(1);
}
