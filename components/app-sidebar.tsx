'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions/auth';

type Props = {
  slug: string;
  kommuneNavn: string;
  isAdmin: boolean;
};

export function AppSidebar({ slug, kommuneNavn, isAdmin }: Props) {
  const pathname = usePathname();
  const base = `/k/${slug}`;

  const mainNav = [
    { href: `${base}/dashboard`,   label: 'Dashboard' },
    { href: `${base}/indsatser`,   label: 'Indsatsområder' },
    { href: `${base}/tiltag`,      label: 'Handlingsoverblik' },
    { href: `${base}/tovholdere`,  label: 'Tovholdere' },
    { href: `${base}/data`,        label: 'Datastyring' },
    { href: `${base}/laering`,     label: 'Læring' },
  ];

  const secondaryNav = [
    { href: `${base}/indstillinger/dashboard`, label: 'Offentlig side' },
    { href: `${base}/indstillinger`,  label: 'Indstillinger' },
  ];

  return (
    <aside className="ks-sidebar">
      <div className="ks-nav-section">
        <div className="heading">{kommuneNavn}</div>
        {mainNav.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`ks-nav-item${pathname === href || pathname.startsWith(href + '/') ? ' active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="ks-nav-section" style={{ marginTop: 'auto' }}>
        <div className="heading">System</div>
        {secondaryNav.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`ks-nav-item${pathname === href || pathname.startsWith(href + '/') ? ' active' : ''}`}
          >
            {label}
          </Link>
        ))}
        {isAdmin && (
          <Link href="/admin/kommuner" className="ks-nav-item" style={{ color: 'var(--ink-400, #9A9A8E)', fontSize: 13 }}>
            ← Alle kommuner
          </Link>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="ks-nav-item"
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--ink-500, #6B6B63)', fontSize: 14 }}
          >
            Log ud
          </button>
        </form>
      </div>
    </aside>
  );
}
