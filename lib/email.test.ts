import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.resetModules();
  mockFetch.mockResolvedValue({ ok: true });
  process.env.BREVO_API_KEY = 'test-key';
  process.env.BREVO_FROM_EMAIL = 'test@klimastatus.dk';
});

describe('sendMagicLinkEmail', () => {
  it('calls Brevo API with correct payload', async () => {
    const { sendMagicLinkEmail } = await import('./email');
    await sendMagicLinkEmail('tovholder@k.dk', 'https://k.dk/rapport/abc', 'Thisted');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws when Brevo returns error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400, text: async () => 'Bad Request' });
    const { sendMagicLinkEmail } = await import('./email');
    await expect(sendMagicLinkEmail('a@b.dk', 'url', 'K')).rejects.toThrow('Brevo error 400');
  });
});

describe('sendRykkerEmail', () => {
  it('calls Brevo API', async () => {
    const { sendRykkerEmail } = await import('./email');
    await sendRykkerEmail('tovholder@k.dk', 'https://k.dk/rapport/abc', 'Thisted');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
