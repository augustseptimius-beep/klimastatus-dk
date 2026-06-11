'use client';
import type { CctfKriterieResult } from '@/lib/cctf/coverage-engine';
import Link from 'next/link';

type Props = { daekning: CctfKriterieResult[]; slug: string };

export function CctfDashboardWidget({ daekning, slug }: Props) {
  if (daekning.length === 0) return null;

  const dokumenteret = daekning.filter(d => d.status === 'dokumenteret').length;
  const manglende = daekning.filter(d => d.status === 'manglende').length;
  const pct = Math.round((dokumenteret / 16) * 100);

  return (
    <div className="ks-stat" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
      <div className="label">
        <Link href={`/k/${slug}/selvevaluering`} style={{ color: 'inherit', textDecoration: 'none' }}>
          CCTF-dækning →
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
        <div style={{
          flex: 1,
          height: 8,
          background: 'var(--sand-200, #EAE4D6)',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: '#1E6B3A',
            borderRadius: 4,
          }} />
        </div>
        <em style={{ fontSize: 22, minWidth: 48, textAlign: 'right' }}>{pct}%</em>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-500)' }}>
        <span style={{ color: '#1E6B3A', fontWeight: 600 }}>{dokumenteret} med dokumentation</span>
        {manglende > 0 && <span style={{ color: '#c62828' }}>{manglende} uden</span>}
      </div>
    </div>
  );
}
