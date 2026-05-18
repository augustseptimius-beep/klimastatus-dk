'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Tiltag = {
  id: string;
  titel: string;
  status: 'planned' | 'in_progress' | 'completed' | 'discontinued';
  type: 'reduction' | 'adaptation' | 'both';
  indsatsOmraadeId: string;
  prioriteretTiltag: boolean;
  forventetEffektCo2Ton: number | null;
  tidsrammeStart: string | null;
  tidsrammeSlut: string | null;
  ansvarligOrganisation: string | null;
};

type Indsats = { id: string; navn: string };

const STATUS_LABEL: Record<string, string> = {
  planned: 'Planlagt',
  in_progress: 'Igangværende',
  completed: 'Gennemført',
  discontinued: 'Udgået',
};
const STATUS_BADGE: Record<string, string> = {
  planned: 'ks-badge-neutral',
  in_progress: 'ks-badge-info',
  completed: 'ks-badge-success',
  discontinued: 'ks-badge-error',
};
const TYPE_LABEL: Record<string, string> = {
  reduction: 'Reduktion',
  adaptation: 'Tilpasning',
  both: 'Begge',
};
const TYPE_BADGE: Record<string, string> = {
  reduction: 'ks-badge-success',
  adaptation: 'ks-badge-info',
  both: 'ks-badge-warn',
};

type SortKey = 'titel' | 'indsats' | 'type' | 'status' | 'co2';

export function TiltagTable({ tiltag, indsatser }: { tiltag: Tiltag[]; indsatser: Indsats[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [indsatsFilter, setIndsatsFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('titel');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const indsatsMap = useMemo(
    () => Object.fromEntries(indsatser.map((io) => [io.id, io.navn])),
    [indsatser],
  );

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { planned: 0, in_progress: 0, completed: 0, discontinued: 0 };
    for (const t of tiltag) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [tiltag]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = tiltag.filter((t) => {
      if (q && !t.titel.toLowerCase().includes(q) && !(indsatsMap[t.indsatsOmraadeId] ?? '').toLowerCase().includes(q) && !(t.ansvarligOrganisation ?? '').toLowerCase().includes(q)) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (typeFilter && t.type !== typeFilter) return false;
      if (indsatsFilter && t.indsatsOmraadeId !== indsatsFilter) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === 'titel') { av = a.titel; bv = b.titel; }
      else if (sortKey === 'indsats') { av = indsatsMap[a.indsatsOmraadeId] ?? ''; bv = indsatsMap[b.indsatsOmraadeId] ?? ''; }
      else if (sortKey === 'type') { av = a.type; bv = b.type; }
      else if (sortKey === 'status') { av = a.status; bv = b.status; }
      else { av = a.forventetEffektCo2Ton ?? -1; bv = b.forventetEffektCo2Ton ?? -1; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [tiltag, search, statusFilter, typeFilter, indsatsFilter, sortKey, sortDir, indsatsMap]);

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      else { setSortDir('asc'); }
      return key;
    });
  }, []);

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setIndsatsFilter('');
  };
  const hasFilters = search || statusFilter || typeFilter || indsatsFilter;

  return (
    <>
      {/* Status summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        borderTop: '1.5px solid var(--ink-900)',
        marginBottom: 32,
      }}>
        {(['planned', 'in_progress', 'completed', 'discontinued'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            style={{
              padding: '20px 20px 20px 0',
              borderRight: s === 'discontinued' ? 'none' : '1px solid var(--sand-300)',
              borderBottom: 'none',
              background: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              outline: 'none',
              paddingLeft: s === 'planned' ? 0 : 20,
            }}
          >
            <div style={{ fontSize: 12, color: statusFilter === s ? 'var(--forest-900)' : 'var(--ink-500)', fontWeight: 600, marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {STATUS_LABEL[s]}
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.025em', color: statusFilter === s ? 'var(--forest-900)' : 'var(--ink-900)' }}>
              {statusCounts[s]}
            </div>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <input
          className="ks-input"
          style={{ width: 220, flex: '0 0 auto' }}
          placeholder="Søg i handlinger…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="ks-select"
          style={{ width: 200, flex: '0 0 auto' }}
          value={indsatsFilter}
          onChange={(e) => setIndsatsFilter(e.target.value)}
        >
          <option value="">Alle indsatsområder</option>
          {indsatser.map((io) => (
            <option key={io.id} value={io.id}>{io.navn}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 4 }}>
          {(['', 'reduction', 'adaptation', 'both'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="ks-btn"
              style={{
                padding: '8px 12px',
                fontSize: 13,
                background: typeFilter === t ? 'var(--ink-900)' : 'white',
                color: typeFilter === t ? 'white' : 'var(--ink-700)',
                border: '1px solid',
                borderColor: typeFilter === t ? 'var(--ink-900)' : 'var(--sand-300)',
              }}
            >
              {t === '' ? 'Alle typer' : TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="ks-btn ks-btn-ghost" style={{ fontSize: 13, color: 'var(--ink-500)' }}>
            Ryd filtre
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-500)', fontVariantNumeric: 'tabular-nums' }}>
          {filtered.length === tiltag.length
            ? `${tiltag.length} handlinger`
            : `${filtered.length} af ${tiltag.length}`}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="ks-empty">
          <h3>{tiltag.length === 0 ? 'Ingen handlinger endnu' : 'Ingen resultater'}</h3>
          <p>
            {tiltag.length === 0
              ? 'Opret et indsatsområde først, derefter kan du tilføje handlinger.'
              : 'Prøv at ændre søgning eller filtre.'}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="ks-btn ks-btn-secondary">Ryd filtre</button>
          )}
        </div>
      ) : (
        <table className="ks-table">
          <thead>
            <tr>
              <Th label="Handling" sortKey="titel" current={sortKey} dir={sortDir} onSort={toggleSort} style={{ width: '35%' }} />
              <Th label="Indsatsområde" sortKey="indsats" current={sortKey} dir={sortDir} onSort={toggleSort} />
              <Th label="Type" sortKey="type" current={sortKey} dir={sortDir} onSort={toggleSort} />
              <Th label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={toggleSort} />
              <Th label="CO₂ ton" sortKey="co2" current={sortKey} dir={sortDir} onSort={toggleSort} style={{ textAlign: 'right' }} />
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr
                key={t.id}
                className="clickable"
                onClick={() => router.push(`/tiltag/${t.id}/rediger`)}
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {t.prioriteretTiltag && (
                      <span title="Prioriteret tiltag" style={{ color: 'var(--forest-900)', fontSize: 14, lineHeight: 1 }}>★</span>
                    )}
                    <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{t.titel}</span>
                  </div>
                  {t.tidsrammeStart && (
                    <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 3 }}>
                      {formatDate(t.tidsrammeStart)}{t.tidsrammeSlut ? ` – ${formatDate(t.tidsrammeSlut)}` : ''}
                    </div>
                  )}
                </td>
                <td style={{ color: 'var(--ink-500)', fontSize: 13 }}>
                  {indsatsMap[t.indsatsOmraadeId] ?? '—'}
                </td>
                <td>
                  <span className={`ks-badge ${TYPE_BADGE[t.type]}`}>{TYPE_LABEL[t.type]}</span>
                </td>
                <td>
                  <span className={`ks-badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                </td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: t.forventetEffektCo2Ton ? 'var(--ink-900)' : 'var(--ink-400)' }}>
                  {t.forventetEffektCo2Ton != null ? t.forventetEffektCo2Ton.toLocaleString('da-DK') : '—'}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <Link href={`/tiltag/${t.id}/rediger`} className="ks-btn ks-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }}>
                    Rediger
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Th({
  label, sortKey, current, dir, onSort, style,
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: 'asc' | 'desc';
  onSort: (k: SortKey) => void; style?: React.CSSProperties;
}) {
  const active = current === sortKey;
  return (
    <th
      style={{ cursor: 'pointer', userSelect: 'none', ...style }}
      onClick={() => onSort(sortKey)}
    >
      <span style={{ color: active ? 'var(--ink-900)' : undefined }}>
        {label}{active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
      </span>
    </th>
  );
}

function formatDate(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString('da-DK', { year: 'numeric', month: 'short' });
}
