import { test, expect } from '@playwright/test';

/**
 * Focused coverage of the signup form's submission behavior:
 *   - a successful submission with valid data
 *   - failures when name is blank
 *   - failures when name has no letters (e.g. "123", "!!!")
 *   - failures when email is blank
 *   - failures when email isn't a valid email format
 *   - a failed submission due to a server error
 *
 * All /api/subscribe calls are mocked with page.route(), so these tests
 * don't depend on vercel dev, MailerLite, or DEV_SUBSCRIBE_RESULT — only
 * the client-side validation and submit flow in signup-form.js.
 */

test.beforeEach(async ({ page }) => {
  await page.route('**cdnjs.cloudflare.com/**alpinejs**', route =>
    route.fulfill({ path: 'node_modules/alpinejs/dist/cdn.min.js' })
  );
  await page.route('**cdnjs.cloudflare.com/**gsap**', route =>
    route.fulfill({ path: 'node_modules/gsap/dist/gsap.min.js' })
  );
  await page.goto('/');
  await page.waitForFunction(() => window.Alpine !== undefined);
});

// ---------------------------------------------------------------------------
// Successful submission
// ---------------------------------------------------------------------------

test('succeeds with a valid name and email', async ({ page }) => {
  let requestBody = null;
  await page.route('/api/subscribe', async route => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
  });

  await page.fill('#name', 'Jane Doe');
  await page.fill('#email', 'jane@example.com');
  await page.click('button[type=submit]');

  await expect(page.locator('#success-message')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('#envelope')).toBeHidden({ timeout: 8000 });

  expect(requestBody).toEqual({ name: 'Jane Doe', email: 'jane@example.com' });
});

// ---------------------------------------------------------------------------
// Failed submission — name
// ---------------------------------------------------------------------------

test('fails when name is blank', async ({ page }) => {
  let apiCalled = false;
  await page.route('/api/subscribe', route => {
    apiCalled = true;
    route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
  });

  await page.fill('#email', 'jane@example.com');
  await page.click('button[type=submit]');

  await expect(page.locator('#name-error')).toBeVisible();
  await expect(page.locator('#name-error')).toHaveText('Please enter your name.');
  await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#name')).toBeFocused();
  expect(apiCalled).toBe(false);
});

test('fails when name is only whitespace', async ({ page }) => {
  await page.fill('#name', '   ');
  await page.fill('#email', 'jane@example.com');
  await page.click('button[type=submit]');

  await expect(page.locator('#name-error')).toBeVisible();
  await expect(page.locator('#name-error')).toHaveText('Please enter your name.');
});

test('fails when name has no letters (digits only)', async ({ page }) => {
  let apiCalled = false;
  await page.route('/api/subscribe', route => {
    apiCalled = true;
    route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
  });

  await page.fill('#name', '12345');
  await page.fill('#email', 'jane@example.com');
  await page.click('button[type=submit]');

  await expect(page.locator('#name-error')).toBeVisible();
  await expect(page.locator('#name-error')).toHaveText('Please enter a valid name.');
  expect(apiCalled).toBe(false);
});

test('fails when name has no letters (punctuation only)', async ({ page }) => {
  await page.fill('#name', '!!!');
  await page.fill('#email', 'jane@example.com');
  await page.click('button[type=submit]');

  await expect(page.locator('#name-error')).toBeVisible();
  await expect(page.locator('#name-error')).toHaveText('Please enter a valid name.');
});

test('name error clears once a letter is added', async ({ page }) => {
  await page.fill('#name', '123');
  await page.locator('#name').blur();
  await expect(page.locator('#name-error')).toBeVisible();

  await page.fill('#name', '123 Jane');
  await page.locator('#name').blur();
  await expect(page.locator('#name-error')).toBeHidden();
});

// ---------------------------------------------------------------------------
// Failed submission — email
// ---------------------------------------------------------------------------

test('fails when email is blank', async ({ page }) => {
  let apiCalled = false;
  await page.route('/api/subscribe', route => {
    apiCalled = true;
    route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
  });

  await page.fill('#name', 'Jane Doe');
  await page.click('button[type=submit]');

  await expect(page.locator('#email-error')).toBeVisible();
  await expect(page.locator('#email-error')).toHaveText('Please enter your email address.');
  expect(apiCalled).toBe(false);
});

test('fails when email has no @ symbol', async ({ page }) => {
  await page.fill('#name', 'Jane Doe');
  await page.fill('#email', 'janeexample.com');
  await page.click('button[type=submit]');

  await expect(page.locator('#email-error')).toBeVisible();
  await expect(page.locator('#email-error')).toHaveText('Enter a valid email address.');
});

test('fails when email has no domain', async ({ page }) => {
  await page.fill('#name', 'Jane Doe');
  await page.fill('#email', 'jane@example');
  await page.click('button[type=submit]');

  await expect(page.locator('#email-error')).toBeVisible();
  await expect(page.locator('#email-error')).toHaveText('Enter a valid email address.');
});

test('fails when email contains spaces', async ({ page }) => {
  await page.fill('#name', 'Jane Doe');
  await page.fill('#email', 'jane doe@example.com');
  await page.click('button[type=submit]');

  await expect(page.locator('#email-error')).toBeVisible();
  await expect(page.locator('#email-error')).toHaveText('Enter a valid email address.');
});

test('both name and email errors show together when both are invalid', async ({ page }) => {
  await page.fill('#name', '999');
  await page.fill('#email', 'not-an-email');
  await page.click('button[type=submit]');

  await expect(page.locator('#name-error')).toBeVisible();
  await expect(page.locator('#email-error')).toBeVisible();
  // Focus moves to name first since it's checked first in validateAll().
  await expect(page.locator('#name')).toBeFocused();
});

// ---------------------------------------------------------------------------
// Failed submission — server-side
// ---------------------------------------------------------------------------

test('fails gracefully on a server error with valid input', async ({ page }) => {
  await page.route('/api/subscribe', route =>
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Signup is temporarily unavailable. Please try again later.' }),
    })
  );

  await page.fill('#name', 'Jane Doe');
  await page.fill('#email', 'jane@example.com');
  await page.click('button[type=submit]');

  await expect(page.locator('.form-status--error')).toBeVisible();
  await expect(page.locator('.form-status--error')).toContainText('temporarily unavailable');
  // Form should not have transitioned to the success state.
  await expect(page.locator('#success-message')).toBeHidden();
  await expect(page.locator('#envelope')).toBeVisible();
});

test('fails gracefully on a network error with valid input', async ({ page }) => {
  await page.route('/api/subscribe', route => route.abort('failed'));

  await page.fill('#name', 'Jane Doe');
  await page.fill('#email', 'jane@example.com');
  await page.click('button[type=submit]');

  await expect(page.locator('.form-status--error')).toContainText('Could not reach the server');
  await expect(page.locator('#success-message')).toBeHidden();
});
