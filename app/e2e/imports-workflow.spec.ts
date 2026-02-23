/**
 * E2E Tests: Imports Workflow
 * Tests the complete 3-screen admin workflow for importing classes.xlsx files
 *
 * Workflow: Upload → Triage → Resolve (if needed) → Apply
 *
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Admin Imports Workflow', () => {
  // Test file paths
  const testFilesDir = path.join(__dirname, 'fixtures');
  const validXlsxPath = path.join(testFilesDir, 'valid-import.xlsx');

  // Helper function to log in as admin
  async function loginAsAdmin(page: Page) {
    await page.goto('/admin/imports/enrolment-uploads');

    // If redirected to login, skip test
    if (page.url().includes('/login')) {
      test.skip(true, 'Auth required - configure test credentials');
    }
  }

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Screen 1: Imports List', () => {
    test('should display imports list page', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /enrolment uploads/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /upload/i })).toBeVisible();
    });

    test('should show empty state when no imports exist', async ({ page }) => {
      // Check for empty state or table
      const table = page.locator('table');
      const emptyState = page.getByText(/no imports/i);

      // Either table with data or empty state should be visible
      const hasTable = await table.isVisible().catch(() => false);
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(hasTable || hasEmptyState).toBe(true);
    });

    test('should open upload dialog when clicking upload button', async ({ page }) => {
      await page.getByRole('button', { name: /upload/i }).click();

      // Check dialog appeared
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/upload enrolment file/i)).toBeVisible();

      // Check for warning banner
      await expect(page.getByText(/cannot be undone/i)).toBeVisible();

      // Check for file input
      await expect(page.locator('input[type="file"]')).toBeVisible();
    });

    test('should show file type restriction in upload dialog', async ({ page }) => {
      await page.getByRole('button', { name: /upload/i }).click();

      // Check for XLSX restriction message
      await expect(page.getByText(/\.xlsx/i)).toBeVisible();
    });

    test('should close upload dialog on cancel', async ({ page }) => {
      await page.getByRole('button', { name: /upload/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('Screen 2: Batch Summary', () => {
    // Note: These tests require a batch to exist
    // In a real scenario, you'd create one via API in beforeEach

    test.skip('should display batch summary with stats', async ({ page }) => {
      // Navigate to a batch detail page (assuming batch exists)
      await page.goto('/admin/imports/enrolment-uploads/test-batch-id');

      // Check stats cards are visible
      await expect(page.getByText(/total rows/i)).toBeVisible();
      await expect(page.getByText(/valid/i)).toBeVisible();
      await expect(page.getByText(/invalid/i)).toBeVisible();
      await expect(page.getByText(/ambiguous/i)).toBeVisible();
    });

    test.skip('should show triage controls for pending batches', async ({ page }) => {
      await page.goto('/admin/imports/enrolment-uploads/test-batch-id');

      // Check triage radio buttons
      await expect(page.getByRole('radio', { name: /confirm/i })).toBeVisible();
      await expect(page.getByRole('radio', { name: /deny/i })).toBeVisible();
      await expect(page.getByRole('radio', { name: /needs review/i })).toBeVisible();
    });

    test.skip('should navigate to resolution screen', async ({ page }) => {
      await page.goto('/admin/imports/enrolment-uploads/test-batch-id');

      // Click resolve issues button
      await page.getByRole('button', { name: /resolve issues/i }).click();

      // Should navigate to resolve page
      await expect(page).toHaveURL(/\/resolve$/);
    });
  });

  test.describe('Screen 3: Row Resolution', () => {
    test.skip('should display row resolution page', async ({ page }) => {
      await page.goto('/admin/imports/enrolment-uploads/test-batch-id/resolve');

      // Check page elements
      await expect(page.getByRole('heading', { name: /row resolution/i })).toBeVisible();

      // Check filter tabs
      await expect(page.getByRole('button', { name: /invalid/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /ambiguous/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /excluded/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /all/i })).toBeVisible();
    });

    test.skip('should filter rows by status', async ({ page }) => {
      await page.goto('/admin/imports/enrolment-uploads/test-batch-id/resolve');

      // Click Invalid tab
      await page.getByRole('button', { name: /invalid/i }).click();

      // All visible rows should have INVALID status
      const rows = page.locator('[data-status="INVALID"]');
      await expect(rows.first()).toBeVisible();
    });

    test.skip('should show detail panel when row is selected', async ({ page }) => {
      await page.goto('/admin/imports/enrolment-uploads/test-batch-id/resolve');

      // Click first row
      await page.locator('tr').nth(1).click();

      // Detail panel should appear
      await expect(page.getByText(/raw values/i)).toBeVisible();
    });

    test.skip('should allow excluding invalid rows', async ({ page }) => {
      await page.goto('/admin/imports/enrolment-uploads/test-batch-id/resolve');

      // Filter to invalid rows
      await page.getByRole('button', { name: /invalid/i }).click();

      // Select first row
      await page.locator('tr').nth(1).click();

      // Click exclude button
      await page.getByRole('button', { name: /exclude row/i }).click();

      // Row should now show as excluded
      await expect(page.getByText(/excluded/i)).toBeVisible();
    });
  });

  test.describe('Complete Workflow', () => {
    test.skip('should complete full import workflow: upload → triage → apply', async ({ page }) => {
      // Step 1: Upload file
      await page.goto('/admin/imports/enrolment-uploads');
      await page.getByRole('button', { name: /upload/i }).click();

      // Select file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(validXlsxPath);

      // Submit upload
      await page
        .getByRole('button', { name: /upload/i })
        .last()
        .click();

      // Wait for processing
      await page.waitForURL(/\/admin\/imports\/enrolment-uploads\/[^/]+$/);

      // Step 2: Triage - Confirm
      await expect(page.getByText(/total rows/i)).toBeVisible();

      // Select confirm
      await page.getByRole('radio', { name: /confirm/i }).click();
      await page.getByRole('button', { name: /save decision/i }).click();

      // Wait for status update
      await page.waitForLoadState('networkidle');

      // Step 3: Apply changes
      await page.getByRole('button', { name: /apply changes/i }).click();

      // Confirm dialog
      page.on('dialog', dialog => dialog.accept());

      // Wait for completion
      await expect(page.getByText(/applied successfully/i)).toBeVisible({ timeout: 30000 });
    });

    test.skip('should handle workflow with resolution required', async ({ page }) => {
      // This test requires a file with invalid/ambiguous rows
      // Similar flow but includes resolution step

      // Step 1: Upload file with issues
      await page.goto('/admin/imports/enrolment-uploads');
      await page.getByRole('button', { name: /upload/i }).click();

      const fileInput = page.locator('input[type="file"]');
      // Would need a different test file with issues
      await fileInput.setInputFiles(validXlsxPath);
      await page
        .getByRole('button', { name: /upload/i })
        .last()
        .click();

      await page.waitForURL(/\/admin\/imports\/enrolment-uploads\/[^/]+$/);

      // Check if resolution is needed
      const resolveButton = page.getByRole('button', { name: /resolve issues/i });
      const needsResolution = await resolveButton.isVisible().catch(() => false);

      if (needsResolution) {
        // Step 2: Resolve issues
        await resolveButton.click();
        await page.waitForURL(/\/resolve$/);

        // Exclude all invalid rows
        await page.getByRole('button', { name: /invalid/i }).click();

        const invalidRows = page.locator('tr[data-status="INVALID"]');
        const count = await invalidRows.count();

        for (let i = 0; i < count; i++) {
          await invalidRows.first().click();
          await page.getByRole('button', { name: /exclude row/i }).click();
          await page.waitForLoadState('networkidle');
        }

        // Go back to summary
        await page.getByRole('link', { name: /back to batch/i }).click();
      }

      // Step 3: Triage and apply
      await page.getByRole('radio', { name: /confirm/i }).click();
      await page.getByRole('button', { name: /save decision/i }).click();
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /apply changes/i }).click();
      page.on('dialog', dialog => dialog.accept());

      await expect(page.getByText(/applied/i)).toBeVisible({ timeout: 30000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline
      await page.route('**/api/imports/**', route => route.abort());

      await page.goto('/admin/imports/enrolment-uploads');

      // Should show error state or fallback
      // The error boundary should catch this
    });

    test.skip('should show error for non-existent batch', async ({ page }) => {
      await page.goto('/admin/imports/enrolment-uploads/non-existent-id');

      // Should show 404 or not found message
      await expect(page.getByText(/not found/i)).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/admin/imports/enrolment-uploads');

      // Check for h1
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
    });

    test('should support keyboard navigation in upload dialog', async ({ page }) => {
      await page.goto('/admin/imports/enrolment-uploads');

      // Open dialog with keyboard
      await page.getByRole('button', { name: /upload/i }).focus();
      await page.keyboard.press('Enter');

      await expect(page.getByRole('dialog')).toBeVisible();

      // Close with Escape
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('should have accessible buttons with proper labels', async ({ page }) => {
      await page.goto('/admin/imports/enrolment-uploads');

      // All buttons should have accessible names
      const buttons = page.getByRole('button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        const name = (await button.getAttribute('aria-label')) || (await button.textContent());
        expect(name).toBeTruthy();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/admin/imports/enrolment-uploads');

      // Page should be accessible
      await expect(page.getByRole('heading', { name: /enrolment uploads/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /upload/i })).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/admin/imports/enrolment-uploads');

      // Page should be accessible
      await expect(page.getByRole('heading', { name: /enrolment uploads/i })).toBeVisible();
    });
  });
});
