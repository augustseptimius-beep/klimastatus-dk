import { PgBoss } from 'pg-boss';
import { handleRykker } from './lib/jobs/rykker';

async function setupJobs() {
  const boss = new PgBoss(process.env.DATABASE_URL!);
  await boss.start();

  await boss.work('rykker', async () => {
    await handleRykker();
  });

  await boss.schedule('rykker', '0 9 * * *', {});
}

setupJobs().catch(console.error);
