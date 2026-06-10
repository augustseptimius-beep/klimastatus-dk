'use client';
import type { IndhentningsKadence } from '@/lib/merl/forespoergsel-status';

const VALG: { value: IndhentningsKadence; label: string }[] = [
  { value: 'maanedlig', label: 'Månedlig' },
  { value: 'kvartalsvis', label: 'Kvartalsvis' },
  { value: 'halvaarlig', label: 'Halvårlig' },
  { value: 'aarlig', label: 'Årlig' },
  { value: 'manuel', label: 'Manuel (slukket)' },
];

export function KadenceForm({
  initial,
  action,
}: {
  initial: IndhentningsKadence;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="flex items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Standard-kadence</label>
        <select
          name="indhentningsKadence"
          defaultValue={initial}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          {VALG.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="ks-btn ks-btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}>
        Gem
      </button>
    </form>
  );
}
