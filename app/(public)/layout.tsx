import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F0E8',
      fontFamily: 'var(--font-rubik, system-ui, sans-serif)',
      color: '#1A1A18',
    }}>
      <header style={{
        borderBottom: '1px solid #D9D2C2',
        background: '#FFFFFF',
      }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto',
          padding: '0 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 56,
        }}>
          <Link href="/" style={{
            fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em',
            textDecoration: 'none', color: '#1A1A18',
          }}>
            Klimastatus
            <span style={{ fontFamily: 'Georgia, serif', color: '#1E6B3A', fontWeight: 700 }}>.</span>
            dk
          </Link>
          <span style={{ fontSize: 12, color: '#9A9A8E' }}>Offentlig klimastatus</span>
        </div>
      </header>
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 32px 96px' }}>
        {children}
      </main>
    </div>
  );
}
