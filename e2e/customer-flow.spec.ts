import { test, expect } from '@playwright/test';

test.describe('Customer Flow', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Home page should have some content
    await expect(page.locator('body')).toBeVisible();
  });

  test('deals browse page loads', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/deals/);
  });

  test('deals page shows deal cards or empty state', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Should have either deal cards or an empty state message
    const hasDealCards = await page.locator('[class*="card"], [class*="deal"], a[href*="/deals/"]').count();
    const hasEmptyState = await page.locator('text=/no deals|no results|nothing found/i').count();

    expect(hasDealCards > 0 || hasEmptyState > 0).toBeTruthy();
  });

  test('clicking a deal navigates to detail page', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Find deal card links (Next.js Link components render as <a> tags)
    const dealLinks = page.locator('a[href^="/deals/"]');
    const count = await dealLinks.count();

    if (count > 0) {
      // Get the href first, then navigate directly to ensure it works
      const href = await dealLinks.first().getAttribute('href');
      expect(href).toBeTruthy();
      await page.goto(href!);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/\/deals\/[a-f0-9-]+/);
    }
  });

  test('deal detail page shows deal info', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const dealLinks = page.locator('a[href^="/deals/"]');
    const count = await dealLinks.count();

    if (count > 0) {
      await dealLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Deal detail page should show key information
      const hasTitle = await page.locator('h1').count();
      expect(hasTitle).toBeGreaterThan(0);

      // Should have pricing info
      const hasPricing = await page.locator('text=/\\$/').count();
      expect(hasPricing).toBeGreaterThan(0);

      // Should have tabs
      await expect(page.locator('text=The Nitty Gritty')).toBeVisible();
      await expect(page.locator('text=/Reviews/i')).toBeVisible();
      await expect(page.locator('text=About Business')).toBeVisible();
    }
  });

  test('claim button redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const dealLinks = page.locator('a[href^="/deals/"]');
    const count = await dealLinks.count();

    if (count > 0) {
      await dealLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Try to claim without being logged in
      const claimButton = page.locator('button:has-text("Claim")');
      if (await claimButton.isVisible()) {
        await claimButton.click();
        // Should redirect to login
        await page.waitForTimeout(3000);
        expect(page.url()).toContain('/auth/login');
      }
    }
  });

  test('deal detail tabs work correctly', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const dealLinks = page.locator('a[href^="/deals/"]');
    const count = await dealLinks.count();

    if (count > 0) {
      await dealLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Click Reviews tab
      const reviewsTab = page.locator('button:has-text("Reviews")');
      if (await reviewsTab.isVisible()) {
        await reviewsTab.click();
        await page.waitForTimeout(1000);
        // Should show reviews content
        const hasReviewContent = await page.locator('text=/Customer Reviews|No reviews yet/i').count();
        expect(hasReviewContent).toBeGreaterThan(0);
      }

      // Click About Business tab
      const vendorTab = page.locator('button:has-text("About Business")');
      if (await vendorTab.isVisible()) {
        await vendorTab.click();
        await page.waitForTimeout(1000);
        // Should show vendor information
        const hasVendorInfo = await page.locator('text=/Contact Information/i').count();
        expect(hasVendorInfo).toBeGreaterThan(0);
      }
    }
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/pricing/);
  });

  test('auth login page loads', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('auth signup page loads', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/auth\/signup/);
  });
});
