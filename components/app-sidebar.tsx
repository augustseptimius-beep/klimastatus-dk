'use client';
import { KommuneNav } from './kommune-nav';

type Props = {
  slug: string;
  kommuneNavn: string;
  isAdmin: boolean;
};

/** Fast sidebar på desktop. Skjules under mobil-breakpoint (se app.css). */
export function AppSidebar(props: Props) {
  return (
    <aside className="ks-sidebar">
      <KommuneNav {...props} />
    </aside>
  );
}
