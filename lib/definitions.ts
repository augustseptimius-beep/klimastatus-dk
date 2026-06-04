export type SessionPayload = {
  userId: string;
  kommuneId: string | null;
  kommuneSlug: string | null;
  role: 'admin' | 'koordinator';
  navn: string;
  expiresAt: Date;
};

export type FormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;
