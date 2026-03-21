/**
 * Shared helper to create an event via the form and return the event show page URL.
 *
 * Uses the date-time picker calendar UI: clicks future dates on the calendar
 * and relies on the default start time (7:00 PM).
 */
export async function createEvent(page, { title, description, location, timeSlots = 1, questions = [] } = {}) {
  const { expect } = await import('@playwright/test');

  await page.goto('/events/new');
  await page.fill('input[name="event[title]"]', title || 'Test Event');

  if (description) {
    await page.fill('textarea[name="event[description]"]', description);
  }
  if (location) {
    await page.fill('input[name="event[location]"]', location);
  }

  // Click future dates on the calendar to create time slots
  // The calendar shows the current month; we click upcoming non-past dates
  for (let i = 0; i < timeSlots; i++) {
    const date = new Date();
    date.setDate(date.getDate() + 1 + i);
    const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD

    // Navigate to the correct month if needed
    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();

    // Read current month label and navigate if needed
    const monthLabel = page.locator('[data-date-time-picker-target="monthLabel"]');
    let labelText = await monthLabel.textContent();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const targetLabel = `${monthNames[targetMonth]} ${targetYear}`;

    // Click next month until we reach the target
    let safety = 0;
    while (labelText !== targetLabel && safety < 12) {
      await page.locator('[data-action="click->date-time-picker#nextMonth"]').click();
      labelText = await monthLabel.textContent();
      safety++;
    }

    // Click the date cell
    await page.locator(`[data-date="${dateStr}"]`).click();
  }

  // Wait for hidden inputs to be generated
  await expect(page.locator('input[name="event[time_slots][][date]"]').first()).toBeAttached();

  // Add questions (names are indexed: [0], [1], etc.)
  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    await page.click('text=Add a question');
    await page.locator(`input[name="event[questions_attributes][${qi}][prompt]"]`).fill(q.prompt);

    if (q.type === 'multiple_choice') {
      await page.locator(`select[name="event[questions_attributes][${qi}][question_type]"]`).selectOption('multiple_choice');

      for (const opt of q.options || []) {
        const addOptionBtns = page.locator('text=Add option');
        await addOptionBtns.last().click();
        const optionInputs = page.locator(`input[name="event[questions_attributes][${qi}][options][]"]`);
        await optionInputs.last().fill(opt);
      }
    }
  }

  await page.click('input[value="Create Event"]');
  await expect(page.locator('h1')).toContainText(title || 'Test Event');
  return page.url();
}
