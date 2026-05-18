import { PgBoss } from 'pg-boss';
import { handleRykker } from './lib/jobs/rykker';
import { handleFetchKlimaregnskabet } from './lib/jobs/fetch-klimaregnskabet';
import { handleFetchEnergidataservice } from './lib/jobs/fetch-energidataservice';
import { handleFetchDst } from './lib/jobs/fetch-dst';

async function setupJobs() {
  const boss = new PgBoss(process.env.DATABASE_URL!);
  await boss.start();

  await boss.createQueue('rykker');
  await boss.work('rykker', { localConcurrency: 1 }, async () => {
    await handleRykker();
  });
  await boss.schedule('rykker', '0 9 * * *', {}, { retryLimit: 0 });

  await boss.createQueue('fetch-klimaregnskabet');
  await boss.work('fetch-klimaregnskabet', { localConcurrency: 1 }, async (jobs) => {
    const data = jobs[0]?.data as { kommuneIndikatorId?: string; fromYear?: number } | undefined;
    await handleFetchKlimaregnskabet(data ?? {});
  });
  await boss.schedule('fetch-klimaregnskabet', '0 6 1 * *', {}, { retryLimit: 2 });

  await boss.createQueue('fetch-energidataservice');
  await boss.work('fetch-energidataservice', { localConcurrency: 1 }, async (jobs) => {
    const data = jobs[0]?.data as { kommuneIndikatorId?: string } | undefined;
    await handleFetchEnergidataservice(data ?? {});
  });
  await boss.schedule('fetch-energidataservice', '0 6 1 * *', {}, { retryLimit: 2 });

  await boss.createQueue('fetch-dst');
  await boss.work('fetch-dst', { localConcurrency: 1 }, async (jobs) => {
    const data = jobs[0]?.data as { kommuneIndikatorId?: string } | undefined;
    await handleFetchDst(data ?? {});
  });
  await boss.schedule('fetch-dst', '0 6 1 * *', {}, { retryLimit: 2 });
}

setupJobs().catch((err) => {
  console.error('[jobs] Failed to start job system:', err);
  process.exit(1);
});
