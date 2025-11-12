/**
 * E2E Tests: Authentication Flow
 * Sprint 4: User login/logout workflows
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/MyCastle/i);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should show magic link login option', async ({ page }) => {
    await page.goto('/login/magic-link');
    await expect(page.getByRole('heading', { name: /magic link/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test('should validate email format on magic link', async ({ page }) => {
    await page.goto('/login/magic-link');

    // Enter invalid email
    await page.getByPlaceholder(/email/i).fill('invalid-email');
    await page.getByRole('button', { name: /send.*link/i }).click();

    // Should show validation error
    await expect(page.getByText(/invalid.*email/i)).toBeVisible();
  });

  test('should handle empty email submission', async ({ page }) => {
    await page.goto('/login/magic-link');

    // Try to submit without email
    await page.getByRole('button', { name: /send.*link/i }).click();

    // Should show required field error
    await expect(page.getByText(/required/i)).toBeVisible();
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // Note: This test would require actual Supabase credentials
    // In CI, we would use test users or mock authentication
    test.skip(process.env.CI === 'true', 'Requires Supabase test credentials');

    await page.goto('/login');

    // Fill in login form (would need test credentials)
    await page.getByPlaceholder(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByPlaceholder(/password/i).fill(process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should handle logout', async ({ page }) => {
    test.skip(process.env.CI === 'true', 'Requires authenticated session');

    // Navigate to dashboard (assuming logged in)
    await page.goto('/dashboard');

    // Click logout button
    await page.getByRole('button', { name: /logout/i }).click();

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});
