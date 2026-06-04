import { getAllKommuner } from '@/db/queries';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { switchKommuneAction } from './actions';

export const metadata = { title: 'Kommuner — Admin' };

export default async function KommunerPage() {
  const kommuner = await getAllKommuner();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Kommuner</h1>
        <Link href="/admin/kommuner/ny">
          <Button>Opret kommune</Button>
        </Link>
      </div>

      {kommuner.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-500">
          Ingen kommuner endnu. Opret den første.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Navn</th>
                <th className="px-4 py-3 font-medium">Kommunekode</th>
                <th className="px-4 py-3 font-medium">Subdomæne</th>
                <th className="px-4 py-3 font-medium">Oprettet</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {kommuner.map((k) => (
                <tr key={k.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{k.navn}</td>
                  <td className="px-4 py-3 text-gray-600">{k.kommunekode}</td>
                  <td className="px-4 py-3 text-gray-600">{k.subdomain}.klimastatus.dk</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(k.createdAt).toLocaleDateString('da-DK')}
                  </td>
                  <td className="px-4 py-3">
                    <form action={switchKommuneAction.bind(null, k.id)}>
                      <Button type="submit" variant="outline" size="sm">Åbn dashboard</Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
