import { PgBoss } from 'pg-boss';
import { handleRykker } from './lib/jobs/rykker';
import { handleFetchKlimaregnskabet } from './lib/jobs/fetch-klimaregnskabet';
import { handleFetchEnergidataservice } from './lib/jobs/fetch-energidataservice';
import { handleFetchDst } from './lib/jobs/fetch-dst';
import { handleImportHandlingskatalog } from './lib/jobs/import-handlingskatalog';

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

  await boss.createQueue('import-handlingskatalog', { retryLimit: 0 });
  await boss.work('import-handlingskatalog', { localConcurrency: 1 }, async (jobs) => {
    const data = jobs[0]?.data as { importJobId: string } | undefined;
    if (!data?.importJobId) return;
    await handleImportHandlingskatalog(data);
  });

  await boss.createQueue('generer-kriterie-besvarelse');
  await boss.work('generer-kriterie-besvarelse', { localConcurrency: 1 }, async (jobs) => {
    const data = jobs[0]?.data as { selvevalueringId?: string; kriterieNr?: number } | undefined;
    // Stub — AI-generering implementeres i Fase 3b
    console.log(`[generer-kriterie-besvarelse] not implemented (selvevalueringId=${data?.selvevalueringId}, kriterieNr=${data?.kriterieNr})`);
  });
}

setupJobs().catch((err) => {
  // Log fejlen men lad serveren fortsætte — job-systemet er ikke kritisk for web-UI'et.
  // I preview/CI-miljøer uden databaseadgang er dette forventet opførsel.
  console.warn('[jobs] Job-system kunne ikke starte (non-fatal):', (err as Error)?.message ?? err);
});
