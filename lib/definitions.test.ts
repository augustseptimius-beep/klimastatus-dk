import { describe, it, expect } from 'vitest';
import type { SessionPayload } from './definitions';

describe('SessionPayload type', () => {
  it('accepts valid payload', () => {
    const payload: SessionPayload = {
      userId: 'abc-123',
      kommuneId: 'def-456',
      kommuneSlug: null,
      role: 'koordinator',
      navn: 'Test User',
      expiresAt: new Date(),
    };
    expect(payload.role).toBe('koordinator');
  });

  it('accepts null kommuneId for admin', () => {
    const payload: SessionPayload = {
      userId: 'abc-123',
      kommuneId: null,
      kommuneSlug: null,
      role: 'admin',
      navn: 'Admin',
      expiresAt: new Date(),
    };
    expect(payload.kommuneId).toBeNull();
  });
});
