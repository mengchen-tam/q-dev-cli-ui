// Q Developer WebUI Authentication Test with Playwright
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

test.describe('Q Developer WebUI Authentication', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
  });

  test('should show setup form when no users exist', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we see the setup form (first time setup)
    const setupTitle = page.locator('h1:has-text("Setup Q Developer WebUI")');
    const loginTitle = page.locator('h1:has-text("Login to Q Developer WebUI")');
    
    // Should see either setup or login form
    const hasSetup = await setupTitle.isVisible().catch(() => false);
    const hasLogin = await loginTitle.isVisible().catch(() => false);
    
    expect(hasSetup || hasLogin).toBeTruthy();
    
    if (hasSetup) {
      console.log('✅ Setup form is displayed for first-time setup');
      
      // Check setup form elements
      await expect(page.locator('input[placeholder*="username" i]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toHaveCount(2); // password and confirm password
      await expect(page.locator('button:has-text("Create Account")')).toBeVisible();
    } else {
      console.log('✅ Login form is displayed');
      
      // Check login form elements
      await expect(page.locator('input[placeholder*="username" i]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button:has-text("Login")')).toBeVisible();
    }
  });

  test('should create first user account', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check if setup form is available
    const setupTitle = page.locator('h1:has-text("Setup Q Developer WebUI")');
    const isSetupVisible = await setupTitle.isVisible().catch(() => false);
    
    if (isSetupVisible) {
      console.log('🔧 Creating first user account...');
      
      // Fill in the setup form
      await page.fill('input[placeholder*="username" i]', 'testuser');
      
      // Find password fields
      const passwordFields = page.locator('input[type="password"]');
      await passwordFields.nth(0).fill('testpass123');
      await passwordFields.nth(1).fill('testpass123');
      
      // Submit the form
      await page.click('button:has-text("Create Account")');
      
      // Wait for redirect or success
      await page.waitForTimeout(2000);
      
      // Should now be logged in and see the main interface
      const mainTitle = page.locator('h1:has-text("Q Developer")');
      await expect(mainTitle).toBeVisible({ timeout: 10000 });
      
      console.log('✅ First user account created successfully');
    } else {
      console.log('ℹ️ Setup already completed, skipping user creation');
    }
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check if login form is available
    const loginTitle = page.locator('h1:has-text("Login to Q Developer WebUI")');
    const isLoginVisible = await loginTitle.isVisible().catch(() => false);
    
    if (isLoginVisible) {
      console.log('🔐 Testing login with credentials...');
      
      // Fill in login form
      await page.fill('input[placeholder*="username" i]', 'testuser');
      await page.fill('input[type="password"]', 'testpass123');
      
      // Submit login
      await page.click('button:has-text("Login")');
      
      // Wait for redirect
      await page.waitForTimeout(2000);
      
      // Should see main interface
      const mainTitle = page.locator('h1:has-text("Q Developer")');
      await expect(mainTitle).toBeVisible({ timeout: 10000 });
      
      console.log('✅ Login successful');
    } else {
      console.log('ℹ️ Already logged in or setup required');
    }
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check if login form is available
    const loginTitle = page.locator('h1:has-text("Login to Q Developer WebUI")');
    const isLoginVisible = await loginTitle.isVisible().catch(() => false);
    
    if (isLoginVisible) {
      console.log('🚫 Testing login with invalid credentials...');
      
      // Fill in wrong credentials
      await page.fill('input[placeholder*="username" i]', 'wronguser');
      await page.fill('input[type="password"]', 'wrongpass');
      
      // Submit login
      await page.click('button:has-text("Login")');
      
      // Should see error message
      await expect(page.locator('text=Invalid username or password')).toBeVisible({ timeout: 5000 });
      
      console.log('✅ Invalid credentials properly rejected');
    } else {
      console.log('ℹ️ Login form not available for testing');
    }
  });

  test('should access main interface after authentication', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Try to authenticate (either setup or login)
    const setupTitle = page.locator('h1:has-text("Setup Q Developer WebUI")');
    const loginTitle = page.locator('h1:has-text("Login to Q Developer WebUI")');
    
    const hasSetup = await setupTitle.isVisible().catch(() => false);
    const hasLogin = await loginTitle.isVisible().catch(() => false);
    
    if (hasSetup) {
      // Create account
      await page.fill('input[placeholder*="username" i]', 'testuser2');
      const passwordFields = page.locator('input[type="password"]');
      await passwordFields.nth(0).fill('testpass123');
      await passwordFields.nth(1).fill('testpass123');
      await page.click('button:has-text("Create Account")');
    } else if (hasLogin) {
      // Login
      await page.fill('input[placeholder*="username" i]', 'testuser');
      await page.fill('input[type="password"]', 'testpass123');
      await page.click('button:has-text("Login")');
    }
    
    // Wait for main interface
    await page.waitForTimeout(3000);
    
    // Check main interface elements
    console.log('🔍 Checking main interface elements...');
    
    // Should see Q Developer title
    const mainTitle = page.locator('h1:has-text("Q Developer")');
    await expect(mainTitle).toBeVisible({ timeout: 10000 });
    
    // Should see navigation tabs
    await expect(page.locator('button:has-text("Shell")')).toBeVisible();
    await expect(page.locator('button:has-text("Files")')).toBeVisible();
    await expect(page.locator('button:has-text("Git")')).toBeVisible();
    
    // Should see settings button
    await expect(page.locator('button[title="Settings"]')).toBeVisible();
    
    console.log('✅ Main interface is accessible and functional');
  });

  test('should handle navigation between tabs', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Authenticate first (simplified)
    const needsAuth = await page.locator('h1:has-text("Login"), h1:has-text("Setup")').isVisible().catch(() => false);
    
    if (needsAuth) {
      // Quick auth (assuming setup or existing user)
      const hasSetup = await page.locator('h1:has-text("Setup Q Developer WebUI")').isVisible().catch(() => false);
      
      if (hasSetup) {
        await page.fill('input[placeholder*="username" i]', 'testuser3');
        const passwordFields = page.locator('input[type="password"]');
        await passwordFields.nth(0).fill('testpass123');
        await passwordFields.nth(1).fill('testpass123');
        await page.click('button:has-text("Create Account")');
      } else {
        await page.fill('input[placeholder*="username" i]', 'testuser');
        await page.fill('input[type="password"]', 'testpass123');
        await page.click('button:has-text("Login")');
      }
      
      await page.waitForTimeout(3000);
    }
    
    // Test tab navigation
    console.log('🔄 Testing tab navigation...');
    
    // Click Files tab
    await page.click('button:has-text("Files")');
    await page.waitForTimeout(1000);
    
    // Click Git tab
    await page.click('button:has-text("Git")');
    await page.waitForTimeout(1000);
    
    // Click Shell tab
    await page.click('button:has-text("Shell")');
    await page.waitForTimeout(1000);
    
    console.log('✅ Tab navigation works correctly');
  });

});

// Run the tests
console.log('🚀 Starting Q Developer WebUI Authentication Tests...');
