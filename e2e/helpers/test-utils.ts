import { Page, expect } from '@playwright/test';
import { testDashboardUser, masterOtpCode } from '../fixtures/test-data';

/**
 * Login to dashboard with test credentials
 */
export async function loginToDashboard(page: Page) {
  await page.goto('/auth');
  
  // Wait for auth page
  await expect(page.locator('text=התחברות')).toBeVisible({ timeout: 10000 });
  
  // Fill credentials
  await page.fill('input[type="email"]', testDashboardUser.email);
  await page.fill('input[type="password"]', testDashboardUser.password);
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for dashboard
  await expect(page).toHaveURL('/', { timeout: 15000 });
}

/**
 * Create a new vendor request via dashboard
 */
export async function createVendorRequest(page: Page, vendorData: {
  name: string;
  email: string;
  handlerName: string;
  vendorType?: 'general' | 'claims';
  approvalType?: 'procurement_only' | 'procurement_and_vp';
}) {
  await page.goto('/');
  
  // Open new request dialog
  await page.click('button:has-text("בקשה חדשה")');
  await expect(page.locator('text=בקשה חדשה להקמת ספק')).toBeVisible();
  
  // Fill form
  await page.fill('input[placeholder*="שם הספק"]', vendorData.name);
  await page.fill('input[placeholder*="מייל"]', vendorData.email);
  await page.fill('input[placeholder*="מטפל"]', vendorData.handlerName);
  
  // Select vendor type
  if (vendorData.vendorType === 'claims') {
    await page.click('label:has-text("תביעות")');
  } else {
    await page.click('label:has-text("כללי")');
  }
  
  // Select approval type
  if (vendorData.approvalType === 'procurement_only') {
    await page.click('label:has-text("אישור מנהל רכש בלבד")');
  } else {
    await page.click('label:has-text("אישור מנהל רכש + סמנכ")');
  }
  
  // Submit
  await page.click('button:has-text("שלח")');
  
  // Wait for success
  await expect(page.locator('text=הבקשה נוצרה בהצלחה')).toBeVisible({ timeout: 10000 });
}

/**
 * Verify OTP using master code
 */
export async function verifyOtpWithMasterCode(page: Page) {
  const otpInput = page.locator('input').first();
  
  if (await otpInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await otpInput.fill(masterOtpCode);
    await page.click('button:has-text("אמת")');
    await page.waitForTimeout(2000);
    return true;
  }
  return false;
}

/**
 * Fill vendor form with test data
 */
export async function fillVendorForm(page: Page, vendorData: {
  companyId: string;
  mobile: string;
  city: string;
  street: string;
  streetNumber: string;
  bankName: string;
  bankBranch: string;
  bankAccount: string;
}) {
  // Fill each field if visible
  const fields = [
    { selector: 'input[name="company_id"]', value: vendorData.companyId },
    { selector: 'input[name="mobile"]', value: vendorData.mobile },
    { selector: 'input[name="street_number"]', value: vendorData.streetNumber },
    { selector: 'input[name="bank_account_number"]', value: vendorData.bankAccount },
  ];
  
  for (const field of fields) {
    const input = page.locator(field.selector);
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill(field.value);
    }
  }
}

/**
 * Upload test document
 */
export async function uploadDocument(page: Page, fileInputIndex: number, filePath: string) {
  const fileInputs = page.locator('input[type="file"]');
  const input = fileInputs.nth(fileInputIndex);
  
  if (await input.isVisible().catch(() => false)) {
    await input.setInputFiles(filePath);
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

/**
 * Approve request as handler
 */
export async function approveAsHandler(page: Page, vendorName: string) {
  await page.goto('/');
  
  const vendorRow = page.locator(`tr:has-text("${vendorName}")`);
  const approvalButton = vendorRow.locator('button:has-text("בקרה ראשונה")');
  
  if (await approvalButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await approvalButton.click();
    await expect(page.locator('text=אישור מטפל')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("אשר")');
    return true;
  }
  return false;
}

/**
 * Sign contract in dialog
 */
export async function signContract(page: Page) {
  const canvas = page.locator('canvas');
  
  if (await canvas.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Draw a simple signature
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 80);
      await page.mouse.move(box.x + 150, box.y + 50);
      await page.mouse.up();
    }
    
    // Click save/confirm button
    const saveButton = page.locator('button:has-text("שמור חתימה")');
    if (await saveButton.isVisible().catch(() => false)) {
      await saveButton.click();
    }
    return true;
  }
  return false;
}

/**
 * Navigate to CRM and verify vendor exists
 */
export async function verifyVendorInCrm(page: Page, vendorName: string) {
  await page.goto('/crm');
  await expect(page.locator('text=CRM')).toBeVisible({ timeout: 10000 });
  
  const searchInput = page.locator('input[placeholder*="חיפוש"]');
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill(vendorName);
  }
  
  const vendorExists = await page.locator(`text=${vendorName}`).isVisible({ timeout: 5000 }).catch(() => false);
  return vendorExists;
}

/**
 * Wait for network requests to complete
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // Continue even if timeout - some requests may be long-polling
  }
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ 
    path: `./test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true 
  });
}

/**
 * Check if element is visible with retry
 */
export async function isVisibleWithRetry(page: Page, selector: string, retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    if (await page.locator(selector).isVisible().catch(() => false)) {
      return true;
    }
    await page.waitForTimeout(1000);
  }
  return false;
}
