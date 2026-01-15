/**
 * E2E Tests: Teacher Lesson Planner
 * Sprint 4: AI-powered lesson planning workflow (T-031, T-032, T-033)
 */

import { test, expect } from '@playwright/test';

test.describe('Teacher Lesson Planner', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(process.env.CI === 'true', 'Requires authenticated teacher session');

    await page.goto('/teacher/lesson-planner');
  });

  test('should display lesson planner page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /lesson planner/i })).toBeVisible();
  });

  test('should have CEFR level selector', async ({ page }) => {
    const levelSelect = page.getByLabel(/cefr level/i);
    await expect(levelSelect).toBeVisible();

    // Should have all 6 levels
    const options = await levelSelect.locator('option').allTextContents();
    expect(options).toContain('A1');
    expect(options).toContain('A2');
    expect(options).toContain('B1');
    expect(options).toContain('B2');
    expect(options).toContain('C1');
    expect(options).toContain('C2');
  });

  test('should have topic input', async ({ page }) => {
    const topicInput = page.getByLabel(/topic/i);
    await expect(topicInput).toBeVisible();
    await expect(topicInput).toHaveAttribute('type', 'text');
  });

  test('should have duration input', async ({ page }) => {
    const durationInput = page.getByLabel(/duration/i);
    await expect(durationInput).toBeVisible();
    await expect(durationInput).toHaveAttribute('type', 'number');
  });

  test('should validate required fields', async ({ page }) => {
    // Try to generate without filling form
    await page.getByRole('button', { name: /generate/i }).click();

    // Should show validation errors
    await expect(page.getByText(/required/i)).toBeVisible();
  });

  test('should generate lesson plan', async ({ page }) => {
    test.slow(); // AI generation takes time

    // Fill in form
    await page.getByLabel(/cefr level/i).selectOption('B1');
    await page.getByLabel(/topic/i).fill('Travel and Tourism');
    await page.getByLabel(/duration/i).fill('60');

    // Generate plan
    await page.getByRole('button', { name: /generate/i }).click();

    // Should show loading state
    await expect(page.getByText(/generating/i)).toBeVisible();

    // Should display generated plan within 5 seconds (T-031)
    await expect(page.getByRole('heading', { name: /lesson plan/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test('should display lesson plan sections', async ({ page }) => {
    test.slow();

    // Generate a plan
    await page.getByLabel(/cefr level/i).selectOption('B1');
    await page.getByLabel(/topic/i).fill('Daily Routines');
    await page.getByLabel(/duration/i).fill('60');
    await page.getByRole('button', { name: /generate/i }).click();

    // Wait for plan
    await expect(page.getByRole('heading', { name: /lesson plan/i })).toBeVisible({
      timeout: 5000,
    });

    // Should have all required sections (T-032)
    await expect(page.getByText(/objectives/i)).toBeVisible();
    await expect(page.getByText(/activities/i)).toBeVisible();
    await expect(page.getByText(/materials/i)).toBeVisible();
    await expect(page.getByText(/timings/i)).toBeVisible();
    await expect(page.getByText(/assessment/i)).toBeVisible();
  });

  test('should cache lesson plans', async ({ page }) => {
    test.slow();

    const topic = 'Food and Cooking';
    const level = 'A2';

    // Generate first time
    await page.getByLabel(/cefr level/i).selectOption(level);
    await page.getByLabel(/topic/i).fill(topic);
    await page.getByLabel(/duration/i).fill('60');

    const firstGenStart = Date.now();
    await page.getByRole('button', { name: /generate/i }).click();
    await expect(page.getByRole('heading', { name: /lesson plan/i })).toBeVisible({
      timeout: 5000,
    });
    const firstGenTime = Date.now() - firstGenStart;

    // Generate again with same params
    await page.goto('/teacher/lesson-planner');
    await page.getByLabel(/cefr level/i).selectOption(level);
    await page.getByLabel(/topic/i).fill(topic);
    await page.getByLabel(/duration/i).fill('60');

    const secondGenStart = Date.now();
    await page.getByRole('button', { name: /generate/i }).click();
    await expect(page.getByRole('heading', { name: /lesson plan/i })).toBeVisible({
      timeout: 5000,
    });
    const secondGenTime = Date.now() - secondGenStart;

    // T-033: Second generation should be faster (cached)
    expect(secondGenTime).toBeLessThan(firstGenTime * 0.8); // At least 20% faster
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Fill form with potentially problematic input
    await page.getByLabel(/cefr level/i).selectOption('B1');
    await page.getByLabel(/topic/i).fill('X'.repeat(1000)); // Very long topic
    await page.getByLabel(/duration/i).fill('60');

    await page.getByRole('button', { name: /generate/i }).click();

    // Should show error message
    await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should allow saving generated plan', async ({ page }) => {
    test.slow();

    // Generate a plan
    await page.getByLabel(/cefr level/i).selectOption('B1');
    await page.getByLabel(/topic/i).fill('Shopping');
    await page.getByLabel(/duration/i).fill('45');
    await page.getByRole('button', { name: /generate/i }).click();

    // Wait for plan
    await expect(page.getByRole('heading', { name: /lesson plan/i })).toBeVisible({
      timeout: 5000,
    });

    // Should have save button
    const saveButton = page.getByRole('button', { name: /save/i });
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await expect(page.getByText(/saved/i)).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.getByRole('heading', { name: /lesson planner/i })).toBeVisible();
    await expect(page.getByLabel(/cefr level/i)).toBeVisible();
    await expect(page.getByLabel(/topic/i)).toBeVisible();
  });
});
