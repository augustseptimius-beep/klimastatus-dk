import { getStandardtiltagKatalog } from '@/db/queries/standardtiltag';
import { getAllTemplates } from '@/db/queries/indikator-template';

export const metadata = { title: 'Nationale kataloger — Admin' };

const KATEGORI_LABEL: Record<string, string> = {
  energi: 'Energi',
  transport: 'Transport',
  landbrug_areal: 'Landbrug & arealer',
  scope3: 'Forbrug (scope 3)',
};

export default async function KatalogPage() {
  const tiltag = await getStandardtiltagKatalog();
  const templates = await getAllTemplates();
  const benchmarks = templates.filter((t) => t.nationalMaalvaerdi != null);

  const kategorier = ['energi', 'transport', 'landbrug_areal', 'scope3'] as const;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Nationale kataloger</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kurateret udgangspunkt fra CO₂-analysen (DK2020). Foreslås ved onboarding af nye kommuner.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Standardtiltag ({tiltag.length})
        </h2>
        <div className="space-y-6">
          {kategorier.map((kat) => {
            const rows = tiltag.filter((t) => t.kategori === kat);
            if (rows.length === 0) return null;
            return (
              <div key={kat} className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
                  {KATEGORI_LABEL[kat]} ({rows.length})
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((t) => (
                      <tr key={t.id} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-2 text-gray-900">{t.titel}</td>
                        <td className="px-4 py-2 text-right text-gray-500">
                          {t.udbredelsesProcent}% af kommunerne
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Omstillingsindikatorer ({benchmarks.length})
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Indikator</th>
                <th className="px-4 py-3 font-medium">Enhed</th>
                <th className="px-4 py-3 font-medium">National målværdi</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-900">{t.titel}</td>
                  <td className="px-4 py-3 text-gray-600">{t.enhed}</td>
                  <td className="px-4 py-3 text-gray-600">{t.nationalMaalvaerdiNote ?? t.nationalMaalvaerdi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
