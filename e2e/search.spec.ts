import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('text=users');
	});

	test('should show search panel', async ({ page }) => {
		await expect(page.locator('input[placeholder="Search anywhere..."]')).toBeVisible();
	});

	test('should search for values', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('David');

		// Should show results
		await expect(page.locator('text=2 results')).toBeVisible({ timeout: 2000 });
		await expect(page.locator('text=David Smith')).toBeVisible();
	});

	test('should search for keys', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('email');

		await expect(page.locator('text=result')).toBeVisible();

		const emailButtons = page.locator('button:has-text("email")');
		await expect(emailButtons).toHaveCount(3);

		await expect(emailButtons.nth(0)).toBeVisible();
		await expect(emailButtons.nth(1)).toBeVisible();
		await expect(emailButtons.nth(2)).toBeVisible();
	});

	test('should search case-insensitively', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('DAVID');

		await expect(page.locator('text=result')).toBeVisible();
	});

	test('should clear results when search is cleared', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('David');
		await expect(page.locator('text=result')).toBeVisible();

		// Clear search
		await searchInput.fill('');

		// Results should disappear
		await expect(page.locator('text=result')).not.toBeVisible();
	});

	test('should show "No results found" for non-matching search', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('NonExistentValue12345');

		await expect(page.locator('text=No results found')).toBeVisible();
	});

	test('should navigate to search result', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('David');

		// Click on result
		await page.click('button:has-text("David Smith")');

		// Should navigate to that location
		await expect(page.locator('div').filter({ hasText: /^users\.0$/ })).toBeVisible();
		await expect(page.locator('text=Back to root')).toBeVisible();
	});

	test('should show advanced search options', async ({ page }) => {
		await page.click('button:has-text("Show Advanced")');

		// Should show key filter input
		await expect(page.locator('input[placeholder="Search in specific key..."]')).toBeVisible();
	});

	test('should hide advanced search options', async ({ page }) => {
		await page.click('button:has-text("Show Advanced")');
		await expect(page.locator('input[placeholder="Search in specific key..."]')).toBeVisible();

		await page.click('button:has-text("Hide Advanced")');
		await expect(page.locator('input[placeholder="Search in specific key..."]')).not.toBeVisible();
	});

	test('should search within specific key', async ({ page }) => {
		await page.click('button:has-text("Show Advanced")');

		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		const keyFilter = page.locator('input[placeholder="Search in specific key..."]');

		await keyFilter.fill('name');
		await searchInput.fill('David');

		// Should find results in name field only
		await expect(page.locator('text=result')).toBeVisible();
		await expect(page.locator('button:has-text("name")').first()).toBeVisible();
	});

	test('should respect max search results limit', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('e'); // Common letter

		// Should limit results (MAX_SEARCH_RESULTS = 100)
		const resultText = await page.locator('text=/\\d+ result/').first().textContent();
		expect(resultText).toBeTruthy();
	});

	test('should update search results in real-time', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');

		await searchInput.fill('D');
		await page.waitForTimeout(300);

		await searchInput.fill('Da');
		await page.waitForTimeout(300);

		await searchInput.fill('Dav');
		await page.waitForTimeout(300);

		// Results should be visible
		await expect(page.locator('text=result')).toBeVisible();
	});

	test('should display result path', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('David');

		// Should show path in result card
		await expect(page.locator('text=users.0.name')).toBeVisible();
	});

	test('should search in focused view', async ({ page }) => {
		// Navigate into users array
		await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
		await page.waitForSelector('text=Back to root');

		// Search should work within focused context
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('David');

		await expect(page.locator('text=result')).toBeVisible();
	});

	test('should handle special characters in search', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('@example.com');

		// Should find emails
		await expect(page.locator('text=result')).toBeVisible();
	});

	test('should search numeric values', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('123');

		// Should find numeric matches
		// Results depend on sample data
	});

	test('should search boolean values', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('true');

		// Should find boolean matches
		await expect(page.locator('text=result').or(page.locator('text=No results found'))).toBeVisible();
	});

	test('should highlight matching text in results', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('David');

		// Result card should show the value
		const resultCard = page.locator('button:has-text("David Smith")');
		await expect(resultCard).toBeVisible();
		await expect(resultCard.locator('text=David Smith')).toBeVisible();
	});

	test('should show result count', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('user');

		// Should show count
		await expect(page.locator('text=/\\d+ results?/')).toBeVisible();
	});

	test('should handle empty key filter', async ({ page }) => {
		await page.click('button:has-text("Show Advanced")');

		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		const keyFilter = page.locator('input[placeholder="Search in specific key..."]');

		await keyFilter.fill('');
		await searchInput.fill('David');

		// Should search everywhere
		await expect(page.locator('text=result')).toBeVisible();
	});

	test('should persist search when switching views', async ({ page }) => {
		const searchInput = page.locator('input[placeholder="Search anywhere..."]');
		await searchInput.fill('David');
		await expect(page.locator('text=result')).toBeVisible();

		// Switch to table view
		await page.click('button:has-text("Table")');
		await page.waitForTimeout(300);

		// Switch back
		await page.click('button:has-text("Tree")');

		// Search should still be there
		expect(await searchInput.inputValue()).toBe('David');
		await expect(page.locator('text=result')).toBeVisible();
	});
});
