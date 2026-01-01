import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should display login form when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Should see the login form
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
    await expect(page.getByPlaceholder(/server url/i)).toBeVisible();
    await expect(page.getByPlaceholder(/api key/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /connect/i })).toBeVisible();
  });

  test('should show validation error for empty server URL', async ({ page }) => {
    await page.goto('/');

    // Try to submit without entering anything
    await page.getByRole('button', { name: /connect/i }).click();

    // Should show an error or the button should be disabled
    await expect(page.getByPlaceholder(/server url/i)).toHaveAttribute('required');
  });

  test('should show validation error for empty API key', async ({ page }) => {
    await page.goto('/');

    // Enter server URL but not API key
    await page.getByPlaceholder(/server url/i).fill('http://localhost:2283');
    await page.getByRole('button', { name: /connect/i }).click();

    // Should show an error or the API key field should be required
    await expect(page.getByPlaceholder(/api key/i)).toHaveAttribute('required');
  });

  test('should handle invalid credentials gracefully', async ({ page }) => {
    await page.goto('/');

    // Enter invalid credentials
    await page.getByPlaceholder(/server url/i).fill('http://localhost:2283');
    await page.getByPlaceholder(/api key/i).fill('invalid-api-key');
    await page.getByRole('button', { name: /connect/i }).click();

    // Should show an error message (not crash)
    // The exact error message depends on implementation
    await expect(page.getByRole('alert').or(page.locator('.error'))).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to photos after successful login', async ({ page }) => {
    // This test requires a valid API key - skip in CI without proper setup
    test.skip(!process.env.E2E_IMMICH_API_KEY, 'Requires valid Immich API key');

    await page.goto('/');

    // Enter valid credentials
    await page.getByPlaceholder(/server url/i).fill(process.env.E2E_IMMICH_URL || 'http://localhost:2283');
    await page.getByPlaceholder(/api key/i).fill(process.env.E2E_IMMICH_API_KEY!);
    await page.getByRole('button', { name: /connect/i }).click();

    // Should redirect to main view and show photos or empty state
    await expect(page.getByRole('heading', { name: /login/i })).not.toBeVisible({ timeout: 10000 });
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    // This test requires a valid API key - skip in CI without proper setup
    test.skip(!process.env.E2E_IMMICH_API_KEY, 'Requires valid Immich API key');

    await page.goto('/');

    // Login
    await page.getByPlaceholder(/server url/i).fill(process.env.E2E_IMMICH_URL || 'http://localhost:2283');
    await page.getByPlaceholder(/api key/i).fill(process.env.E2E_IMMICH_API_KEY!);
    await page.getByRole('button', { name: /connect/i }).click();

    // Wait for successful login
    await expect(page.getByRole('heading', { name: /login/i })).not.toBeVisible({ timeout: 10000 });

    // Reload the page
    await page.reload();

    // Should still be authenticated (no login form)
    await expect(page.getByRole('heading', { name: /login/i })).not.toBeVisible();
  });

  test('should allow logout', async ({ page }) => {
    // This test requires a valid API key - skip in CI without proper setup
    test.skip(!process.env.E2E_IMMICH_API_KEY, 'Requires valid Immich API key');

    await page.goto('/');

    // Login first
    await page.getByPlaceholder(/server url/i).fill(process.env.E2E_IMMICH_URL || 'http://localhost:2283');
    await page.getByPlaceholder(/api key/i).fill(process.env.E2E_IMMICH_API_KEY!);
    await page.getByRole('button', { name: /connect/i }).click();

    // Wait for successful login
    await expect(page.getByRole('heading', { name: /login/i })).not.toBeVisible({ timeout: 10000 });

    // Find and click logout button
    await page.getByRole('button', { name: /logout/i }).click();

    // Should see login form again
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });
});
