// AI-stub — kaster NotImplementedError indtil Claude-integration bygges (Fase 3b).
// Erstat kun funktionskroppen — ingen anden kode skal ændres.
import type { KriterieBesvarelse } from './selvevaluering-types';

export class SelvevalueringAiNotImplemented extends Error {
  constructor() {
    super('AI-generering ikke implementeret endnu — aktiveres i Fase 3b');
    this.name = 'SelvevalueringAiNotImplemented';
  }
}

export async function genererKriterieBesvarelse(
  _kommuneId: string,
  _kriterieNr: number,
): Promise<Pick<KriterieBesvarelse, 'hvadStaarPaa' | 'hvadOpdateres' | 'selvvurdering'>> {
  throw new SelvevalueringAiNotImplemented();
}
