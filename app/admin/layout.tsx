import { verifySession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { logout } from '@/app/actions/auth';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session || session.role !== 'admin') redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-gray-900">Klimastatus Admin</span>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <Link href="/admin/kommuner" className="text-gray-600 hover:text-gray-900">Kommuner</Link>
              <Link href="/admin/indikatorer" className="text-gray-600 hover:text-gray-900">Indikatorer</Link>
              <Link href="/admin/katalog" className="text-gray-600 hover:text-gray-900">Kataloger</Link>
            </nav>
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
              Log ud
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
