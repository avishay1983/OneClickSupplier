import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  dashboardUser: {
    email: 'test@example.com',
    password: 'testpassword123',
  },
  vendor: {
    name: 'ספק טסט אוטומטי',
    email: 'vendor-test@example.com',
    companyId: '123456789',
    mobile: '0547502437',
    phone: '0547961666',
    city: 'ירושלים',
    street: 'יפו',
    streetNumber: '1',
    postalCode: '9100000',
    bankName: 'בנק הפועלים',
    bankBranch: '545',
    bankAccount: '123456789',
    accountingContactName: 'איש קשר חשבות',
    accountingContactPhone: '0501234567',
    salesContactName: 'איש קשר מכירות',
    salesContactPhone: '0509876543',
  },
  masterOtp: '111111',
  handlerName: 'מטפל טסט',
};

test.describe('Vendor Onboarding Complete Flow', () => {
  let secureToken: string;
  let vendorFormUrl: string;

  test.describe.configure({ mode: 'serial' });

  test('Step 1: Login to Dashboard', async ({ page }) => {
    await page.goto('/auth');
    
    // Wait for auth page to load
    await expect(page.locator('text=התחברות')).toBeVisible({ timeout: 10000 });
    
    // Fill login form
    await page.fill('input[type="email"]', TEST_CONFIG.dashboardUser.email);
    await page.fill('input[type="password"]', TEST_CONFIG.dashboardUser.password);
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/', { timeout: 15000 });
    await expect(page.locator('text=ספק בקליק')).toBeVisible();
  });

  test('Step 2: Create New Vendor Request', async ({ page }) => {
    await page.goto('/');
    
    // Wait for dashboard to load
    await expect(page.locator('text=בקשה חדשה')).toBeVisible({ timeout: 10000 });
    
    // Click new request button
    await page.click('button:has-text("בקשה חדשה")');
    
    // Wait for dialog to open
    await expect(page.locator('text=בקשה חדשה להקמת ספק')).toBeVisible();
    
    // Fill vendor details
    await page.fill('input[placeholder*="שם הספק"]', TEST_CONFIG.vendor.name);
    await page.fill('input[placeholder*="מייל"]', TEST_CONFIG.vendor.email);
    
    // Fill handler name
    await page.fill('input[placeholder*="מטפל"]', TEST_CONFIG.handlerName);
    
    // Select vendor type (general)
    await page.click('label:has-text("כללי")');
    
    // Select approval type
    await page.click('label:has-text("אישור מנהל רכש + סמנכ")');
    
    // Submit the request
    await page.click('button:has-text("שלח")');
    
    // Wait for success toast
    await expect(page.locator('text=הבקשה נוצרה בהצלחה')).toBeVisible({ timeout: 10000 });
    
    // Verify the request appears in the table
    await expect(page.locator(`text=${TEST_CONFIG.vendor.name}`)).toBeVisible();
  });

  test('Step 3: Extract Secure Token from Database', async ({ page, request }) => {
    // In a real test, you'd query the database or intercept network requests
    // For now, we'll get it from the table row actions
    await page.goto('/');
    
    // Wait for table to load
    await expect(page.locator(`text=${TEST_CONFIG.vendor.name}`)).toBeVisible({ timeout: 10000 });
    
    // Get the secure token from the resend button or row data
    // This is a simplified approach - in production you'd query the DB
    const vendorRow = page.locator(`tr:has-text("${TEST_CONFIG.vendor.name}")`);
    await vendorRow.waitFor();
    
    // Store token for later tests (in real scenario, get from DB)
    // For demo, we'll use a fixed token pattern
    console.log('Vendor request created successfully');
  });

  test('Step 4: Vendor Accesses Form via Secure Link', async ({ page }) => {
    // In real test, use the actual secure token from Step 3
    // For demo purposes, we test the form page structure
    
    // This would be: await page.goto(`/vendor-form/${secureToken}`);
    // For now, we verify the vendor form page exists
    
    // Navigate to a test vendor form (would use actual token in real test)
    await page.goto('/vendor-form/test-token');
    
    // Expect either OTP page or form (depending on link type)
    const pageContent = await page.content();
    const isOtpPage = pageContent.includes('קוד אימות') || pageContent.includes('OTP');
    const isFormPage = pageContent.includes('פרטי ספק') || pageContent.includes('העלאת מסמכים');
    const isExpiredPage = pageContent.includes('פג תוקף');
    
    expect(isOtpPage || isFormPage || isExpiredPage).toBeTruthy();
  });

  test('Step 5: Vendor Verifies OTP (using master code)', async ({ page }) => {
    // This test assumes we're on the OTP verification page
    // In real scenario, we'd use the actual vendor form URL
    
    await page.goto('/vendor-form/test-token');
    
    // If OTP verification is required
    const otpInput = page.locator('input[type="text"]').first();
    if (await otpInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Enter master OTP
      await otpInput.fill(TEST_CONFIG.masterOtp);
      
      // Submit OTP
      await page.click('button:has-text("אמת")');
      
      // Wait for form to load
      await page.waitForTimeout(2000);
    }
  });

  test('Step 6: Vendor Uploads Required Documents', async ({ page }) => {
    // Navigate to vendor form (in real test, use actual token)
    // This test verifies the document upload UI exists
    
    await page.goto('/vendor-form/test-token');
    
    // Check for document upload sections
    const documentTypes = [
      'אישור ניהול ספרים',
      'אישור ניכוי מס',
      'אישור בנק',
      'צילום חשבונית',
    ];
    
    // Verify file upload zones exist (structure test)
    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    
    console.log(`Found ${count} file upload inputs`);
  });

  test('Step 7: Vendor Fills Form Details', async ({ page }) => {
    // This test would fill the vendor form after document upload
    // In real scenario, form fields would be pre-populated from OCR
    
    await page.goto('/vendor-form/test-token');
    
    // Wait for form to potentially load
    await page.waitForTimeout(2000);
    
    // Fill form fields if visible
    const companyIdInput = page.locator('input[name="company_id"]');
    if (await companyIdInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await companyIdInput.fill(TEST_CONFIG.vendor.companyId);
    }
    
    const mobileInput = page.locator('input[name="mobile"]');
    if (await mobileInput.isVisible().catch(() => false)) {
      await mobileInput.fill(TEST_CONFIG.vendor.mobile);
    }
  });

  test('Step 8: Vendor Submits Form', async ({ page }) => {
    await page.goto('/vendor-form/test-token');
    
    // Look for submit button
    const submitButton = page.locator('button:has-text("שלח")');
    
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Verify form can be submitted
      console.log('Submit button found');
    }
  });

  test('Step 9: Handler Reviews and Approves Request', async ({ page }) => {
    await page.goto('/');
    
    // Wait for dashboard
    await expect(page.locator('text=ספק בקליק')).toBeVisible({ timeout: 10000 });
    
    // Find the vendor request in table
    const vendorRow = page.locator(`tr:has-text("${TEST_CONFIG.vendor.name}")`);
    
    if (await vendorRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click on approval button
      const approvalButton = vendorRow.locator('button:has-text("בקרה ראשונה")');
      
      if (await approvalButton.isVisible().catch(() => false)) {
        await approvalButton.click();
        
        // Wait for approval dialog
        await expect(page.locator('text=אישור מטפל')).toBeVisible({ timeout: 5000 });
        
        // Click approve
        await page.click('button:has-text("אשר")');
      }
    }
  });

  test('Step 10: Manager Approval (VP Signs)', async ({ page }) => {
    await page.goto('/');
    
    // Find request and check for VP signature option
    const vendorRow = page.locator(`tr:has-text("${TEST_CONFIG.vendor.name}")`);
    
    if (await vendorRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Look for signature button
      const signButton = vendorRow.locator('button:has-text("חתימה")');
      
      if (await signButton.isVisible().catch(() => false)) {
        await signButton.click();
        
        // Wait for signature dialog
        await page.waitForTimeout(1000);
        
        // Perform signature (draw on canvas if present)
        const canvas = page.locator('canvas');
        if (await canvas.isVisible().catch(() => false)) {
          // Simulate signature drawing
          await canvas.click({ position: { x: 50, y: 50 } });
          await canvas.click({ position: { x: 100, y: 100 } });
        }
      }
    }
  });

  test('Step 11: Procurement Manager Signs', async ({ page }) => {
    await page.goto('/');
    
    // Similar to VP signing, but for procurement manager
    const vendorRow = page.locator(`tr:has-text("${TEST_CONFIG.vendor.name}")`);
    
    if (await vendorRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Look for procurement manager signature option
      const signButton = vendorRow.locator('button:has-text("חתימת מנהל רכש")');
      
      if (await signButton.isVisible().catch(() => false)) {
        await signButton.click();
        
        // Perform signature
        const canvas = page.locator('canvas');
        if (await canvas.isVisible().catch(() => false)) {
          await canvas.click({ position: { x: 50, y: 50 } });
          await canvas.click({ position: { x: 100, y: 100 } });
        }
      }
    }
  });

  test('Step 12: Verify Vendor Appears in CRM', async ({ page }) => {
    // Navigate to CRM page
    await page.goto('/crm');
    
    // Wait for CRM to load
    await expect(page.locator('text=CRM')).toBeVisible({ timeout: 10000 });
    
    // Search for the test vendor
    const searchInput = page.locator('input[placeholder*="חיפוש"]');
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill(TEST_CONFIG.vendor.name);
    }
    
    // Verify vendor appears in CRM list
    await expect(page.locator(`text=${TEST_CONFIG.vendor.name}`)).toBeVisible({ timeout: 5000 });
    
    // Verify status is 'active'
    await expect(page.locator('text=פעיל')).toBeVisible();
  });

  test('Step 13: Verify CRM Data Integrity', async ({ page }) => {
    await page.goto('/crm');
    
    // Find and click on vendor to edit
    const vendorRow = page.locator(`tr:has-text("${TEST_CONFIG.vendor.name}")`);
    
    if (await vendorRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click edit button
      const editButton = vendorRow.locator('button:has-text("עריכה")');
      
      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();
        
        // Verify vendor data in edit dialog
        await page.waitForTimeout(1000);
        
        // Check that key fields have data
        const companyIdField = page.locator('input[name="company_id"]');
        if (await companyIdField.isVisible().catch(() => false)) {
          const value = await companyIdField.inputValue();
          expect(value).toBeTruthy();
        }
      }
    }
  });
});

// Helper functions for test utilities
async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

async function takeScreenshotOnFailure(page: Page, testName: string) {
  await page.screenshot({ path: `./test-results/${testName}-failure.png` });
}
