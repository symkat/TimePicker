import { test, expect } from '@playwright/test';
import { createEvent } from './helpers.js';

test.describe('Creator Claim Link', () => {
  test('creator link is visible to event creator', async ({ page }) => {
    await createEvent(page, { title: 'Claim Link Test' });

    await expect(page.locator('text=Your creator link:')).toBeVisible();
    const codeBlock = page.locator('.bg-amber-50 code');
    await expect(codeBlock).toBeVisible();
    const linkText = await codeBlock.textContent();
    expect(linkText).toContain('/claim?token=');
  });

  test('creator link is hidden from non-creators', async ({ page, browser }) => {
    const url = await createEvent(page, { title: 'Hidden Link Test' });

    // Open in a new context (no session)
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    const shareToken = url.split('/events/')[1];
    await newPage.goto(`/events/${shareToken}`);

    await expect(newPage.locator('text=Your creator link:')).not.toBeVisible();
    await newContext.close();
  });

  test('creator link restores session in new browser', async ({ page, browser }) => {
    await createEvent(page, { title: 'Restore Session Test' });

    // Grab the claim URL from the page
    const claimUrl = await page.locator('.bg-amber-50 code').textContent();

    // Open in a new context (simulates different browser)
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();

    // Visit the claim link
    const urlPath = claimUrl.replace(/^https?:\/\/[^/]+/, '');
    await newPage.goto(urlPath);

    // Should be redirected to show page with creator access
    await expect(newPage.locator('text=Creator access restored')).toBeVisible();
    await expect(newPage.locator('a:has-text("Edit")')).toBeVisible();
    await expect(newPage.locator('text=Your creator link:')).toBeVisible();

    await newContext.close();
  });

  test('invalid creator token is rejected', async ({ page, browser }) => {
    const url = await createEvent(page, { title: 'Invalid Token Test' });
    const shareToken = url.split('/events/')[1];

    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    await newPage.goto(`/events/${shareToken}/claim?token=invalidtoken`);

    await expect(newPage.locator('text=Invalid creator link')).toBeVisible();
    await expect(newPage.locator('a:has-text("Edit")')).not.toBeVisible();

    await newContext.close();
  });
});
