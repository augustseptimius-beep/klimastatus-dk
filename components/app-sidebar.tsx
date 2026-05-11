import Link from 'next/link';
import { logout } from '@/app/actions/auth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tiltag', label: 'Handlingsoverblik' },
  { href: '/data', label: 'Datastyring' },
  { href: '/scenarieberegner', label: 'Scenarieberegner' },
  { href: '/selvevaluering', label: 'Selvevaluering' },
  { href: '/indstillinger', label: 'Indstillinger' },
];

export function AppSidebar({ kommuneNavn }: { kommuneNavn: string }) {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Klimastatus.dk
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{kommuneNavn}</p>
      </div>

      <nav className="flex-1 px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-100 px-4 py-3">
        <form action={logout}>
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
            Log ud
          </button>
        </form>
      </div>
    </aside>
  );
}
