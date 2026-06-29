/**
 * POST /api/subscribe
 *
 * Required environment variable (set in Vercel → Project → Settings →
 * Environment Variables, NOT committed to git):
 *   MAILERLITE_API_KEY              — the Bearer token from MailerLite's
 *                                      Integrations → MailerLite API page
 *
 * Optional:
 *   MAILERLITE_GROUP_ID_LANDING_PAGE 
 */

const MAILERLITE_URL = 'https://connect.mailerlite.com/api/subscribers';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAILERLITE_GROUP_ID_LANDING_PAGE = process.env.MAILERLITE_GROUP_ID_LANDING_PAGE;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { name, email } = req.body ?? {};

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    console.error('MAILERLITE_API_KEY is not set.');
    return res.status(500).json({ error: 'Signup is temporarily unavailable. Please try again later.' });
  }

  const payload = {
    email: email.trim(),
    fields: { name: name.trim() },
  };
  if (MAILERLITE_GROUP_ID_LANDING_PAGE) {
    payload.groups = [MAILERLITE_GROUP_ID_LANDING_PAGE];
  }

  try {
    const mlResponse = await fetch(MAILERLITE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (mlResponse.ok) {
      return res.status(200).json({ success: true });
    }

    const mlBody = await mlResponse.json().catch(() => null);
    console.error('MailerLite error:', mlResponse.status, mlBody);

    if (mlResponse.status === 422) {
      return res.status(400).json({ error: 'That email address could not be added. Please check it and try again.' });
    }

    return res.status(502).json({ error: 'Signup is temporarily unavailable. Please try again later.' });
  } catch (err) {
    console.error('Network error contacting MailerLite:', err);
    return res.status(502).json({ error: 'Signup is temporarily unavailable. Please try again later.' });
  }
}