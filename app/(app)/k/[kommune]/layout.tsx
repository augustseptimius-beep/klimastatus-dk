import Link from 'next/link';
import { requireKommuneContext } from '@/lib/kommune-context';
import { AppSidebar } from '@/components/app-sidebar';
import { MobileNav } from '@/components/mobile-nav';
import '../../app.css';

type Props = {
  children: React.ReactNode;
  params: Promise<{ kommune: string }>;
};

export default async function KommuneLayout({ children, params }: Props) {
  const { kommune: slug } = await params;
  const { session, kommune } = await requireKommuneContext(slug);

  const accentColor = kommune.primaryColor ?? '#1E6B3A';

  return (
    <div className="ks-app">
      <header className="ks-topbar" style={{ borderBottom: `3px solid ${accentColor}` }}>
        <div className="ks-topbar-left">
          <MobileNav slug={slug} kommuneNavn={kommune.navn} isAdmin={session.role === 'admin'} />
          <Link className="logo" href={`/k/${slug}/dashboard`} aria-label="Klimastatus.dk">
            <span>Klimastatus<span className="period">.</span>dk</span>
          </Link>
          <span className="kommune-name" style={{ color: accentColor }}>{kommune.navn}</span>
          {session.role === 'admin' && (
            <span className="ks-admin-badge" style={{
              marginLeft: 10,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-400, #9A9A8E)',
            }}>
              Forvalter som administrator
            </span>
          )}
        </div>
        <div className="ks-topbar-right" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, paddingRight: '1rem' }}>
          {kommune.publicEnabled && (
            <Link
              href={`/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ks-public-link"
              style={{ fontSize: '0.8125rem', color: 'var(--ink-400, #9A9A8E)', textDecoration: 'none' }}
            >
              Se offentlig side ↗
            </Link>
          )}
        </div>
      </header>
      <AppSidebar slug={slug} kommuneNavn={kommune.navn} isAdmin={session.role === 'admin'} />
      <main className="ks-main">
        {children}
      </main>
    </div>
  );
}
