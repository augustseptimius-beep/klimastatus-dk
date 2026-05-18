import { verifySession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { logout } from '@/app/actions/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session || session.role !== 'admin') redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-semibold text-gray-900">Klimastatus Admin</span>
          <form action={logout}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
              Log ud
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
