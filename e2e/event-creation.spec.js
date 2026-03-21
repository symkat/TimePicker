import { test, expect } from '@playwright/test';
import { createEvent } from './helpers.js';

/**
 * Helper to click a future date on the calendar within the creation form.
 * Navigates months if needed.
 */
async function clickDate(page, daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const dateStr = date.toISOString().slice(0, 10);

  const targetMonth = date.getMonth();
  const targetYear = date.getFullYear();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const targetLabel = `${monthNames[targetMonth]} ${targetYear}`;

  const monthLabel = page.locator('[data-date-time-picker-target="monthLabel"]');
  let labelText = await monthLabel.textContent();
  let safety = 0;
  while (labelText !== targetLabel && safety < 12) {
    await page.locator('[data-action="click->date-time-picker#nextMonth"]').click();
    labelText = await monthLabel.textContent();
    safety++;
  }

  await page.locator(`[data-date="${dateStr}"]`).click();
  return dateStr;
}

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

  test('creates a basic event with title and one date', async ({ page }) => {
    await page.fill('input[name="event[title]"]', 'Team Lunch');
    await clickDate(page, 1);

    // Hidden inputs should be generated
    await expect(page.locator('input[name="event[time_slots][][date]"]')).toBeAttached();

    await page.click('input[value="Create Event"]');
    await expect(page.locator('h1')).toContainText('Team Lunch');
    await expect(page.locator('text=Event created!')).toBeVisible();
  });

  test('creates an event with all fields filled', async ({ page }) => {
    await page.fill('input[name="event[title]"]', 'Birthday Party');
    await page.fill('textarea[name="event[description]"]', 'Celebrating at the park');
    await page.fill('input[name="event[location]"]', 'Central Park');

    await clickDate(page, 1);
    await page.click('input[value="Create Event"]');

    await expect(page.locator('h1')).toContainText('Birthday Party');
    await expect(page.locator('text=Celebrating at the park')).toBeVisible();
    await expect(page.locator('text=Central Park')).toBeVisible();
  });

  test('can select multiple dates on calendar', async ({ page }) => {
    await clickDate(page, 1);
    await clickDate(page, 2);
    await clickDate(page, 3);

    // Should have 3 hidden date inputs
    const hiddenDates = page.locator('input[name="event[time_slots][][date]"]');
    await expect(hiddenDates).toHaveCount(3);
  });

  test('can deselect a date by clicking again', async ({ page }) => {
    const dateStr = await clickDate(page, 1);
    await clickDate(page, 2);

    const hiddenDates = page.locator('input[name="event[time_slots][][date]"]');
    await expect(hiddenDates).toHaveCount(2);

    // Click the first date again on the calendar to deselect
    await page.locator(`[data-date-time-picker-target="calendar"] [data-date="${dateStr}"]`).click();
    await expect(hiddenDates).toHaveCount(1);
  });

  test('can remove a date from the selected list', async ({ page }) => {
    await clickDate(page, 1);
    await clickDate(page, 2);

    const hiddenDates = page.locator('input[name="event[time_slots][][date]"]');
    await expect(hiddenDates).toHaveCount(2);

    // Click the first remove button
    await page.locator('button:has-text("remove")').first().click();
    await expect(hiddenDates).toHaveCount(1);
  });

  test('can add a free text question', async ({ page }) => {
    await page.click('text=Add a question');
    const questionPrompt = page.locator('input[name="event[questions_attributes][0][prompt]"]');
    await expect(questionPrompt).toBeVisible();
  });

  test('shows validation error when title is missing', async ({ page }) => {
    await clickDate(page, 1);
    await page.click('input[value="Create Event"]');
    await expect(page.locator('text=Please fix the following')).toBeVisible();
  });

  test('shows end time toggle and overnight badge', async ({ page }) => {
    // Enable end time
    await page.locator('[data-date-time-picker-target="endTimeToggle"]').check();
    await expect(page.locator('[data-date-time-picker-target="endTimeWrapper"]')).toBeVisible();

    // Set start to 10 PM (22:00), end to 2 AM (02:00)
    await page.locator('[data-date-time-picker-target="defaultStart"]').selectOption('22:00');
    await page.locator('[data-date-time-picker-target="defaultEnd"]').selectOption('02:00');

    // Overnight badge should appear
    await expect(page.locator('text=ends next day')).toBeVisible();
  });

  test('event show page has share link', async ({ page }) => {
    await page.fill('input[name="event[title]"]', 'Share Test Event');
    await clickDate(page, 1);
    await page.click('input[value="Create Event"]');

    await expect(page.locator('text=Share this link with your friends:')).toBeVisible();
    const shareCode = page.locator('.bg-indigo-50 code');
    await expect(shareCode).toBeVisible();
    const shareUrl = await shareCode.textContent();
    expect(shareUrl).toMatch(/\/events\/[a-zA-Z0-9]+/);
  });
});
