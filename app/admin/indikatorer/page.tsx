import { getAllTemplates } from '@/db/queries/indikator-template';
import { IndikatorTemplateForm } from '@/components/indikator-template-form';
import { toggleTemplateAktivAction } from './actions';

export const metadata = { title: 'Indikatorer — Admin' };

const KILDE_LABEL: Record<string, string> = {
  klimaregnskab: 'Klimaregnskabet.dk',
  energidataservice: 'Energi Data Service',
  dst: 'Danmarks Statistik',
};

export default async function AdminIndikatorer() {
  const templates = await getAllTemplates();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Indikatorkatalog</h1>
      </div>

      <div className="mb-10 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Titel</th>
              <th className="px-4 py-3 font-medium">Kilde</th>
              <th className="px-4 py-3 font-medium">Enhed</th>
              <th className="px-4 py-3 font-medium">CCTF</th>
              <th className="px-4 py-3 font-medium">Aktiv</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-gray-900">{t.titel}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    {t.kilde ? (KILDE_LABEL[t.kilde] ?? t.kilde) : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{t.enhed}</td>
                <td className="px-4 py-3 text-gray-500">
                  {t.cctfKriterier.length > 0 ? t.cctfKriterier.join(', ') : '—'}
                </td>
                <td className="px-4 py-3">
                  <form action={toggleTemplateAktivAction.bind(null, t.id, !t.aktiv)}>
                    <button type="submit"
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.aktiv ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.aktiv ? 'Aktiv' : 'Inaktiv'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {templates.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-400">Ingen indikatorer endnu.</p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Tilføj indikator</h2>
        <IndikatorTemplateForm />
      </div>
    </div>
  );
}
