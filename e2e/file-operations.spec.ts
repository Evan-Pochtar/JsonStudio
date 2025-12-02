import { test, expect } from '@playwright/test';

test.describe('File Operations', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should display the application title and logo', async ({ page }) => {
		await expect(page.locator('h1')).toContainText('JSON Studio');
		await expect(page.locator('img[alt="JSON Studio Logo"]')).toBeVisible();
	});

	test('should load sample data on initial load', async ({ page }) => {
		// Wait for the tree view to be visible
		await expect(page.locator('text=users')).toBeVisible();
		await expect(page.locator('text=settings')).toBeVisible();
		await expect(page.locator('text=metadata')).toBeVisible();
	});

	test('should create a new file', async ({ page }) => {
		await page.click('button:has-text("New File")');

		// Should show untitled.json
		await expect(page.locator('text=untitled.json')).toBeVisible();

		// Should be at root with empty object
		await expect(page.locator('text=Root level')).toBeVisible();
	});

	test('should open a JSON file', async ({ page }) => {
		const testData = {
			test: 'value',
			number: 123,
			nested: { key: 'data' }
		};

		// Create a temporary JSON file
		const fileContent = JSON.stringify(testData);
		const fileName = 'test-file.json';

		// Use file chooser to upload
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.click('button:has-text("Open File")');
		const fileChooser = await fileChooserPromise;

		await fileChooser.setFiles({
			name: fileName,
			mimeType: 'application/json',
			buffer: Buffer.from(fileContent)
		});

		// Verify file is loaded
		await expect(page.locator(`text=${fileName}`)).toBeVisible();
		await expect(page.getByRole('button', { name: 'test' })).toBeVisible();
	});

	test('should reject invalid JSON files', async ({ page }) => {
		const invalidContent = '{ invalid json content }';

		page.on('dialog', async (dialog) => {
			expect(dialog.message()).toContain('Invalid JSON file');
			await dialog.accept();
		});

		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.click('button:has-text("Open File")');
		const fileChooser = await fileChooserPromise;

		await fileChooser.setFiles({
			name: 'invalid.json',
			mimeType: 'application/json',
			buffer: Buffer.from(invalidContent)
		});
	});

	test('should reject non-JSON files', async ({ page }) => {
		page.on('dialog', async (dialog) => {
			expect(dialog.message()).toContain('Please select a JSON file');
			await dialog.accept();
		});

		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.click('button:has-text("Open File")');
		const fileChooser = await fileChooserPromise;

		await fileChooser.setFiles({
			name: 'test.txt',
			mimeType: 'text/plain',
			buffer: Buffer.from('plain text')
		});
	});

	test('should display file name correctly', async ({ page }) => {
		await expect(page.locator('text=sample.json')).toBeVisible();
	});

	test('should handle large JSON files', async ({ page }) => {
		const largeData = {
			items: Array.from({ length: 100 }, (_, i) => ({
				id: i,
				name: `Item ${i}`,
				data: { nested: `value-${i}` }
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

		await expect(page.locator('text=large.json')).toBeVisible();
		await expect(page.getByRole('button', { name: 'items []' })).toBeVisible();
		await expect(page.getByRole('button', { name: '100 items' })).toBeVisible();
	});

	test('should preserve data when switching views', async ({ page }) => {
		await page.waitForSelector('text=users');

		// Switch to table view
		await page.click('button:has-text("Table")');
		await expect(page.locator('th:has-text("key")')).toBeVisible();

		// Switch to text view
		await page.click('button:has-text("Text")');
		await expect(page.locator('textarea')).toBeVisible();

		// Switch back to tree view
		await page.click('button:has-text("Tree")');
		await expect(page.locator('text=users')).toBeVisible();
	});
});
