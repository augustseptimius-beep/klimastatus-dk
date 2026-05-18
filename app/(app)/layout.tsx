import { verifySession } from '@/lib/dal';
import { getKommuneById } from '@/db/queries';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import './app.css';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session || session.role !== 'koordinator') redirect('/login');

  const kommune = session.kommuneId
    ? await getKommuneById(session.kommuneId)
    : null;

  if (!kommune) redirect('/login');

  return (
    <div className="ks-app">
      <header className="ks-topbar">
        <div className="ks-topbar-left">
          <a className="logo" href="/dashboard" aria-label="Klimastatus.dk">
            <span>Klimastatus<span className="period">.</span>dk</span>
          </a>
          <span className="kommune-name">{kommune.navn}</span>
        </div>
      </header>
      <AppSidebar kommuneNavn={kommune.navn} />
      <main className="ks-main">
        {children}
      </main>
    </div>
  );
}
