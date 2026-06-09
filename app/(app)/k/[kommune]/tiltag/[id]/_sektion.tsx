'use client';
import { useState, type ReactNode } from 'react';

type Props = {
  titel: string;
  resume?: string;
  aabenFraStart?: boolean;
  children: ReactNode;
};

export function Sektion({ titel, resume, aabenFraStart = false, children }: Props) {
  const [aaben, setAaben] = useState(aabenFraStart);
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setAaben((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={aaben}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span className={`transition-transform ${aaben ? 'rotate-90' : ''}`}>›</span>
          {titel}
        </span>
        {resume && <span className="text-xs text-gray-500">{resume}</span>}
      </button>
      {aaben && <div className="border-t border-gray-100 px-4 py-3">{children}</div>}
    </section>
  );
}
