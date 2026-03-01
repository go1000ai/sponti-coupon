import { Page, expect } from '@playwright/test';

// Test account credentials
export const VENDOR_EMAIL = 'apponlinefl@gmail.com';
export const VENDOR_PASSWORD = process.env.TEST_VENDOR_PASSWORD || 'normi330';

export const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || '';
export const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || '';

/**
 * Login as a specific user via the login page
 */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation away from login page
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 15_000 });
}

/**
 * Login as the test vendor account
 */
export async function loginAsVendor(page: Page) {
  await loginAs(page, VENDOR_EMAIL, VENDOR_PASSWORD);
}

/**
 * Logout the current user
 */
export async function logout(page: Page) {
  // Try the API signout endpoint
  await page.goto('/api/auth/signout');
  await page.goto('/');
}

/**
 * Wait for page to stabilize (no pending network requests)
 */
export async function waitForStable(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Check if an element is visible on the page
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  return element.isVisible();
}
