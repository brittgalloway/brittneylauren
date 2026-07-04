import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/src/');
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
  // Leaf and mailbox are decorative — should be hidden from screen readers
  const leaf = page.locator('#leaf');
  const mailbox = page.locator('#mailbox-container');

  const leafHidden = await leaf.getAttribute('aria-hidden');
  const leafAlt = await leaf.getAttribute('alt');
  expect(leafHidden === 'true' || leafAlt === '').toBeTruthy();

  const mailboxHidden = await mailbox.getAttribute('aria-hidden');
  expect(mailboxHidden).toBe('true');
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
