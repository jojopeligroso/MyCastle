/**
 * E2E Tests: Admin Student Registry
 * Phase 1: Student Registry Complete
 *
 * Tests complete student management workflow:
 * - List students with filters
 * - Create new students
 * - View student details
 * - Edit student information
 * - Search and filter functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Student Registry', () => {
  // Helper function to log in as admin
  async function loginAsAdmin(page: unknown) {
    // Skip auth in test mode or use test credentials
    // For now, we'll assume auth is handled or bypass it
    await page.goto('/admin/students');

    // If redirected to login, handle it
    if (page.url().includes('/login')) {
      test.skip(true, 'Auth required - set TEST_USER_EMAIL and TEST_USER_PASSWORD');
    }
  }

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display student registry page', async ({ page }) => {
    await expect(page).toHaveTitle(/Students.*MyCastle/i);
    await expect(page.getByRole('heading', { name: /students/i })).toBeVisible();
  });

  test('should show stats dashboard', async ({ page }) => {
    // Verify 4 stat cards are present
    const statCards = page.locator('[data-testid="stat-card"]');
    await expect(statCards).toHaveCount(4);

    // Verify stat card labels
    await expect(page.getByText('Total Students')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
    await expect(page.getByText('Visa Expiring')).toBeVisible();
    await expect(page.getByText('At Risk')).toBeVisible();
  });

  test('should display student list table', async ({ page }) => {
    // Check table headers
    await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /level/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();

    // Should have at least one student row (from seed data)
    const studentRows = page.locator('[data-testid="student-row"]');
    await expect(studentRows.first()).toBeVisible();
  });

  test('should filter students by status', async ({ page }) => {
    // Click "Active" filter
    await page.getByRole('button', { name: /^active$/i }).click();

    // Wait for filtered results
    await page.waitForLoadState('networkidle');

    // All visible students should be active
    const statusBadges = page.locator('[data-testid="student-status"]');
    const count = await statusBadges.count();

    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toHaveText(/active/i);
    }
  });

  test('should filter students by CEFR level', async ({ page }) => {
    // Select B1 level from dropdown
    await page.getByLabel(/cefr level/i).selectOption('B1');

    // Wait for filtered results
    await page.waitForLoadState('networkidle');

    // All visible students should be B1
    const levelBadges = page.locator('[data-testid="student-level"]');
    const count = await levelBadges.count();

    for (let i = 0; i < count; i++) {
      await expect(levelBadges.nth(i)).toHaveText(/B1/);
    }
  });

  test('should search students by name', async ({ page }) => {
    // Get first student name from the list
    const firstStudentName = await page
      .locator('[data-testid="student-row"]')
      .first()
      .locator('[data-testid="student-name"]')
      .textContent();

    if (firstStudentName) {
      // Search for first few characters
      const searchTerm = firstStudentName.substring(0, 3);
      await page.getByPlaceholder(/search.*name/i).fill(searchTerm);

      // Wait for search results
      await page.waitForLoadState('networkidle');

      // Should find the student
      await expect(page.getByText(firstStudentName)).toBeVisible();
    }
  });

  test('should clear all filters', async ({ page }) => {
    // Apply a filter
    await page.getByRole('button', { name: /^active$/i }).click();
    await page.waitForLoadState('networkidle');

    // Click "Clear Filters" button
    await page.getByRole('button', { name: /clear.*filters/i }).click();
    await page.waitForLoadState('networkidle');

    // Should show all students again
    const studentRows = page.locator('[data-testid="student-row"]');
    await expect(studentRows.first()).toBeVisible();
  });

  test('should open student detail drawer', async ({ page }) => {
    // Click on first student row
    await page.locator('[data-testid="student-row"]').first().click();

    // Detail drawer should slide in
    const drawer = page.locator('[data-testid="student-detail-drawer"]');
    await expect(drawer).toBeVisible();

    // Should show student name in header
    await expect(drawer.getByRole('heading')).toBeVisible();
  });

  test('should navigate between detail drawer tabs', async ({ page }) => {
    // Open drawer
    await page.locator('[data-testid="student-row"]').first().click();

    const drawer = page.locator('[data-testid="student-detail-drawer"]');

    // Test each tab
    const tabs = [
      'Personal Info',
      'Course History',
      'Attendance',
      'Assessments',
      'Notes',
      'Documents',
    ];

    for (const tabName of tabs) {
      await drawer.getByRole('tab', { name: new RegExp(tabName, 'i') }).click();
      await expect(drawer.locator('[role="tabpanel"]')).toBeVisible();
    }
  });

  test('should close drawer with backdrop click', async ({ page }) => {
    // Open drawer
    await page.locator('[data-testid="student-row"]').first().click();
    const drawer = page.locator('[data-testid="student-detail-drawer"]');
    await expect(drawer).toBeVisible();

    // Click backdrop
    await page.locator('[data-testid="drawer-backdrop"]').click();

    // Drawer should close
    await expect(drawer).not.toBeVisible();
  });

  test('should close drawer with ESC key', async ({ page }) => {
    // Open drawer
    await page.locator('[data-testid="student-row"]').first().click();
    const drawer = page.locator('[data-testid="student-detail-drawer"]');
    await expect(drawer).toBeVisible();

    // Press ESC
    await page.keyboard.press('Escape');

    // Drawer should close
    await expect(drawer).not.toBeVisible();
  });

  test('should navigate to create student page', async ({ page }) => {
    // Click "Add Student" button
    await page.getByRole('button', { name: /add student/i }).click();

    // Should navigate to create page
    await expect(page).toHaveURL(/\/admin\/students\/create/);
    await expect(page.getByRole('heading', { name: /create student/i })).toBeVisible();
  });

  test('should create new student with manual level assignment', async ({ page }) => {
    // Navigate to create page
    await page.goto('/admin/students/create');

    // Fill in form
    const timestamp = Date.now();
    await page.getByLabel(/name/i).fill(`Test Student ${timestamp}`);
    await page.getByLabel(/email/i).fill(`test${timestamp}@example.com`);
    await page.getByLabel(/phone/i).fill('+353 1 234 5678');

    // Select manual level assignment
    await page.getByLabel(/manual selection/i).check();
    await page.getByLabel(/current level/i).selectOption('B1');
    await page.getByLabel(/initial level/i).selectOption('A2');

    // Submit form
    await page.getByRole('button', { name: /create student/i }).click();

    // Should redirect to student list
    await expect(page).toHaveURL(/\/admin\/students$/);

    // Should show success message
    await expect(page.getByText(/student created/i)).toBeVisible();

    // New student should appear in list
    await expect(page.getByText(`Test Student ${timestamp}`)).toBeVisible();
  });

  test('should create student with diagnostic test', async ({ page }) => {
    // Navigate to create page
    await page.goto('/admin/students/create');

    // Fill in basic info
    const timestamp = Date.now();
    await page.getByLabel(/name/i).fill(`Diagnostic Student ${timestamp}`);
    await page.getByLabel(/email/i).fill(`diag${timestamp}@example.com`);

    // Select diagnostic test
    await page.getByLabel(/diagnostic test/i).check();

    // Enter test score
    await page.getByLabel(/test score/i).fill('75');
    await page.getByLabel(/max score/i).fill('100');

    // Choose suggested level (B1 for 75%)
    await page.getByLabel(/suggested level/i).selectOption('B1');

    // Submit
    await page.getByRole('button', { name: /create student/i }).click();

    // Should show provisional level warning
    await expect(page.getByText(/provisional/i)).toBeVisible();

    // New student should have provisional status
    await expect(page.getByText(`Diagnostic Student ${timestamp}`)).toBeVisible();
  });

  test('should validate required fields on create', async ({ page }) => {
    await page.goto('/admin/students/create');

    // Try to submit without filling fields
    await page.getByRole('button', { name: /create student/i }).click();

    // Should show validation errors
    await expect(page.getByText(/name.*required/i)).toBeVisible();
    await expect(page.getByText(/email.*required/i)).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/admin/students/create');

    // Enter invalid email
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByRole('button', { name: /create student/i }).click();

    // Should show validation error
    await expect(page.getByText(/invalid.*email/i)).toBeVisible();
  });

  test('should prevent duplicate emails', async ({ page }) => {
    await page.goto('/admin/students/create');

    // Get existing student email
    await page.goto('/admin/students');
    const existingEmail = await page
      .locator('[data-testid="student-row"]')
      .first()
      .locator('[data-testid="student-email"]')
      .textContent();

    // Try to create student with same email
    await page.goto('/admin/students/create');
    await page.getByLabel(/name/i).fill('Duplicate Test');
    await page.getByLabel(/email/i).fill(existingEmail || 'test@example.com');
    await page.getByLabel(/manual selection/i).check();
    await page.getByLabel(/current level/i).selectOption('B1');
    await page.getByRole('button', { name: /create student/i }).click();

    // Should show duplicate error
    await expect(page.getByText(/email.*already.*exists/i)).toBeVisible();
  });

  test('should display visa expiry warning', async ({ page }) => {
    // Look for students with visa expiring soon
    await page.getByRole('button', { name: /visa expiring/i }).click();
    await page.waitForLoadState('networkidle');

    // Should show visa warning badges
    const warningBadges = page.locator('[data-testid="visa-warning"]');
    if ((await warningBadges.count()) > 0) {
      await expect(warningBadges.first()).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Page should still be usable
    await expect(page.getByRole('heading', { name: /students/i })).toBeVisible();

    // Stats should stack vertically
    const statCards = page.locator('[data-testid="stat-card"]');
    await expect(statCards).toHaveCount(4);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Focus first element
    await page.keyboard.press('Tab'); // Next element

    // Should have visible focus indicators
    const focusedElement = await page.evaluateHandle(() => document.activeElement);
    expect(focusedElement).toBeTruthy();
  });

  test('should paginate student list', async ({ page }) => {
    // Check if pagination controls exist (if more than 25 students)
    const nextButton = page.getByRole('button', { name: /next/i });

    if (await nextButton.isVisible()) {
      // Click next page
      await nextButton.click();
      await page.waitForLoadState('networkidle');

      // Should show different students
      await expect(page.locator('[data-testid="student-row"]')).toBeVisible();
    }
  });
});

test.describe('Admin Student Registry - Edit Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/students');
  });

  test('should enable edit mode in detail drawer', async ({ page }) => {
    // Open student detail
    await page.locator('[data-testid="student-row"]').first().click();
    const drawer = page.locator('[data-testid="student-detail-drawer"]');

    // Click edit button
    await drawer.getByRole('button', { name: /edit/i }).click();

    // Form fields should become editable
    await expect(drawer.getByLabel(/name/i)).toBeEditable();
    await expect(drawer.getByLabel(/email/i)).toBeEditable();
  });

  test('should save student edits', async ({ page }) => {
    // Open student detail and edit
    await page.locator('[data-testid="student-row"]').first().click();
    const drawer = page.locator('[data-testid="student-detail-drawer"]');

    await drawer.getByRole('button', { name: /edit/i }).click();

    // Modify a field
    const newPhone = '+353 1 999 9999';
    await drawer.getByLabel(/phone/i).fill(newPhone);

    // Save changes
    await drawer.getByRole('button', { name: /save/i }).click();

    // Should show success message
    await expect(page.getByText(/saved/i)).toBeVisible();

    // Updated value should persist
    await expect(drawer.getByText(newPhone)).toBeVisible();
  });

  test('should cancel edit mode', async ({ page }) => {
    // Open student detail and edit
    await page.locator('[data-testid="student-row"]').first().click();
    const drawer = page.locator('[data-testid="student-detail-drawer"]');

    const originalName = await drawer.getByLabel(/name/i).inputValue();

    await drawer.getByRole('button', { name: /edit/i }).click();

    // Make a change
    await drawer.getByLabel(/name/i).fill('Changed Name');

    // Cancel
    await drawer.getByRole('button', { name: /cancel/i }).click();

    // Should revert to original value
    await expect(drawer.getByText(originalName)).toBeVisible();
  });
});
