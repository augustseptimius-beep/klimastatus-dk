'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import type { WidgetProps } from '../types';
import type { Co2eUdviklingData } from './load';

export function Component({ data, config }: WidgetProps<Co2eUdviklingData>) {
  const titel = typeof config.titel === 'string' ? config.titel : 'Udvikling i CO₂e-udledning';
  if (data.punkter.length === 0) {
    return (
      <section>
        <SektionsTitel titel={titel} />
        <div style={{ fontSize: 15, color: '#9A9A8E', padding: '24px 0' }}>Ingen data endnu.</div>
      </section>
    );
  }
  return (
    <section>
      <SektionsTitel titel={titel} />
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data.punkter} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="#E0D8C7" strokeDasharray="0" vertical={false} />
            <XAxis dataKey="aar" tick={{ fontSize: 12, fill: '#6B6B63' }} axisLine={{ stroke: '#D9D2C2' }} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#6B6B63' }} axisLine={false} tickLine={false} width={56}
              tickFormatter={(v) => Number(v).toLocaleString('da-DK')} />
            <Tooltip
              formatter={(v) => [`${Number(v).toLocaleString('da-DK')} ${data.enhedLabel}`, 'Udledning']}
              labelStyle={{ color: '#1A1A18' }} contentStyle={{ fontSize: 13, borderRadius: 6, border: '1px solid #D9D2C2' }} />
            {data.maalVaerdi !== null && (
              <ReferenceLine y={data.maalVaerdi} stroke="#1E6B3A" strokeDasharray="6 4"
                label={{ value: `Mål ${data.maalAar ?? ''}`, position: 'insideTopRight', fontSize: 11, fill: '#1E6B3A' }} />
            )}
            <Line type="monotone" dataKey="vaerdi" stroke="#8B2E2E" strokeWidth={2.5} dot={{ r: 3, fill: '#8B2E2E' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function SektionsTitel({ titel }: { titel: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1E6B3A', marginBottom: 16 }}>
      {titel}
    </div>
  );
}
