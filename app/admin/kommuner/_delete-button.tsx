'use client';
import { useActionState } from 'react';
import { deleteKommuneAction } from './actions';

/**
 * Sletning kræver at kommunens navn skrives præcist. Navnet verificeres
 * SERVER-side i deleteKommuneAction — prompten her er kun UI.
 */
export function DeleteKommuneButton({ id, navn }: { id: string; navn: string }) {
  const [state, formAction] = useActionState(deleteKommuneAction, undefined);

  return (
    <form
      action={formAction}
      onSubmit={e => {
        const svar = window.prompt(
          `Slet "${navn}" og AL tilhørende data (tiltag, målinger, rapporter, brugere)?\n\n` +
          `Dette kan ikke fortrydes. Skriv kommunens navn for at bekræfte:`,
        );
        if (svar === null) {
          e.preventDefault();
          return;
        }
        const input = e.currentTarget.elements.namedItem('bekraeftNavn') as HTMLInputElement;
        input.value = svar;
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="bekraeftNavn" defaultValue="" />
      <button
        type="submit"
        style={{
          padding: '4px 10px',
          borderRadius: 4,
          border: '1px solid #fca5a5',
          background: '#fef2f2',
          color: '#b91c1c',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Slet
      </button>
      {state?.message && (
        <p style={{ marginTop: 4, fontSize: 12, color: '#b91c1c', maxWidth: 220 }}>{state.message}</p>
      )}
    </form>
  );
}
