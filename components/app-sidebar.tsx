'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions/auth';

const mainNav = [
  { href: '/dashboard',   label: 'Dashboard' },
  { href: '/indsatser',   label: 'Indsatsområder' },
  { href: '/tiltag',      label: 'Handlingsoverblik' },
  { href: '/tovholdere',  label: 'Tovholdere' },
  { href: '/data',        label: 'Datastyring' },
  { href: '/laering',     label: 'Læring' },
];

const secondaryNav = [
  { href: '/selvevaluering', label: 'Selvevaluering' },
  { href: '/indstillinger',  label: 'Indstillinger' },
];

export function AppSidebar({ kommuneNavn }: { kommuneNavn: string }) {
  const pathname = usePathname();

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
            className={`ks-nav-item${pathname === href ? ' active' : ''}`}
          >
            {label}
          </Link>
        ))}
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
