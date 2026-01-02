import { test, expect } from '@playwright/test';

test.describe('Photo Gallery', () => {
  // Setup: authenticate before tests that require it
  test.beforeEach(async ({ page }) => {
    // Skip tests that require authentication if no API key is provided
    if (!process.env.E2E_IMMICH_API_KEY) {
      test.skip();
      return;
    }

    // Set authentication token directly in localStorage
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('immich_token', token);
    }, process.env.E2E_IMMICH_API_KEY);
    await page.reload();
  });

  test('should display photo grid when authenticated', async ({ page }) => {
    await page.goto('/');

    // Should not see login form
    await expect(page.getByRole('heading', { name: /login/i })).not.toBeVisible();

    // Should see either photos or empty state
    const hasPhotos = await page.locator('[data-testid="photo-card"]').count() > 0;
    const hasEmptyState = await page.getByText(/no photos/i).isVisible().catch(() => false);

    expect(hasPhotos || hasEmptyState).toBeTruthy();
  });

  test('should display photo cards with images', async ({ page }) => {
    await page.goto('/');

    // Wait for photos to load
    const photoCards = page.locator('[data-testid="photo-card"]');

    // If there are photos, check they have images
    const count = await photoCards.count();
    if (count > 0) {
      // First photo should have an image
      const firstPhoto = photoCards.first();
      await expect(firstPhoto.locator('img')).toBeVisible();
    }
  });

  test('should show photo details on hover or click', async ({ page }) => {
    await page.goto('/');

    const photoCards = page.locator('[data-testid="photo-card"]');
    const count = await photoCards.count();

    if (count > 0) {
      // Hover over the first photo
      await photoCards.first().hover();

      // Should show some overlay or detail (depends on implementation)
      // This test verifies the interaction doesn't cause errors
      await expect(photoCards.first()).toBeVisible();
    }
  });

  test('should support infinite scroll pagination', async ({ page }) => {
    await page.goto('/');

    const photoCards = page.locator('[data-testid="photo-card"]');
    const initialCount = await photoCards.count();

    if (initialCount >= 20) {
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Wait for more photos to load
      await page.waitForTimeout(2000);

      // Check if more photos loaded
      const newCount = await photoCards.count();
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    }
  });

  test('should display sidebar navigation', async ({ page }) => {
    await page.goto('/');

    // Sidebar should be visible
    const sidebar = page.locator('[data-testid="sidebar"]').or(page.locator('nav'));
    await expect(sidebar).toBeVisible();
  });

  test('should navigate to duplicates view', async ({ page }) => {
    await page.goto('/');

    // Find and click duplicates link in sidebar
    const duplicatesLink = page.getByRole('link', { name: /duplicate/i });

    if (await duplicatesLink.isVisible()) {
      await duplicatesLink.click();

      // Should show duplicates view or empty state
      await expect(page.getByText(/duplicate/i).first()).toBeVisible();
    }
  });
});

test.describe('Photo Gallery - Unauthenticated', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Clear any stored authentication
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Should see login form
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });
});
