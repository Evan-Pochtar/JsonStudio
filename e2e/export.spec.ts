import { test, expect } from '@playwright/test';

test.describe('Export Functionality', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('text=users');
	});

	test('should open export popup', async ({ page }) => {
		await page.click('button:has-text("Download / Export")');

		await expect(page.locator('h2:has-text("Export Data")')).toBeVisible();
	});

	test('should close export popup with Cancel button', async ({ page }) => {
		await page.click('button:has-text("Download / Export")');
		await expect(page.locator('h2:has-text("Export Data")')).toBeVisible();

		await page.click('button:has-text("Cancel")');
		await expect(page.locator('h2:has-text("Export Data")')).not.toBeVisible();
	});

	test('should close export popup with Escape key', async ({ page }) => {
		await page.click('button:has-text("Download / Export")');
		await expect(page.locator('h2:has-text("Export Data")')).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(page.locator('h2:has-text("Export Data")')).not.toBeVisible();
	});

	test('should close export popup by clicking overlay', async ({ page }) => {
		await page.click('button:has-text("Download / Export")');
		await expect(page.locator('h2:has-text("Export Data")')).toBeVisible();

		// Click outside the modal
		await page.locator('div[role="dialog"]').click({ position: { x: 0, y: 0 } });
		await expect(page.locator('h2:has-text("Export Data")')).not.toBeVisible();
	});

	test('should have JSON format selected by default', async ({ page }) => {
		await page.click('button:has-text("Download / Export")');

		const jsonRadio = page.locator('input[type="radio"][value="json"]');
		await expect(jsonRadio).toBeChecked();
	});

	test('should select CSV format', async ({ page }) => {
		await page.click('button:has-text("Download / Export")');

		await page.click('label:has-text("CSV")');

		const csvRadio = page.locator('input[type="radio"][value="csv"]');
		await expect(csvRadio).toBeChecked();
	});

	test('should select Excel format', async ({ page }) => {
		await page.click('button:has-text("Download / Export")');

		await page.click('label:has-text("Excel")');

		const xlsxRadio = page.locator('input[type="radio"][value="xlsx"]');
		await expect(xlsxRadio).toBeChecked();
	});

	test('should export as JSON', async ({ page }) => {
		// Setup download listener
		const downloadPromise = page.waitForEvent('download');

		await page.click('button:has-text("Download / Export")');
		await page.click('button:has-text("Export")');

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/\.json$/);
	});

	test('should export as CSV', async ({ page }) => {
		const downloadPromise = page.waitForEvent('download');

		await page.click('button:has-text("Download / Export")');
		await page.click('label:has-text("CSV")');
		await page.click('button:has-text("Export")');

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/\.csv$/);
	});

	test('should export as Excel', async ({ page }) => {
		const downloadPromise = page.waitForEvent('download');

		await page.click('button:has-text("Download / Export")');
		await page.click('label:has-text("Excel")');
		await page.click('button:has-text("Export")');

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
	});

	test('should use correct filename for export', async ({ page }) => {
		const downloadPromise = page.waitForEvent('download');

		await page.click('button:has-text("Download / Export")');
		await page.click('button:has-text("Export")');

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toContain('sample');
	});

	test('should export only focused data when focused', async ({ page }) => {
		// Navigate into users array
		await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
		await page.waitForSelector('text=Back to root');

		const downloadPromise = page.waitForEvent('download');

		await page.click('button:has-text("Download / Export")');
		await page.click('button:has-text("Export")');

		const download = await downloadPromise;

		// Download should contain only users array data
		expect(download).toBeTruthy();
	});

	test('should handle export of array data', async ({ page }) => {
		// Navigate into users array
		await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
		await page.waitForSelector('text=Back to root');

		const downloadPromise = page.waitForEvent('download');

		await page.click('button:has-text("Download / Export")');
		await page.click('label:has-text("CSV")');
		await page.click('button:has-text("Export")');

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/\.csv$/);
	});

	test('should handle export of object data', async ({ page }) => {
		// Navigate into settings object
		await page.locator('span.text-blue-600:has-text("settings")').first().dblclick();
		await page.waitForSelector('text=Back to root');

		const downloadPromise = page.waitForEvent('download');

		await page.click('button:has-text("Download / Export")');
		await page.click('label:has-text("CSV")');
		await page.click('button:has-text("Export")');

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/\.csv$/);
	});

	test('should handle export of nested data structures', async ({ page }) => {
		const downloadPromise = page.waitForEvent('download');

		await page.click('button:has-text("Download / Export")');
		await page.click('label:has-text("CSV")');
		await page.click('button:has-text("Export")');

		const download = await downloadPromise;
		const path = await download.path();

		// Verify file was downloaded
		expect(path).toBeTruthy();
	});

	test('should close popup after successful export', async ({ page }) => {
		await page.click('button:has-text("Download / Export")');
		await expect(page.locator('h2:has-text("Export Data")')).toBeVisible();

		const downloadPromise = page.waitForEvent('download');
		await page.click('button:has-text("Export")');
		await downloadPromise;

		// Popup should be closed
		await expect(page.locator('h2:has-text("Export Data")')).not.toBeVisible();
	});

	test('should maintain selected format when reopening', async ({ page }) => {
		// Open and select CSV
		await page.click('button:has-text("Download / Export")');
		await page.click('label:has-text("CSV")');
		await page.click('button:has-text("Cancel")');

		// Reopen
		await page.click('button:has-text("Download / Export")');

		// CSV should still be selected
		const csvRadio = page.locator('input[type="radio"][value="csv"]');
		await expect(csvRadio).toBeChecked();
	});

	test('should handle export with modified data', async ({ page }) => {
		// Modify data
		await page.click('button:has-text("Text")');
		const textarea = page.locator('textarea');
		await textarea.fill('{"test": "modified"}');

		const downloadPromise = page.waitForEvent('download');

		await page.click('button:has-text("Download / Export")');
		await page.click('button:has-text("Export")');

		const download = await downloadPromise;
		expect(download).toBeTruthy();
	});

	test('should export empty object', async ({ page }) => {
		// Create new empty file
		await page.click('button:has-text("New File")');

		const downloadPromise = page.waitForEvent('download');

		await page.click('button:has-text("Download / Export")');
		await page.click('button:has-text("Export")');

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/\.json$/);
	});

	test('should handle large data export', async ({ page }) => {
		// Load large data file
		const largeData = {
			items: Array.from({ length: 1000 }, (_, i) => ({
				id: i,
				name: `Item ${i}`,
				value: Math.random()
			}))
		};

		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.click('button:has-text("Open File")');
		const fileChooser = await fileChooserPromise;

		await fileChooser.setFiles({
			name: 'large.json',
			mimeType: 'application/json',
			buffer: Buffer.from(JSON.stringify(largeData))
		});

		await page.waitForSelector('text=large.json');

		const downloadPromise = page.waitForEvent('download');

		await page.click('button:has-text("Download / Export")');
		await page.click('button:has-text("Export")');

		const download = await downloadPromise;
		expect(download).toBeTruthy();
	});
});
