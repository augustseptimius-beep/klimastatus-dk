'use client';

import { useState, useTransition } from 'react';
import { updatePublicConfig } from './public-config-actions';
import type { ActiveKommuneIndikatorOption } from '@/db/queries/public-dashboard';

type Props = {
  subdomain: string;
  initialEnabled: boolean;
  initialStaleDays: number;
  initialHighlights: string[];
  indikatorer: ActiveKommuneIndikatorOption[];
};

export function PublicConfigForm({
  subdomain,
  initialEnabled,
  initialStaleDays,
  initialHighlights,
  indikatorer,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [staleDays, setStaleDays] = useState(initialStaleDays);
  const [highlights, setHighlights] = useState<string[]>(initialHighlights);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isPending, startTransition] = useTransition();

  function toggleHighlight(id: string) {
    setHighlights((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : prev.length < 5 ? [...prev, id] : prev,
    );
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updatePublicConfig({ publicEnabled: enabled, publicStaleDays: staleDays, publicHighlights: highlights });
      setStatus(result.ok ? 'saved' : 'error');
      if (result.ok) setTimeout(() => setStatus('idle'), 2000);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Offentlig side aktiv</div>
          <div style={{ fontSize: 13, color: '#6B6B63' }}>
            Tilgængelig på{' '}
            <a
              href={`/${subdomain}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1E6B3A' }}
            >
              klimastatus.dk/{subdomain}
            </a>
          </div>
        </div>
      </label>

      <div>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
          Stagnationsgrænse (dage uden rapport)
        </label>
        <input
          type="number"
          min={7}
          max={365}
          value={staleDays}
          onChange={(e) => setStaleDays(Number(e.target.value))}
          style={{
            width: 100, padding: '6px 10px', fontSize: 14,
            border: '1px solid #D9D2C2', borderRadius: 4,
          }}
        />
        <div style={{ fontSize: 12, color: '#9A9A8E', marginTop: 4 }}>
          Tiltag uden tovholder-rapport i dette antal dage markeres som &quot;kræver opmærksomhed&quot;.
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          Fremhævede nøgletal (max 5)
        </div>
        <div style={{ fontSize: 12, color: '#9A9A8E', marginBottom: 8 }}>
          {highlights.length}/5 valgt
        </div>
        {indikatorer.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9A9A8E' }}>Ingen aktive indikatorer endnu.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {indikatorer.map((ki) => (
              <label key={ki.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={highlights.includes(ki.id)}
                  onChange={() => toggleHighlight(ki.id)}
                  disabled={!highlights.includes(ki.id) && highlights.length >= 5}
                />
                {ki.label}
                <span style={{ fontSize: 12, color: '#9A9A8E' }}>({ki.enhed})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={isPending}
          style={{
            padding: '8px 18px', fontSize: 14, fontWeight: 600,
            background: '#1E6B3A', color: '#FFFFFF',
            border: 'none', borderRadius: 4, cursor: isPending ? 'wait' : 'pointer',
          }}
        >
          {isPending ? 'Gemmer…' : 'Gem indstillinger'}
        </button>
        {status === 'saved' && <span style={{ fontSize: 13, color: '#1E6B3A' }}>Gemt ✓</span>}
        {status === 'error' && <span style={{ fontSize: 13, color: '#8B2E2E' }}>Fejl — prøv igen</span>}
      </div>
    </div>
  );
}
