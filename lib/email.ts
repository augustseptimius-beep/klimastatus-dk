const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not set');

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_FROM_EMAIL ?? 'noreply@klimastatus.dk',
        name: 'Klimastatus',
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo error ${res.status}: ${text}`);
  }
}

export async function sendMagicLinkEmail(to: string, magicUrl: string, kommuneNavn: string) {
  await sendEmail(
    to,
    `Din tovholder-rapport: ${kommuneNavn} Klimastatus`,
    `<p>Hej,</p>
     <p>Din klimakoordinator i ${kommuneNavn} Kommune ønsker din status på dine tiltag.</p>
     <p><a href="${magicUrl}" style="background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Udfyld status</a></p>
     <p>Linket er gyldigt i 14 dage.</p>`,
  );
}

export async function sendRykkerEmail(to: string, magicUrl: string, kommuneNavn: string) {
  await sendEmail(
    to,
    `Påmindelse: Tovholder-rapport ${kommuneNavn} Klimastatus`,
    `<p>Hej,</p>
     <p>Vi mangler stadig din status for dine tiltag i ${kommuneNavn} Klimastatus.</p>
     <p><a href="${magicUrl}" style="background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Udfyld status nu</a></p>`,
  );
}
