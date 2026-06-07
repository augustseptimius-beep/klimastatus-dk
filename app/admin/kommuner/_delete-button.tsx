'use client';
import { deleteKommuneAction } from './actions';

export function DeleteKommuneButton({ id, navn }: { id: string; navn: string }) {
  return (
    <form
      action={deleteKommuneAction}
      onSubmit={e => {
        if (!confirm(`Slet "${navn}" og al tilhørende data? Dette kan ikke fortrydes.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
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
    </form>
  );
}
