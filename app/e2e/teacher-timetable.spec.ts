/**
 * E2E Tests: Teacher Timetable
 * Sprint 4: Timetable viewing workflow (T-044)
 */

import { test, expect } from '@playwright/test';

test.describe('Teacher Timetable', () => {
  test.beforeEach(async ({ page }) => {
    // Skip tests requiring authentication in CI
    test.skip(process.env.CI === 'true', 'Requires authenticated teacher session');

    // Assume logged in as teacher
    await page.goto('/teacher/timetable');
  });

  test('should display weekly timetable', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /timetable/i })).toBeVisible();

    // Should show week navigation
    await expect(page.getByRole('button', { name: /previous week/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /this week/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /next week/i })).toBeVisible();
  });

  test('should display weekday columns', async ({ page }) => {
    // Check for Monday-Friday headers
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    for (const day of weekdays) {
      await expect(page.getByText(day)).toBeVisible();
    }
  });

  test('should display time slots', async ({ page }) => {
    // Should show time slots from 08:00 to 18:00
    await expect(page.getByText(/08:00/)).toBeVisible();
    await expect(page.getByText(/09:00/)).toBeVisible();
  });

  test('should load timetable quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.reload();
    await page.waitForSelector('text=/timetable/i');

    const loadTime = Date.now() - startTime;

    // T-044: Should load in < 200ms (p95)
    // Allow 2s for E2E test tolerance
    expect(loadTime).toBeLessThan(2000);
  });

  test('should navigate to previous week', async ({ page }) => {
    const initialWeek = await page.textContent('[data-testid="week-display"]');

    await page.getByRole('button', { name: /previous week/i }).click();

    const newWeek = await page.textContent('[data-testid="week-display"]');
    expect(newWeek).not.toBe(initialWeek);
  });

  test('should navigate to next week', async ({ page }) => {
    const initialWeek = await page.textContent('[data-testid="week-display"]');

    await page.getByRole('button', { name: /next week/i }).click();

    const newWeek = await page.textContent('[data-testid="week-display"]');
    expect(newWeek).not.toBe(initialWeek);
  });

  test('should return to current week', async ({ page }) => {
    // Navigate away
    await page.getByRole('button', { name: /next week/i }).click();
    await page.getByRole('button', { name: /next week/i }).click();

    // Return to this week
    await page.getByRole('button', { name: /this week/i }).click();

    // Should show current week
    const weekDisplay = await page.textContent('[data-testid="week-display"]');
    expect(weekDisplay).toContain(new Date().getFullYear().toString());
  });

  test('should display session details', async ({ page }) => {
    // Look for session cards
    const sessionCards = page.locator('[data-testid="session-card"]');
    const count = await sessionCards.count();

    if (count > 0) {
      // Should show class name, time, topic
      const firstSession = sessionCards.first();
      await expect(firstSession).toBeVisible();

      // Check for key session info
      await expect(firstSession.locator('text=/^[A-Z0-9]+$/')).toBeVisible(); // Class code
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.getByRole('heading', { name: /timetable/i })).toBeVisible();

    // Mobile navigation should work
    await expect(page.getByRole('button', { name: /this week/i })).toBeVisible();
  });
});
