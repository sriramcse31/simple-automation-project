import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});

test('FLAKY: random failure example', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  const random = Math.random();

  // 50% chance of failure
  expect(random).toBeGreaterThan(0.5);
});

test('FLAKY: network latency variation', async ({ page }) => {
  await page.goto('https://example.com');

  // Simulate unstable network delay
  await page.waitForTimeout(500 + Math.random() * 3000);

  await expect(page).toHaveTitle('Example Domain');
});


test('TIMEOUT: test exceeds max duration', async ({ page }) => {
  // Set a very small timeout for this test
  test.setTimeout(2000); // 2 seconds

  await page.goto('https://example.com');

  // Artificial long wait
  await page.waitForTimeout(5000); // exceeds test timeout
});


test('DATA SETUP: user does not exist', async ({ page }) => {
  await page.goto('https://practicesoftwaretesting.com/auth/login');

  // Test assumes this user exists in environment
  await page.getByLabel('Email').fill('nonexistent_user@test.com');
  await page.getByLabel('Password').fill('Password@123');

  await page.getByRole('button', { name: 'Login' }).click();

  // Application correctly rejects invalid data
  await expect(page.locator('.alert-danger')).toHaveText(
    'Invalid email or password'
  );
});