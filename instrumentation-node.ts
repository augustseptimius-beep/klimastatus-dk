import { PgBoss } from 'pg-boss';
import { handleRykker } from './lib/jobs/rykker';

async function setupJobs() {
  const boss = new PgBoss(process.env.DATABASE_URL!);
  await boss.start();

  await boss.work('rykker', { teamSize: 1, teamConcurrency: 1 }, async () => {
    await handleRykker();
  });

  await boss.schedule('rykker', '0 9 * * *', {}, { retryLimit: 0 });
}

setupJobs().catch((err) => {
  console.error('[rykker] Failed to start job system:', err);
  process.exit(1);
});
