import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

test('page has no axe accessibility violations at rest', async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('page has no axe violations with validation errors showing', async ({ page }) => {
  // Trigger all validation errors
  await page.click('button[type=submit]');
  await page.waitForTimeout(100);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('page has no axe violations on the success state', async ({ page }) => {
  await page.route('/api/subscribe', route =>
    route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
  );

  await page.fill('#name', 'Jane Doe');
  await page.fill('#email', 'jane@example.com');
  await page.click('button[type=submit]');

  await expect(page.locator('#success-message')).toBeVisible({ timeout: 8000 });

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('decorative images have empty alt or aria-hidden', async ({ page }) => {
  // Illustration and mailbox are decorative — should be hidden from screen readers
  const illustration = page.locator('#theme-illustration');
  const mailbox = page.locator('#mailbox-container');

  const illustrationHidden = await illustration.getAttribute('aria-hidden');
  const illustrationAlt = await illustration.getAttribute('alt');
  expect(illustrationHidden === 'true' || illustrationAlt === '').toBeTruthy();

  const mailboxHidden = await mailbox.getAttribute('aria-hidden');
  expect(mailboxHidden).toBe('true');
});

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

test('themes exist and the envelope cycles through all of them', async ({ page }) => {
  // theme-cycle.js exposes window.__THEME_NAMES__ (see that file) purely so
  // this can be asserted without importing internals as an ES module.
  const themeNames = await page.evaluate(() => window.__THEME_NAMES__);

  expect(Array.isArray(themeNames)).toBe(true);
  expect(themeNames.length).toBeGreaterThan(1);
  expect(new Set(themeNames).size).toBe(themeNames.length); // no duplicates

  // Envelope should start on the first theme.
  await expect(page.locator('#envelope')).toHaveAttribute('data-theme', themeNames[0]);

  // Advance through every theme and confirm the envelope actually adopts
  // each one's name in order. CYCLE_DURATION is 5000ms plus a 400ms fade
  // before the attribute updates, so give each step a generous timeout
  // rather than a fixed sleep — expect() polls until it matches.
  for (let i = 1; i < themeNames.length; i++) {
    await expect(page.locator('#envelope')).toHaveAttribute('data-theme', themeNames[i], {
      timeout: 7000,
    });
  }
});

test('page has no axe violations after cycling to a non-default theme', async ({ page }) => {
  const themeNames = await page.evaluate(() => window.__THEME_NAMES__);
  test.skip(themeNames.length < 2, 'Only one theme defined, nothing to cycle to.');

  // Wait for the cycle to move off the first theme.
  await expect(page.locator('#envelope')).not.toHaveAttribute('data-theme', themeNames[0], {
    timeout: 8000,
  });

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('form inputs have associated labels', async ({ page }) => {
  const nameLabel = page.locator('label[for="name"]');
  const emailLabel = page.locator('label[for="email"]');

  await expect(nameLabel).toBeAttached();
  await expect(emailLabel).toBeAttached();
});

test('error messages are linked to inputs via aria-errormessage', async ({ page }) => {
  const nameErrorId = await page.locator('#name').getAttribute('aria-errormessage');
  const emailErrorId = await page.locator('#email').getAttribute('aria-errormessage');

  expect(nameErrorId).toBe('name-error');
  expect(emailErrorId).toBe('email-error');
});

test('success message has aria-live polite', async ({ page }) => {
  const live = await page.locator('#success-message').getAttribute('aria-live');
  expect(live).toBe('polite');
});

test('error messages have role alert', async ({ page }) => {
  const nameRole = await page.locator('#name-error').getAttribute('role');
  const emailRole = await page.locator('#email-error').getAttribute('role');
  expect(nameRole).toBe('alert');
  expect(emailRole).toBe('alert');
});