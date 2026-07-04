import { test, expect } from '@playwright/test';

// These tests call /api/subscribe directly (not through the browser form),
// which means they require `vercel dev` to be running with a valid
// DEV_SUBSCRIBE_RESULT env var set. They test the function's own validation
// and response handling independently of the frontend.

const BASE = 'http://localhost:3000';

async function post(data) {
  return fetch(`${BASE}/api/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

test('returns 405 for GET requests', async () => {
  const res = await fetch(`${BASE}/api/subscribe`);
  expect(res.status).toBe(405);
});

test('returns 400 when name is missing', async () => {
  const res = await post({ email: 'test@example.com' });
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error).toContain('Name');
});

test('returns 400 when name is empty string', async () => {
  const res = await post({ name: '   ', email: 'test@example.com' });
  expect(res.status).toBe(400);
});

test('returns 400 when email is missing', async () => {
  const res = await post({ name: 'Jane' });
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error).toContain('email');
});

test('returns 400 for malformed email', async () => {
  const res = await post({ name: 'Jane', email: 'not-an-email' });
  expect(res.status).toBe(400);
});

test('returns 200 with valid data (dev stub)', async () => {
  // Requires DEV_SUBSCRIBE_RESULT=success in .env
  const res = await post({ name: 'Jane Doe', email: 'jane@example.com' });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
});

test('returns 500 with valid data when stub is set to fail', async () => {
  // This test only makes sense if you temporarily set DEV_SUBSCRIBE_RESULT=fail
  // Skip it in normal runs — run manually to verify the error path.
  test.skip(
    process.env.DEV_SUBSCRIBE_RESULT !== 'fail',
    'Set DEV_SUBSCRIBE_RESULT=fail to run this test'
  );

  const res = await post({ name: 'Jane Doe', email: 'jane@example.com' });
  expect(res.status).toBe(500);
  const body = await res.json();
  expect(body.error).toBeTruthy();
});
