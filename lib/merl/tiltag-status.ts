export type TiltagStatus = 'planned' | 'in_progress' | 'completed' | 'discontinued';

export type StatusVisning = {
  label: string;
  /** Tailwind-klasser til chip-baggrund + tekst. */
  farve: string;
  /** Afledt overlay — tidsramme udløbet og ikke afsluttet. */
  forsinket: boolean;
};

const LABELS: Record<TiltagStatus, string> = {
  planned: 'Ikke startet',
  in_progress: 'I gang',
  completed: 'Gennemført',
  discontinued: 'Udgået',
};

const FARVER: Record<TiltagStatus, string> = {
  planned: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  discontinued: 'bg-gray-200 text-gray-500',
};

/**
 * Afgør chip-visning for et tiltags implementeringsstatus.
 * @param tidsrammeSlut ISO yyyy-mm-dd eller null
 * @param iDag ISO yyyy-mm-dd (injiceres for testbarhed)
 */
export function tiltagStatusVisning(
  status: TiltagStatus,
  tidsrammeSlut: string | null,
  iDag: string,
): StatusVisning {
  const afsluttet = status === 'completed' || status === 'discontinued';
  const forsinket = !afsluttet && tidsrammeSlut !== null && tidsrammeSlut < iDag;
  return { label: LABELS[status], farve: FARVER[status], forsinket };
}
