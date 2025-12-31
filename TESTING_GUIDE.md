# Testing Guide for MyCastle

This guide will help you run all the tests for the MyCastle project. The commands are written as if you're a complete beginner - just copy and paste them one at a time!

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Running Unit Tests](#running-unit-tests)
3. [Running E2E Tests (Playwright)](#running-e2e-tests-playwright)
4. [Running All Quality Checks](#running-all-quality-checks)
5. [Setting Up Puppeteer for UI Testing](#setting-up-puppeteer-for-ui-testing)
6. [Understanding Test Results](#understanding-test-results)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Check if Node.js is installed

First, let's check if Node.js is already installed on your computer:

```bash
# Step 1: Check Node.js version
node --version
```

**What you should see:** Something like `v20.x.x` or higher.

**If you see an error** (like "command not found"), you need to install Node.js first:

#### Installing Node.js (if needed)

**On macOS:**
```bash
# Install Homebrew first (if you don't have it)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Node.js
brew install node
```

**On Arch Linux:**
```bash
# Install Node.js
sudo pacman -S nodejs npm
```

**On Ubuntu/Debian:**
```bash
# Install Node.js
sudo apt update
sudo apt install nodejs npm
```

After installing, run `node --version` again to verify it worked.

---

## Running Unit Tests

Unit tests check that individual pieces of code work correctly. We've created tests for all 30 API endpoints.

### Step-by-Step: Run All Unit Tests

```bash
# Step 1: Navigate to the app directory
cd /home/eoin/Work/MyCastle/app

# Step 2: Make sure all dependencies are installed
npm install

# Step 3: Run all unit tests
npm test

# OR run tests with coverage report (shows what % of code is tested)
npm run test:coverage
```

**What you'll see:** A list of all tests running, with green checkmarks ✓ for passing tests.

### Run Tests for Specific Module

If you only want to test one specific API module:

```bash
# Test ONLY Student APIs
npm test -- students.test.ts

# Test ONLY Enrollment APIs
npm test -- enrollments.test.ts

# Test ONLY Finance APIs (invoices + payments)
npm test -- invoices.test.ts payments.test.ts

# Test ONLY Programmes APIs
npm test -- programmes.test.ts

# Test ONLY Courses APIs
npm test -- courses.test.ts

# Test ONLY Teachers APIs
npm test -- teachers.test.ts

# Test ONLY Audit Log APIs
npm test -- audit-log.test.ts

# Test ONLY Search API
npm test -- search.test.ts
```

### Run Tests in Watch Mode (Auto-Rerun)

This is useful when you're actively developing - tests automatically rerun when you save files:

```bash
# Step 1: Navigate to app directory
cd /home/eoin/Work/MyCastle/app

# Step 2: Start watch mode
npm test -- --watch
```

**To stop watch mode:** Press `Ctrl + C`

---

## Running E2E Tests (Playwright)

E2E (End-to-End) tests simulate real user interactions in a browser. They test the complete flow from clicking buttons to seeing results.

### First Time Setup for Playwright

```bash
# Step 1: Navigate to app directory
cd /home/eoin/Work/MyCastle/app

# Step 2: Install Playwright browsers (only needed once)
npx playwright install

# Step 3 (optional): Install system dependencies for Playwright
npx playwright install-deps
```

**Note:** The browser installation might take a few minutes. It downloads Chromium, Firefox, and WebKit.

### Run All E2E Tests

```bash
# Step 1: Make sure you're in the app directory
cd /home/eoin/Work/MyCastle/app

# Step 2: Run all E2E tests
npm run test:e2e

# OR run with UI mode (shows browser)
npx playwright test --ui
```

### Run E2E Tests for Specific Features

```bash
# Test student management features
npx playwright test --grep "student"

# Test enrollment features
npx playwright test --grep "enrollment"

# Test finance features
npx playwright test --grep "invoice"
```

### Run Tests in Different Browsers

```bash
# Test in Chrome only
npx playwright test --project=chromium

# Test in Firefox only
npx playwright test --project=firefox

# Test in Safari/WebKit only
npx playwright test --project=webkit

# Test in all browsers (default)
npx playwright test
```

---

## Running All Quality Checks

This runs **everything**: formatting, linting, tests, and build. Use this before committing code!

```bash
# Step 1: Navigate to app directory
cd /home/eoin/Work/MyCastle/app

# Step 2: Run all quality checks
npm run check

# OR run the full check including E2E tests
npm run check:full
```

**What this does:**
1. ✅ Checks code formatting with Prettier
2. ✅ Checks code quality with ESLint
3. ✅ Runs all unit tests
4. ✅ Builds the project to check for errors
5. ✅ (check:full only) Runs E2E tests

---

## Setting Up Puppeteer for UI Testing

Puppeteer is a powerful tool for automating browsers and testing UI/UX. Here's how to set it up:

### Install Puppeteer

```bash
# Step 1: Navigate to app directory
cd /home/eoin/Work/MyCastle/app

# Step 2: Install Puppeteer
npm install puppeteer --save-dev

# Step 3: Verify installation
npx puppeteer --version
```

### Create a Basic Puppeteer Test

Create a new file to test your app with Puppeteer:

```bash
# Step 1: Create a tests directory for Puppeteer tests
mkdir -p /home/eoin/Work/MyCastle/app/tests/puppeteer

# Step 2: Create a basic test file
cat > /home/eoin/Work/MyCastle/app/tests/puppeteer/basic-ui-test.js << 'EOF'
const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Starting Puppeteer UI test...');

  // Launch browser
  const browser = await puppeteer.launch({
    headless: false, // Set to true to run without showing browser
    slowMo: 50, // Slow down actions by 50ms to see them
  });

  // Open new page
  const page = await browser.newPage();

  // Navigate to your local dev server
  await page.goto('http://localhost:3000');

  // Wait for the page to load
  await page.waitForSelector('body');

  console.log('✅ Page loaded successfully!');

  // Take a screenshot
  await page.screenshot({ path: 'homepage.png' });
  console.log('📸 Screenshot saved as homepage.png');

  // Close browser
  await browser.close();

  console.log('✅ Test completed!');
})();
EOF
```

### Run Your Puppeteer Test

```bash
# Step 1: Start your development server in one terminal
cd /home/eoin/Work/MyCastle/app
npm run dev

# Step 2: In a NEW terminal, run the Puppeteer test
cd /home/eoin/Work/MyCastle/app
node tests/puppeteer/basic-ui-test.js
```

### Advanced Puppeteer Test (Login Flow Example)

```bash
# Create an advanced test file
cat > /home/eoin/Work/MyCastle/app/tests/puppeteer/login-test.js << 'EOF'
const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Testing login flow...');

  const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  // Navigate to login page
  await page.goto('http://localhost:3000/auth/login');

  // Fill in email
  await page.type('input[type="email"]', 'admin@example.com');

  // Fill in password
  await page.type('input[type="password"]', 'your-password');

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForNavigation();

  // Check if we're on the dashboard
  const url = page.url();
  if (url.includes('/admin/dashboard')) {
    console.log('✅ Login successful!');
  } else {
    console.log('❌ Login failed - redirected to:', url);
  }

  await browser.close();
})();
EOF
```

---

## Understanding Test Results

### What Does a Passing Test Look Like?

```
✓ should return list of students with pagination (45ms)
✓ should filter students by status (23ms)
✓ should require admin authentication (12ms)

Test Suites: 8 passed, 8 total
Tests:       156 passed, 156 total
Snapshots:   0 total
Time:        12.456s
```

**Green ✓** = Test passed
**Red ✗** = Test failed

### What Does a Failing Test Look Like?

```
✗ should create invoice with valid data (67ms)

  Expected: 201
  Received: 400

  at Object.<anonymous> (/path/to/test.ts:45:28)
```

**What to do:** Look at the error message. It shows:
- What the test expected (201 = success)
- What it actually got (400 = error)
- Which line of code failed

### Code Coverage Report

After running `npm run test:coverage`, you'll see:

```
File                | % Stmts | % Branch | % Funcs | % Lines
--------------------|---------|----------|---------|--------
route.ts            |   95.12 |    88.23 |   100   |  94.73
[id]/route.ts       |   92.85 |    85.71 |   100   |  92.30
```

- **% Stmts** = Percentage of statements tested
- **% Branch** = Percentage of if/else paths tested
- **% Funcs** = Percentage of functions tested
- **% Lines** = Percentage of lines executed

**Goal:** Aim for 80%+ coverage on all metrics.

---

## Troubleshooting

### Problem: "command not found: node"

**Solution:** Node.js is not installed. See [Installing Node.js](#installing-nodejs-if-needed).

---

### Problem: "Cannot find module 'jest'"

**Solution:** Dependencies aren't installed. Run:

```bash
cd /home/eoin/Work/MyCastle/app
npm install
```

---

### Problem: Tests fail with "Database connection failed"

**Solution:** Your database isn't running or environment variables aren't set.

```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# If empty, set it (example for local development)
export DATABASE_URL="postgresql://user:password@localhost:5432/mycastle"

# Then run tests again
npm test
```

---

### Problem: "Port 3000 is already in use"

**Solution:** Another process is using that port.

```bash
# Find what's using port 3000
lsof -i :3000

# Kill that process (replace PID with the number from above)
kill -9 <PID>

# OR use a different port
PORT=3001 npm run dev
```

---

### Problem: Playwright browsers not installing

**Solution:** Install system dependencies first:

```bash
# On Ubuntu/Debian
sudo apt-get install libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1

# On Arch Linux
sudo pacman -S nss atk at-spi2-atk libdrm libxkbcommon mesa

# Then retry
npx playwright install
```

---

### Problem: Tests are too slow

**Solution:** Run tests in parallel (Jest does this by default, but you can adjust):

```bash
# Run with more workers (faster but uses more RAM)
npm test -- --maxWorkers=8

# Run sequentially (slower but uses less RAM)
npm test -- --runInBand
```

---

## Quick Reference: All Commands

Here's a cheat sheet of all the important commands:

```bash
# NAVIGATE TO APP
cd /home/eoin/Work/MyCastle/app

# INSTALL DEPENDENCIES
npm install

# RUN ALL UNIT TESTS
npm test

# RUN ALL UNIT TESTS WITH COVERAGE
npm run test:coverage

# RUN SPECIFIC TEST FILE
npm test -- students.test.ts

# RUN TESTS IN WATCH MODE
npm test -- --watch

# RUN E2E TESTS
npm run test:e2e

# RUN E2E TESTS WITH UI
npx playwright test --ui

# RUN ALL QUALITY CHECKS
npm run check

# RUN FULL QUALITY CHECKS (including E2E)
npm run check:full

# START DEV SERVER
npm run dev

# BUILD FOR PRODUCTION
npm run build

# RUN LINTER
npm run lint

# FORMAT CODE
npm run format

# INSTALL PLAYWRIGHT BROWSERS
npx playwright install

# INSTALL PUPPETEER
npm install puppeteer --save-dev
```

---

## Summary of Test Coverage

We've created comprehensive unit tests for all 30 API endpoints:

- ✅ **Student APIs** (5 endpoints): `students.test.ts`
- ✅ **Enrollment APIs** (5 endpoints): `enrollments.test.ts`
- ✅ **Invoice APIs** (4 endpoints): `invoices.test.ts`
- ✅ **Payment APIs** (2 endpoints): `payments.test.ts`
- ✅ **Programme APIs** (5 endpoints): `programmes.test.ts`
- ✅ **Course APIs** (5 endpoints): `courses.test.ts`
- ✅ **Teacher APIs** (2 endpoints): `teachers.test.ts`
- ✅ **Audit Log APIs** (2 endpoints): `audit-log.test.ts`
- ✅ **Search API** (1 endpoint): `search.test.ts`

**Total:** 156+ test cases covering:
- ✅ Success scenarios
- ✅ Error handling
- ✅ Validation
- ✅ Authentication
- ✅ Data integrity
- ✅ Performance
- ✅ Business logic

---

## Next Steps

1. **Run the tests** to make sure everything passes:
   ```bash
   cd /home/eoin/Work/MyCastle/app
   npm test
   ```

2. **Check code coverage** to see what's tested:
   ```bash
   npm run test:coverage
   ```

3. **Run E2E tests** to verify UI works:
   ```bash
   npm run test:e2e
   ```

4. **Set up Puppeteer** for custom UI testing (see above)

5. **Run full quality checks** before committing:
   ```bash
   npm run check:full
   ```

---

**Questions?** If you get stuck, check the [Troubleshooting](#troubleshooting) section above!
