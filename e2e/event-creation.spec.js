import { test, expect } from '@playwright/test';

test.describe('Event Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events/new');
  });

  test('displays the event creation form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Create a New Event');
    await expect(page.locator('text=Event Details')).toBeVisible();
    await expect(page.locator('text=When might this happen?')).toBeVisible();
    await expect(page.locator('text=Questions')).toBeVisible();
  });

  test('creates a basic event with title and one time slot', async ({ page }) => {
    await page.fill('input[name="event[title]"]', 'Team Lunch');

    // Fill date and start time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="event[time_slots][][date]"]', tomorrow.toISOString().slice(0, 10));
    await page.fill('input[name="event[time_slots][][start_time]"]', '12:00');

    await page.click('input[value="Create Event"]');

    await expect(page.locator('h1')).toContainText('Team Lunch');
    await expect(page.locator('text=Event created!')).toBeVisible();
  });

  test('creates an event with all fields filled', async ({ page }) => {
    await page.fill('input[name="event[title]"]', 'Birthday Party');
    await page.fill('textarea[name="event[description]"]', 'Celebrating at the park');
    await page.fill('input[name="event[location]"]', 'Central Park');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="event[time_slots][][date]"]', tomorrow.toISOString().slice(0, 10));
    await page.fill('input[name="event[time_slots][][start_time]"]', '14:00');

    await page.click('input[value="Create Event"]');

    await expect(page.locator('h1')).toContainText('Birthday Party');
    await expect(page.locator('text=Celebrating at the park')).toBeVisible();
    await expect(page.locator('text=Central Park')).toBeVisible();
  });

  test('can add multiple time slots', async ({ page }) => {
    await page.click('text=Add another time option');
    const rows = page.locator('.time-slot-row');
    await expect(rows).toHaveCount(2);

    await page.click('text=Add another time option');
    await expect(rows).toHaveCount(3);
  });

  test('can remove a time slot (keeping at least one)', async ({ page }) => {
    await page.click('text=Add another time option');
    const rows = page.locator('.time-slot-row');
    await expect(rows).toHaveCount(2);

    // Click the first Remove button
    const removeButtons = page.locator('.time-slot-row button:has-text("Remove")');
    await removeButtons.first().click();
    await expect(rows).toHaveCount(1);
  });

  test('can add a free text question', async ({ page }) => {
    await page.click('text=Add a question');
    const questionPrompt = page.locator('input[name="event[questions_attributes][0][prompt]"]');
    await expect(questionPrompt).toBeVisible();
  });

  test('shows validation error when title is missing', async ({ page }) => {
    // Fill a time slot but no title
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="event[time_slots][][date]"]', tomorrow.toISOString().slice(0, 10));
    await page.fill('input[name="event[time_slots][][start_time]"]', '12:00');

    await page.click('input[value="Create Event"]');

    await expect(page.locator('text=Please fix the following')).toBeVisible();
  });

  test('event show page has share link', async ({ page }) => {
    await page.fill('input[name="event[title]"]', 'Share Test Event');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="event[time_slots][][date]"]', tomorrow.toISOString().slice(0, 10));
    await page.fill('input[name="event[time_slots][][start_time]"]', '12:00');

    await page.click('input[value="Create Event"]');

    await expect(page.locator('text=Share this link:')).toBeVisible();
    const shareCode = page.locator('.bg-indigo-50 code');
    await expect(shareCode).toBeVisible();
    const shareUrl = await shareCode.textContent();
    expect(shareUrl).toMatch(/\/events\/[a-zA-Z0-9]+/);
  });
});
