import { expect, test, type Page } from '@playwright/test';
import { questions, vocabulary } from '../src/content';
import type { Attempt, Progress } from '../src/types';

const storageKey = 'kotoba-n3-progress';
const questionMap = Object.fromEntries(questions.map(question => [question.id, question]));

async function savedProgress(page: Page): Promise<Progress> {
  return page.evaluate(key => {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('No progress has been saved.');
    return JSON.parse(raw);
  }, storageKey);
}

async function navigate(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name, exact: true }).click();
}

async function waitForAttempt(page: Page): Promise<Attempt> {
  await expect.poll(async () => (await savedProgress(page)).activeAttemptId).not.toBeNull();
  const progress = await savedProgress(page);
  return progress.attempts.find(attempt => attempt.id === progress.activeAttemptId)!;
}

async function choose(page: Page, optionId: string) {
  await page.locator(`input[type="radio"][value="${optionId}"]`).check();
}

test('a learner studies, bookmarks, practices, reviews a miss and retains one result after reload', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Vocabulary & kanji');
  const card = page.locator('.vocab-card').first();
  await card.getByRole('button', { name: 'Reveal card' }).click();
  await expect(card).toContainText(vocabulary[0].reading);
  await card.getByRole('button', { name: `Bookmark ${vocabulary[0].word}`, exact: true }).click();
  await expect.poll(async () => (await savedProgress(page)).bookmarks).toEqual([vocabulary[0].id]);
  await expect.poll(async () => (await savedProgress(page)).studyEvents.length).toBe(1);

  await navigate(page, 'Grammar');
  await expect(page.getByRole('heading', { name: 'How to attach it' })).toBeVisible();
  await page.getByRole('button', { name: 'Practice this pattern' }).click();
  const attempt = await waitForAttempt(page);
  const wrongQuestion = questionMap[attempt.questionOrder[0]];
  const wrongOption = wrongQuestion.options.find(option => option.id !== wrongQuestion.correctOptionId)!;
  for (let index = 0; index < attempt.questionOrder.length; index++) {
    const question = questionMap[attempt.questionOrder[index]];
    await choose(page, index === 0 ? wrongOption.id : question.correctOptionId);
    await page.getByRole('button', { name: 'Check answer', exact: false }).click();
    await expect(page.locator('.feedback')).toBeVisible();
    await expect(page.locator('.feedback')).toContainText('Correct answer:');
    if (index < attempt.questionOrder.length - 1) await page.getByRole('button', { name: 'Next', exact: false }).click();
  }
  await page.getByRole('button', { name: 'Submit practice', exact: false }).click();
  await expect(page.locator('.result-score')).toContainText(`${attempt.questionOrder.length - 1} / ${attempt.questionOrder.length}`);
  await expect.poll(async () => (await savedProgress(page)).attempts[0].status).toBe('submitted');
  await page.getByRole('button', { name: 'Finish review', exact: false }).click();
  await navigate(page, 'Mistake review');
  await expect(page.locator('.review-card')).toHaveCount(1);
  await expect(page.locator('.review-card')).toContainText(wrongOption.text);
  await expect.poll(async () => (await savedProgress(page)).attempts[0].status).toBe('reviewed');
  await page.reload();
  await expect(page.locator('.review-card')).toHaveCount(1);
  const restored = await savedProgress(page);
  expect(restored.attempts).toHaveLength(1);
  expect(restored.attempts[0].status).toBe('reviewed');
  expect(restored.attempts[0].optionOrders).toEqual(attempt.optionOrders);
  expect(restored.reviews[wrongQuestion.id].lastAnswerId).toBe(wrongOption.id);

  await page.getByRole('button', { name: 'Retry question', exact: false }).click();
  await choose(page, wrongQuestion.correctOptionId);
  await page.getByRole('button', { name: 'Check answer', exact: false }).click();
  await page.getByRole('button', { name: 'Submit practice', exact: false }).click();
  await page.getByRole('button', { name: 'Finish review', exact: false }).click();
  await navigate(page, 'Settings');
  await expect(page.getByText('2 submitted sessions', { exact: true })).toBeVisible();
  await expect(page.getByText(`Initial attempts: ${attempt.questionOrder.length - 1}/${attempt.questionOrder.length} correct · Retry performance: 1/1 correct.`, { exact: true })).toBeVisible();
  await expect.poll(async () => (await savedProgress(page)).attempts.filter(item => item.status === 'reviewed').length).toBe(2);
  expect((await savedProgress(page)).reviews[wrongQuestion.id].streak).toBe(0);
  await page.reload();
  await expect(page.getByText('2 submitted sessions', { exact: true })).toBeVisible();
  expect((await savedProgress(page)).attempts).toHaveLength(2);
  await page.locator('.history-list').getByRole('button', { name: 'View results', exact: false }).first().click();
  await expect(page).toHaveURL(/#practice$/);
  await expect(page.locator('.result-score')).toContainText('1 / 1');
  await expect(page.getByText('RETRY RESULTS', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finish review', exact: false }).click();
  await expect(page).toHaveURL(/#settings$/);
  expect((await savedProgress(page)).attempts).toHaveLength(2);
});

test('mini mock saves canonical answers and its shuffled order while withholding feedback', async ({ page }) => {
  await page.goto('/#mock');
  await expect(page.getByText('12 questions in 15 minutes, covering vocabulary, kanji readings, grammar, and reading comprehension.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start mini mock test', exact: false }).click();
  const attempt = await waitForAttempt(page);
  expect(attempt.questionOrder).toHaveLength(12);
  const question = questionMap[attempt.questionOrder[0]];
  const optionId = attempt.optionOrders[question.id][0];
  await choose(page, optionId);
  await expect.poll(async () => (await savedProgress(page)).attempts[0].answers[question.id]).toBe(optionId);
  await expect(page.locator('.feedback')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Check answer', exact: false })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('timer', { name: 'Time remaining' })).toBeVisible();
  const restored = (await savedProgress(page)).attempts[0];
  expect(restored.questionOrder).toEqual(attempt.questionOrder);
  expect(restored.optionOrders).toEqual(attempt.optionOrders);
  expect(restored.answers[question.id]).toBe(optionId);
  expect(restored.deadline).toBe(attempt.deadline);
  await expect(page.locator('.feedback')).toHaveCount(0);
});

test('an expired stored deadline submits unanswered items exactly once after reload', async ({ page }) => {
  await page.goto('/#mock');
  await page.getByRole('button', { name: 'Start mini mock test', exact: false }).click();
  const original = await waitForAttempt(page);
  await page.evaluate(key => {
    const progress = JSON.parse(localStorage.getItem(key)!);
    const attempt = progress.attempts.find((item: Attempt) => item.id === progress.activeAttemptId);
    attempt.createdAt = new Date(Date.now() - 120_000).toISOString();
    attempt.deadline = Date.now() - 1000;
    localStorage.setItem(key, JSON.stringify(progress));
  }, storageKey);
  await page.reload();
  await expect(page.locator('.result-score')).toContainText('0 / 12');
  await expect(page.getByText('12 unanswered · 0 unscored or excluded. Raw practice results for this attempt.', { exact: true })).toBeVisible();
  await expect.poll(async () => (await savedProgress(page)).attempts[0].status).toBe('submitted');
  const submitted = await savedProgress(page);
  expect(submitted.attempts).toHaveLength(1);
  expect(submitted.attempts[0].id).toBe(original.id);
  expect(Object.keys(submitted.reviews)).toHaveLength(12);
  await page.reload();
  await expect(page.locator('.result-score')).toContainText('0 / 12');
  const secondReload = await savedProgress(page);
  expect(secondReload.attempts).toEqual(submitted.attempts);
  expect(secondReload.reviews).toEqual(submitted.reviews);
});

test('invalid JSON import preserves progress and reset requires a cancellable confirmation', async ({ page }) => {
  await page.goto('/#vocabulary');
  await page.locator('.vocab-card').first().getByRole('button', { name: `Bookmark ${vocabulary[0].word}`, exact: true }).click();
  await expect.poll(async () => (await savedProgress(page)).bookmarks.length).toBe(1);
  const before = await savedProgress(page);
  await navigate(page, 'Settings');
  await page.getByLabel('Import progress JSON').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{broken json') });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.notice').filter({ hasText: /JSON|Unexpected|Expected/i })).toBeVisible();
  expect(await savedProgress(page)).toEqual(before);
  await page.getByRole('button', { name: 'Reset progress', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Start a new learning journey?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await savedProgress(page)).toEqual(before);
  await page.getByRole('button', { name: 'Reset progress', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await savedProgress(page)).toEqual(before);
});

test('missing Japanese voices offer script study that stays unscored after the transcript is hidden', async ({ page }) => {
  await page.addInitScript(() => {
    const fake = {
      getVoices: () => [],
      addEventListener: () => {}, removeEventListener: () => {},
      cancel: () => {}, speak: () => {}, pause: () => {}, resume: () => {},
      speaking: false, pending: false, paused: false,
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: fake });
  });
  await page.goto('/#listening');
  await expect(page.getByText('No Japanese voice was found. Install a Japanese system voice or use script study.', { exact: true })).toBeVisible({ timeout: 7000 });
  await expect(page.getByRole('button', { name: 'Play / replay', exact: false })).toBeDisabled();
  await page.getByRole('button', { name: 'Study the script instead', exact: true }).click();
  await expect(page.locator('.transcript')).toBeVisible();
  await page.getByRole('button', { name: 'Hide script', exact: true }).click();
  await expect(page.locator('.transcript')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start script-study questions', exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Start script-study questions', exact: false }).click();
  const attempt = await waitForAttempt(page);
  expect(attempt.listeningAccess).toBe('script');
  for (let index = 0; index < attempt.questionOrder.length; index++) {
    await choose(page, questionMap[attempt.questionOrder[index]].correctOptionId);
    if (index < attempt.questionOrder.length - 1) await page.getByRole('button', { name: 'Next', exact: false }).click();
  }
  await page.getByRole('button', { name: 'Submit practice', exact: false }).click();
  await expect(page.locator('.result-score')).toContainText('Unscored');
  await expect(page.locator('.skill-breakdown')).toBeEmpty();
  await expect.poll(async () => (await savedProgress(page)).attempts[0].status).toBe('submitted');
  expect((await savedProgress(page)).reviews).toEqual({});
});

test('blocked localStorage is reported while study continues in the tab', async ({ page }) => {
  await page.addInitScript(() => {
    const blocked = {
      getItem: () => { throw new DOMException('Storage blocked', 'SecurityError'); },
      setItem: () => { throw new DOMException('Storage blocked', 'SecurityError'); },
      removeItem: () => { throw new DOMException('Storage blocked', 'SecurityError'); },
    };
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => blocked });
  });
  await page.goto('/');
  await expect(page.getByText('Storage needs attention', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('storage is unavailable');
  await navigate(page, 'Vocabulary & kanji');
  await page.locator('.vocab-card').first().getByRole('button', { name: 'Reveal card', exact: false }).click();
  await expect(page.locator('.vocab-card').first()).toContainText(vocabulary[0].reading);
  await navigate(page, 'Settings');
  await page.getByRole('button', { name: 'Use current progress and retry saving', exact: true }).click();
  await expect(page.getByText('Unsaved · this tab only', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Progress could not be saved');
});

test('keyboard focus is visible and every screen stays within a 360px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content', exact: true });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  expect(await skip.evaluate(element => {
    const style = getComputedStyle(element);
    return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2 && element.matches(':focus-visible');
  })).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  for (const label of ['Dashboard', 'Vocabulary & kanji', 'Grammar', 'Reading', 'Listening', 'Practice', 'Mini mock test', 'Mistake review', 'Settings']) {
    await navigate(page, label);
    const overflow = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(overflow.document, `${label} document overflow`).toBeLessThanOrEqual(overflow.viewport + 1);
    expect(overflow.body, `${label} body overflow`).toBeLessThanOrEqual(overflow.viewport + 1);
  }
  await navigate(page, 'Vocabulary & kanji');
  const search = page.getByRole('textbox', { name: 'Search vocabulary', exact: true });
  await search.focus();
  await page.keyboard.type('deadline');
  await expect(page.locator('.vocab-card')).toHaveCount(1);
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  expect(await focused.evaluate(element => element.matches(':focus-visible') && getComputedStyle(element).outlineStyle !== 'none')).toBe(true);
});
