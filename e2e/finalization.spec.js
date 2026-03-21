import { test, expect } from '@playwright/test';
import { createEvent } from './helpers.js';

async function finalizeFirstSlot(page) {
  await page.locator('#finalize button[type="submit"]').first().click();
  await expect(page.locator('h2:has-text("Event Finalized")')).toBeVisible({ timeout: 10000 });
}

async function submitResponse(page, name) {
  await page.fill('input[name="respondent[name]"]', name);
  await page.locator('input[name="respondent[time_slot_ids][]"]').first().check();
  await page.click('button:has-text("Submit Response")');
  await expect(page.locator(`text=Thanks, ${name}!`)).toBeVisible();
}

test.describe('Event Finalization', () => {
  test('creator sees finalize section after responses', async ({ page }) => {
    await createEvent(page, { title: 'Finalize Test', timeSlots: 2 });
    await submitResponse(page, 'Alice');
    await expect(page.locator('h2:has-text("Choose a Date")')).toBeVisible();
  });

  test('creator can finalize an event', async ({ page }) => {
    await createEvent(page, { title: 'Finalize Flow', timeSlots: 2 });
    await submitResponse(page, 'Bob');
    await finalizeFirstSlot(page);

    await expect(page.locator('text=Download .ics')).toBeVisible();
    await expect(page.locator('text=Add to Google Calendar')).toBeVisible();
    await expect(page.locator('h2:has-text("Add Your Response")')).not.toBeVisible();
    await expect(page.locator('text=no longer accepting new responses')).toBeVisible();
  });

  test('creator can unfinalize an event', async ({ page }) => {
    await createEvent(page, { title: 'Unfinalize Test', timeSlots: 1 });
    await submitResponse(page, 'Carol');
    await finalizeFirstSlot(page);

    await page.locator('button:has-text("Reopen Event")').click();
    await expect(page.locator('text=Event reopened')).toBeVisible();
    await expect(page.locator('h2:has-text("Add Your Response")')).toBeVisible();
    await expect(page.locator('h2:has-text("Event Finalized")')).not.toBeVisible();
  });

  test('non-creator cannot see finalize section', async ({ page, browser }) => {
    const url = await createEvent(page, { title: 'No Finalize', timeSlots: 1 });
    await submitResponse(page, 'Dave');

    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    const shareToken = url.split('/events/')[1];
    await newPage.goto(`/events/${shareToken}`);

    await expect(newPage.locator('h2:has-text("Choose a Date")')).not.toBeVisible();
    await newContext.close();
  });

  test('new responses blocked after finalization', async ({ page, browser }) => {
    const url = await createEvent(page, { title: 'Locked Event', timeSlots: 1 });
    await submitResponse(page, 'Eve');
    await finalizeFirstSlot(page);

    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    const shareToken = url.split('/events/')[1];
    await newPage.goto(`/events/${shareToken}`);

    await expect(newPage.locator('text=no longer accepting new responses')).toBeVisible();
    await expect(newPage.locator('h2:has-text("Add Your Response")')).not.toBeVisible();
    await newContext.close();
  });

  test('calendar download link works after finalization', async ({ page }) => {
    await createEvent(page, { title: 'Calendar Test', timeSlots: 1 });
    await submitResponse(page, 'Frank');
    await finalizeFirstSlot(page);

    const icsLink = page.locator('a:has-text("Download .ics")');
    await expect(icsLink).toBeVisible();
    const href = await icsLink.getAttribute('href');
    expect(href).toContain('/calendar');
  });
});
