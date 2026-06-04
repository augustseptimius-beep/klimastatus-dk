import { describe, it, expect } from 'vitest';
import { spanForBredde } from './widget-grid';

describe('spanForBredde', () => {
  it('mapper bredde til grid-column span', () => {
    expect(spanForBredde(1)).toBe('span 1');
    expect(spanForBredde(2)).toBe('span 2');
    expect(spanForBredde(4)).toBe('span 4');
  });
});
