import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Intercept CDN requests and serve from node_modules so tests don't
  // depend on external network access in CI.
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
// Page structure
// ---------------------------------------------------------------------------

test('page has a visible skip link that becomes visible on focus', async ({ page }) => {
  const skipLink = page.locator('.skip-link');
  // Initially off-screen (top: -3rem)
  await expect(skipLink).not.toBeInViewport();
  await skipLink.focus();
  await expect(skipLink).toBeInViewport();
});

test('heading and form are present', async ({ page }) => {
  await expect(page.locator('h1#signup-heading')).toHaveText('Stationery is an art');
  await expect(page.locator('#signup-form')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Client-side validation
// ---------------------------------------------------------------------------

test('shows name error when name is empty on submit', async ({ page }) => {
  await page.fill('#email', 'test@example.com');
  await page.click('button[type=submit]');

  const nameError = page.locator('#name-error');
  await expect(nameError).toBeVisible();
  await expect(nameError).toHaveText('Please enter your name.');
  // Focus should move to the name field
  await expect(page.locator('#name')).toBeFocused();
});

test('shows email error when email is empty on submit', async ({ page }) => {
  await page.fill('#name', 'Jane Doe');
  await page.click('button[type=submit]');

  const emailError = page.locator('#email-error');
  await expect(emailError).toBeVisible();
  await expect(emailError).toContainText('email');
});

test('shows email format error for invalid email', async ({ page }) => {
  await page.fill('#name', 'Jane Doe');
  await page.fill('#email', 'not-an-email');
  await page.locator('#email').blur();

  await expect(page.locator('#email-error')).toBeVisible();
  await expect(page.locator('#email-error')).toHaveText('Enter a valid email address.');
});

test('inline validation fires on blur, not just submit', async ({ page }) => {
  await page.fill('#name', 'Jane');
  await page.locator('#name').blur();
  // No error yet — name is valid
  await expect(page.locator('#name-error')).toBeHidden();

  await page.fill('#email', 'bad');
  await page.locator('#email').blur();
  // Email error shows immediately on blur
  await expect(page.locator('#email-error')).toBeVisible();
});

test('error clears when field is corrected', async ({ page }) => {
  // Trigger email error
  await page.fill('#email', 'bad');
  await page.locator('#email').blur();
  await expect(page.locator('#email-error')).toBeVisible();

  // Fix it
  await page.fill('#email', 'good@example.com');
  await page.locator('#email').blur();
  await expect(page.locator('#email-error')).toBeHidden();
});

test('aria-invalid is set on invalid fields', async ({ page }) => {
  await page.click('button[type=submit]');
  await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
});

test('aria-invalid is false on valid fields', async ({ page }) => {
  await page.fill('#name', 'Jane');
  await page.locator('#name').blur();
  await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'false');
});

// ---------------------------------------------------------------------------
// Floating label behaviour
// ---------------------------------------------------------------------------

test('label floats up when input has content', async ({ page }) => {
  const label = page.locator('label[for="name"]');
  const transformBefore = await label.evaluate(el =>
    window.getComputedStyle(el).transform
  );

  await page.fill('#name', 'Jane');

  const transformAfter = await label.evaluate(el =>
    window.getComputedStyle(el).transform
  );

  expect(transformBefore).not.toEqual(transformAfter);
});

// ---------------------------------------------------------------------------
// Submission states
// ---------------------------------------------------------------------------

test('button shows Submitting… and is disabled during submission', async ({ page }) => {
  // Intercept the API call and delay it so we can observe the in-flight state
  await page.route('/api/subscribe', async route => {
    await new Promise(r => setTimeout(r, 500));
    await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
  });

  await page.fill('#name', 'Jane Doe');
  await page.fill('#email', 'jane@example.com');
  await page.click('button[type=submit]');

  // Check mid-flight
  await expect(page.locator('button[type=submit]')).toBeDisabled();
  await expect(page.locator('button span', { hasText: 'Submitting…' })).toBeVisible();
});

test('shows server error message on API failure', async ({ page }) => {
  await page.route('/api/subscribe', route =>
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Signup is temporarily unavailable. Please try again later.' }),
    })
  );

  await page.fill('#name', 'Jane Doe');
  await page.fill('#email', 'jane@example.com');
  await page.click('button[type=submit]');

  const errorMsg = page.locator('.form-status--error');
  await expect(errorMsg).toBeVisible();
  await expect(errorMsg).toContainText('temporarily unavailable');
});

test('shows generic error on network failure', async ({ page }) => {
  await page.route('/api/subscribe', route => route.abort('failed'));

  await page.fill('#name', 'Jane Doe');
  await page.fill('#email', 'jane@example.com');
  await page.click('button[type=submit]');

  await expect(page.locator('.form-status--error')).toContainText('Could not reach the server');
});

test('on success, envelope is hidden and success message appears', async ({ page }) => {
  await page.route('/api/subscribe', route =>
    route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
  );

  await page.fill('#name', 'Jane Doe');
  await page.fill('#email', 'jane@example.com');
  await page.click('button[type=submit]');

  // Wait for animation to complete (generous timeout)
  await expect(page.locator('#success-message')).toBeVisible({ timeout: 8000 });
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

test('tab order reaches all interactive elements', async ({ page }) => {
  const interactiveIds = [];

  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const id = await page.evaluate(() => document.activeElement?.id || document.activeElement?.className);
    interactiveIds.push(id);
  }

  // Should hit: skip-link, logo-link, name, email, submit button, then cycle
  expect(interactiveIds).toContain('name');
  expect(interactiveIds).toContain('email');
});

test('form can be submitted with keyboard only', async ({ page }) => {
  await page.route('/api/subscribe', route =>
    route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
  );

  await page.locator('#name').focus();
  await page.keyboard.type('Jane Doe');
  await page.keyboard.press('Tab');
  await page.keyboard.type('jane@example.com');
  await page.keyboard.press('Tab'); // move to submit
  await page.keyboard.press('Enter');

  await expect(page.locator('#success-message')).toBeVisible({ timeout: 8000 });
});

// ---------------------------------------------------------------------------
// Reduced motion
// ---------------------------------------------------------------------------

test('success shows without animation when prefers-reduced-motion is set', async ({ browser }) => {
  const context = await browser.newContext({
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  await page.route('**cdnjs.cloudflare.com/**alpinejs**', route =>
    route.fulfill({ path: 'node_modules/alpinejs/dist/cdn.min.js' })
  );
  await page.route('**cdnjs.cloudflare.com/**gsap**', route =>
    route.fulfill({ path: 'node_modules/gsap/dist/gsap.min.js' })
  );
  await page.goto('/');
  await page.waitForFunction(() => window.Alpine !== undefined);

  await page.route('/api/subscribe', route =>
    route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
  );

  await page.fill('#name', 'Jane Doe');
  await page.fill('#email', 'jane@example.com');
  await page.click('button[type=submit]');

  // Should resolve quickly — no long animation
  await expect(page.locator('#success-message')).toBeVisible({ timeout: 2000 });

  await context.close();
});