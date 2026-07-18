import { test, expect } from '@playwright/test';

test.describe('Game Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('game-filters')).toBeVisible();
  });

  test('filters by one or more categories with OR semantics', async ({ page }) => {
    const visibleCards = page.locator('[data-testid="game-card"]:not([hidden])');
    const resultsCount = page.getByTestId('filter-results-count');

    await expect(visibleCards).toHaveCount(21);

    await test.step('Filter by one category', async () => {
      const strategyFilter = page.getByRole('checkbox', { name: 'Strategy' });
      await strategyFilter.focus();
      await expect(strategyFilter).toBeFocused();
      await page.keyboard.press('Space');

      await expect(visibleCards).toHaveCount(4);
      await expect(strategyFilter).toBeChecked();
      await expect(resultsCount).toHaveText('Showing 4 games');
    });

    await test.step('Add a second category', async () => {
      await page.getByRole('checkbox', { name: 'Puzzle' }).check();

      await expect(visibleCards).toHaveCount(8);
      await expect(resultsCount).toHaveText('Showing 8 games');
      await expect(page.getByTestId('category-filter-all')).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });
  });

  test('combines category and publisher filters and resets them', async ({ page }) => {
    const visibleCards = page.locator('[data-testid="game-card"]:not([hidden])');
    const publisherFilter = page.getByRole('combobox', { name: 'Filter by publisher' });

    await page.getByRole('checkbox', { name: 'Strategy' }).check();
    await publisherFilter.selectOption({ label: 'CodeForge Studios' });

    await expect(visibleCards).toHaveCount(1);
    await expect(visibleCards.first().getByTestId('game-title')).toHaveText('DevOps Dominion');
    await expect(page).toHaveURL('/');

    await page.getByTestId('reset-filters').click();

    await expect(visibleCards).toHaveCount(21);
    await expect(publisherFilter).toHaveValue('');
    await expect(page.getByRole('checkbox', { name: 'Strategy' })).not.toBeChecked();
    await expect(page.getByTestId('category-filter-all')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
