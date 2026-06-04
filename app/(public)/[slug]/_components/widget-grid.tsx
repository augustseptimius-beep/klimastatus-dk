import type { ReactNode } from 'react';
import type { WidgetBredde } from '@/lib/widgets/types';

export function spanForBredde(bredde: WidgetBredde): string {
  return `span ${bredde}`;
}

export type GridItem = { id: string; bredde: WidgetBredde; node: ReactNode };

export function WidgetGrid({ items }: { items: GridItem[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 32,
        alignItems: 'start',
      }}
      className="widget-grid"
    >
      {items.map((it) => (
        <div key={it.id} style={{ gridColumn: spanForBredde(it.bredde), minWidth: 0 }} className="widget-cell">
          {it.node}
        </div>
      ))}
      <style>{`
        @media (max-width: 768px) {
          .widget-grid { grid-template-columns: 1fr !important; }
          .widget-cell { grid-column: span 1 !important; }
        }
      `}</style>
    </div>
  );
}
