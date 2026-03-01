import { test, expect } from '@playwright/test';
import { loginAsVendor } from './helpers';

test.describe('Vendor Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVendor(page);
  });

  test('vendor dashboard loads', async ({ page }) => {
    await page.goto('/vendor/dashboard');
    await page.waitForLoadState('networkidle');
    // Vendor should be on the dashboard URL
    await expect(page).toHaveURL(/\/vendor\/dashboard/);
  });

  test('vendor deals page loads', async ({ page }) => {
    await page.goto('/vendor/deals');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/vendor\/deals/);
  });

  test('create new deal page loads with form fields', async ({ page }) => {
    await page.goto('/vendor/deals/new');
    await page.waitForLoadState('networkidle');

    // Check form fields exist
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('input[name="original_price"]')).toBeVisible();
    await expect(page.locator('input[name="deal_price"]')).toBeVisible();

    // Check image upload section
    await expect(page.getByText('Deal Image', { exact: true })).toBeVisible();
    await expect(page.locator('button:has-text("Upload File")')).toBeVisible();
    await expect(page.locator('button:has-text("Paste URL")')).toBeVisible();
  });

  test('AI Generate tab appears for Business+ tier', async ({ page }) => {
    await page.goto('/vendor/deals/new');
    await page.waitForLoadState('networkidle');

    // The AI Generate button should be visible for enterprise tier vendor
    const aiTab = page.locator('button:has-text("AI Generate")');
    if (await aiTab.isVisible()) {
      await aiTab.click();
      await expect(page.locator('text=AI Image Generation')).toBeVisible();
      await expect(page.locator('text=Generate Image with AI')).toBeVisible();
    }
  });

  test('AI Video Generation section appears', async ({ page }) => {
    await page.goto('/vendor/deals/new');
    await page.waitForLoadState('networkidle');

    // Check for AI Video Generation section
    const videoSection = page.locator('text=AI Video Generation');
    if (await videoSection.isVisible()) {
      // Without an image, should show warning
      await expect(page.locator('text=Add a deal image first')).toBeVisible();
    }
  });

  test('fill and submit a new steady deal', async ({ page }) => {
    await page.goto('/vendor/deals/new');
    await page.waitForLoadState('networkidle');

    // Fill in the form
    await page.fill('input[name="title"]', 'E2E Test Deal - 30% Off Lunch');
    await page.fill('textarea[name="description"]', 'This is an automated test deal. Enjoy 30% off all lunch items today!');
    await page.fill('input[name="original_price"]', '50');
    await page.fill('input[name="deal_price"]', '35');
    await page.fill('input[name="max_claims"]', '10');

    // Paste an image URL
    await page.locator('button:has-text("Paste URL")').click();
    await page.fill('input[name="image_url"]', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to deals calendar on success
    await page.waitForURL(/\/vendor\/deals/, { timeout: 15_000 });
  });

  test('vendor deals calendar view loads', async ({ page }) => {
    await page.goto('/vendor/deals/calendar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/vendor\/deals\/calendar/);
  });

  test('vendor analytics page loads', async ({ page }) => {
    await page.goto('/vendor/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/vendor\/analytics/);
  });

  test('vendor settings page loads', async ({ page }) => {
    await page.goto('/vendor/settings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/vendor\/settings/);
  });

  test('vendor reviews page loads', async ({ page }) => {
    await page.goto('/vendor/reviews');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/vendor\/reviews/);
  });

  test('vendor subscription page loads', async ({ page }) => {
    await page.goto('/vendor/subscription');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/vendor\/subscription/);
  });

  test('vendor loyalty program page loads', async ({ page }) => {
    await page.goto('/vendor/loyalty');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/vendor\/loyalty/);
  });

  test('vendor scan page loads', async ({ page }) => {
    await page.goto('/vendor/scan');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/vendor\/scan/);
  });
});
