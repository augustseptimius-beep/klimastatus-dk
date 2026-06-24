'use client';
import { useEffect, useState } from 'react';
import { KommuneNav } from './kommune-nav';

type Props = {
  slug: string;
  kommuneNavn: string;
  isAdmin: boolean;
};

/**
 * Mobil-navigation: hamburger-knap i topbaren + off-canvas drawer.
 * Skjules over mobil-breakpoint (se app.css), hvor desktop-sidebaren
 * tager over. Deler menupunkter med sidebaren via <KommuneNav>.
 */
export function MobileNav(props: Props) {
  const [open, setOpen] = useState(false);

  // Hvert navigationslink kalder onNavigate -> setOpen(false), så drawer
  // lukker ved sidevalg. Lås desuden baggrundsscroll og luk på Escape,
  // mens drawer er åben.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="ks-hamburger"
        aria-label="Åbn menu"
        aria-expanded={open}
        aria-controls="ks-mobile-drawer"
        onClick={() => setOpen(true)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div
        className={`ks-drawer-overlay${open ? ' open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="ks-mobile-drawer"
        className={`ks-drawer${open ? ' open' : ''}`}
        inert={!open}
        aria-label="Navigation"
      >
        <div className="ks-drawer-head">
          <span className="logo">
            Klimastatus<span className="period">.</span>dk
          </span>
          <button
            type="button"
            className="ks-drawer-close"
            aria-label="Luk menu"
            onClick={() => setOpen(false)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </div>
        <KommuneNav {...props} onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
