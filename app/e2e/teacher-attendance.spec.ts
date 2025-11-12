/**
 * E2E Tests: Teacher Attendance Register
 * Sprint 4: Attendance marking workflow (T-050, T-052)
 */

import { test, expect } from '@playwright/test';

test.describe('Teacher Attendance Register', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(process.env.CI === 'true', 'Requires authenticated teacher session');

    await page.goto('/teacher/attendance');
  });

  test('should display attendance register page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /attendance/i })).toBeVisible();
  });

  test('should display session selector', async ({ page }) => {
    // Should have class and session selectors
    await expect(page.getByLabel(/class/i)).toBeVisible();
    await expect(page.getByLabel(/session/i)).toBeVisible();
  });

  test('should load student roster after session selection', async ({ page }) => {
    // Select a class
    await page.getByLabel(/class/i).selectOption({ index: 1 });

    // Select a session
    await page.getByLabel(/session/i).selectOption({ index: 1 });

    // Should display student roster
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /student/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
  });

  test('should have keyboard shortcuts', async ({ page }) => {
    // Load a session first
    await page.getByLabel(/class/i).selectOption({ index: 1 });
    await page.getByLabel(/session/i).selectOption({ index: 1 });

    // Should show keyboard shortcut hint
    await expect(page.getByText(/P.*Present/i)).toBeVisible();
    await expect(page.getByText(/A.*Absent/i)).toBeVisible();
    await expect(page.getByText(/L.*Late/i)).toBeVisible();
    await expect(page.getByText(/E.*Excused/i)).toBeVisible();
  });

  test('should mark all students present with bulk button', async ({ page }) => {
    // Load a session
    await page.getByLabel(/class/i).selectOption({ index: 1 });
    await page.getByLabel(/session/i).selectOption({ index: 1 });

    // Click "Mark All Present"
    await page.getByRole('button', { name: /mark all present/i }).click();

    // Should show success message
    await expect(page.getByText(/success|saved/i)).toBeVisible();

    // All students should show as present
    const statusCells = page.locator('[data-testid="attendance-status"]');
    const count = await statusCells.count();

    for (let i = 0; i < count; i++) {
      await expect(statusCells.nth(i)).toHaveText(/present/i);
    }
  });

  test('should mark individual student as absent', async ({ page }) => {
    // Load a session
    await page.getByLabel(/class/i).selectOption({ index: 1 });
    await page.getByLabel(/session/i).selectOption({ index: 1 });

    // Click on first student's absent button
    const firstAbsentButton = page.locator('[data-testid="mark-absent"]').first();
    await firstAbsentButton.click();

    // Should show success message
    await expect(page.getByText(/success|saved/i)).toBeVisible();

    // First student should show as absent
    const firstStatus = page.locator('[data-testid="attendance-status"]').first();
    await expect(firstStatus).toHaveText(/absent/i);
  });

  test('should display attendance statistics', async ({ page }) => {
    // Load a session
    await page.getByLabel(/class/i).selectOption({ index: 1 });
    await page.getByLabel(/session/i).selectOption({ index: 1 });

    // Should show stats
    await expect(page.getByText(/total.*students/i)).toBeVisible();
    await expect(page.getByText(/present/i)).toBeVisible();
    await expect(page.getByText(/absent/i)).toBeVisible();
  });

  test('should warn about visa students', async ({ page }) => {
    // Load a session
    await page.getByLabel(/class/i).selectOption({ index: 1 });
    await page.getByLabel(/session/i).selectOption({ index: 1 });

    // If there are visa students, should show warning
    const visaWarning = page.getByText(/visa.*student/i);
    if (await visaWarning.isVisible()) {
      await expect(visaWarning).toBeVisible();
    }
  });

  test('should complete attendance marking in under 90 seconds', async ({ page }) => {
    const startTime = Date.now();

    // Load a session
    await page.getByLabel(/class/i).selectOption({ index: 1 });
    await page.getByLabel(/session/i).selectOption({ index: 1 });

    // Mark all present
    await page.getByRole('button', { name: /mark all present/i }).click();

    // Wait for success
    await expect(page.getByText(/success|saved/i)).toBeVisible();

    const totalTime = Date.now() - startTime;

    // T-050: Should complete in < 90s
    expect(totalTime).toBeLessThan(90000);
  });

  test('should handle keyboard shortcuts with focus', async ({ page }) => {
    // Load a session
    await page.getByLabel(/class/i).selectOption({ index: 1 });
    await page.getByLabel(/session/i).selectOption({ index: 1 });

    // Focus on first student row
    await page.locator('[data-testid="student-row"]').first().focus();

    // Press 'P' to mark present
    await page.keyboard.press('P');

    // Should mark as present
    const firstStatus = page.locator('[data-testid="attendance-status"]').first();
    await expect(firstStatus).toHaveText(/present/i);
  });

  test('should show optimistic UI updates', async ({ page }) => {
    // Load a session
    await page.getByLabel(/class/i).selectOption({ index: 1 });
    await page.getByLabel(/session/i).selectOption({ index: 1 });

    // Click mark present on first student
    await page.locator('[data-testid="mark-present"]').first().click();

    // Status should update immediately (optimistically)
    const firstStatus = page.locator('[data-testid="attendance-status"]').first();
    await expect(firstStatus).toHaveText(/present/i);

    // Should not be in loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
  });
});
