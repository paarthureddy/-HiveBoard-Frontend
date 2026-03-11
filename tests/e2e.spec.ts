import { test, expect } from '@playwright/test';

test.describe('HiveBoard E2E Tests', () => {

  // Test 1: Auth page loads and shows the auth form correctly
  test('Auth Page: Login and Register tabs are displayed', async ({ page }) => {
    const response = await page.goto('http://localhost:8080/auth');
    await page.waitForLoadState('domcontentloaded');

    // Page must respond with a 200 status
    expect(response?.status()).toBe(200);

    // Login tab is visible
    await expect(page.getByRole('tab', { name: 'Login' })).toBeVisible({ timeout: 15000 });

    // Register tab is visible
    await expect(page.getByRole('tab', { name: 'Register' })).toBeVisible({ timeout: 15000 });
  });

  // Test 2: Unauthenticated user is redirected away from protected route
  test('Protected Route: Unauthenticated user is redirected to /auth', async ({ page }) => {
    // Try to access the protected home page without logging in
    await page.goto('http://localhost:8080/home');
    await page.waitForLoadState('networkidle');

    // Should be redirected to /auth since we're not logged in
    await expect(page).toHaveURL(/localhost:8080.*auth/, { timeout: 10000 });
  });

  // Test 3: Join session shows error for invalid token (no backend needed to render error)
  test('Join Session: Invalid invite token shows error UI', async ({ page }) => {
    await page.goto('http://localhost:8080/join/invalid_fake_token_xyz_123');
    await page.waitForLoadState('networkidle');

    // Wait for loading spinner to disappear
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 }).catch(() => {});

    // Page should show the invalid invite error heading
    await expect(page.getByRole('heading', { name: 'Invalid Invite' })).toBeVisible({ timeout: 15000 });
  });

});
