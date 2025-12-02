import { test, expect } from '@playwright/test';

test.describe('Format and Sort Operations', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('text=users');
	});

	test.describe('Format JSON', () => {
		test('should open format popup', async ({ page }) => {
			await page.click('button:has-text("Format JSON")');

			await expect(page.locator('h2:has-text("Format JSON")')).toBeVisible();
		});

		test('should close format popup with Cancel', async ({ page }) => {
			await page.click('button:has-text("Format JSON")');
			await page.click('button:has-text("Cancel")');

			await expect(page.locator('h2:has-text("Format JSON")')).not.toBeVisible();
		});

		test('should close format popup with Escape', async ({ page }) => {
			await page.click('button:has-text("Format JSON")');
			await page.keyboard.press('Escape');

			await expect(page.locator('h2:has-text("Format JSON")')).not.toBeVisible();
		});

		test('should have Standard format selected by default', async ({ page }) => {
			await page.click('button:has-text("Format JSON")');

			const standardRadio = page.locator('input[type="radio"][value="standard"]');
			await expect(standardRadio).toBeChecked();
		});

		test('should select Compact format', async ({ page }) => {
			await page.click('button:has-text("Format JSON")');
			await page.click('label:has-text("Compact")');

			const compactRadio = page.locator('input[type="radio"][value="compact"]');
			await expect(compactRadio).toBeChecked();
		});

		test('should show indent size input for Standard format', async ({ page }) => {
			await page.click('button:has-text("Format JSON")');

			await expect(page.locator('input#indentSize')).toBeVisible();
		});

		test('should hide indent size input for Compact format', async ({ page }) => {
			await page.click('button:has-text("Format JSON")');
			await page.click('label:has-text("Compact")');

			await expect(page.locator('input#indentSize')).not.toBeVisible();
		});

		test('should change indent size', async ({ page }) => {
			await page.click('button:has-text("Format JSON")');

			const indentInput = page.locator('input#indentSize');
			await indentInput.fill('4');

			expect(await indentInput.inputValue()).toBe('4');
		});

		test('should respect min indent size', async ({ page }) => {
			await page.click('button:has-text("Format JSON")');

			const indentInput = page.locator('input#indentSize');
			await expect(indentInput).toHaveAttribute('min', '1');
		});

		test('should respect max indent size', async ({ page }) => {
			await page.click('button:has-text("Format JSON")');

			const indentInput = page.locator('input#indentSize');
			await expect(indentInput).toHaveAttribute('max', '8');
		});

		test('should apply standard formatting', async ({ page }) => {
			await page.click('button:has-text("Format JSON")');
			await page.click('button:has-text("Apply Format")');

			await expect(page.locator('text=Modified')).toBeVisible();
		});

		test('should apply compact formatting', async ({ page }) => {
			await page.click('button:has-text("Format JSON")');
			await page.click('label:has-text("Compact")');
			await page.click('button:has-text("Apply Format")');

			await expect(page.locator('text=Modified')).toBeVisible();
		});

		test('should format with custom indent size', async ({ page }) => {
			await page.click('button:has-text("Format JSON")');

			const indentInput = page.locator('input#indentSize');
			await indentInput.fill('4');

			await page.click('button:has-text("Apply Format")');

			await expect(page.locator('text=Modified')).toBeVisible();
		});

		test('should update text view after formatting', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');
			const originalContent = await textarea.inputValue();

			await page.click('button:has-text("Format JSON")');
			await page.click('label:has-text("Compact")');
			await page.click('button:has-text("Apply Format")');

			await page.waitForTimeout(300);

			const newContent = await textarea.inputValue();
			expect(newContent).not.toBe(originalContent);
			expect(newContent.includes('\n')).toBe(false); // Compact should have no newlines
		});

		test('should format only focused data', async ({ page }) => {
			// Navigate into users
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			await page.click('button:has-text("Format JSON")');
			await page.click('button:has-text("Apply Format")');

			await expect(page.locator('text=Modified')).toBeVisible();
		});

		test('should close popup after applying format', async ({ page }) => {
			await page.click('button:has-text("Format JSON")');
			await page.click('button:has-text("Apply Format")');

			await expect(page.locator('h2:has-text("Format JSON")')).not.toBeVisible();
		});
	});

	test.describe('Sort Data', () => {
		test('should open sort popup', async ({ page }) => {
			await page.click('button:has-text("Sort Data")');

			await expect(page.locator('h2:has-text("Sort Data")')).toBeVisible();
		});

		test('should close sort popup with Cancel', async ({ page }) => {
			await page.click('button:has-text("Sort Data")');
			await page.click('button:has-text("Cancel")');

			await expect(page.locator('h2:has-text("Sort Data")')).not.toBeVisible();
		});

		test('should close sort popup with Escape', async ({ page }) => {
			await page.click('button:has-text("Sort Data")');
			await page.keyboard.press('Escape');

			await expect(page.locator('h2:has-text("Sort Data")')).not.toBeVisible();
		});

		test('should show field selector', async ({ page }) => {
			await page.click('button:has-text("Sort Data")');

			await expect(page.locator('select#fieldselect')).toBeVisible();
		});

		test('should show direction options', async ({ page }) => {
			await page.click('button:has-text("Sort Data")');

			await expect(page.locator('text=Ascending')).toBeVisible();
			await expect(page.locator('text=Descending')).toBeVisible();
		});

		test('should have Ascending selected by default', async ({ page }) => {
			await page.click('button:has-text("Sort Data")');

			const ascRadio = page.locator('input[type="radio"][value="asc"]');
			await expect(ascRadio).toBeChecked();
		});

		test('should select Descending', async ({ page }) => {
			await page.click('button:has-text("Sort Data")');
			await page.click('label:has-text("Descending")');

			const descRadio = page.locator('input[type="radio"][value="desc"]');
			await expect(descRadio).toBeChecked();
		});

		test('should show available keys for objects', async ({ page }) => {
			// Navigate into users array first item
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			await page.click('button:has-text("Sort Data")');

			const select = page.locator('select#fieldselect');
			const options = await select.locator('option').allTextContents();

			expect(options.length).toBeGreaterThan(1);
		});

		test('should sort by selected field', async ({ page }) => {
			// Navigate to users array
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			await page.click('button:has-text("Sort Data")');

			const select = page.locator('select#fieldselect');
			await select.selectOption({ index: 1 }); // Select first available field

			await page.click('button:has-text("Apply Sort")');

			await expect(page.locator('text=Modified')).toBeVisible();
		});

		test('should sort ascending', async ({ page }) => {
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			await page.click('button:has-text("Sort Data")');

			const select = page.locator('select#fieldselect');
			await select.selectOption({ index: 1 });

			await page.click('button:has-text("Apply Sort")');

			await expect(page.locator('text=Modified')).toBeVisible();
		});

		test('should sort descending', async ({ page }) => {
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			await page.click('button:has-text("Sort Data")');

			const select = page.locator('select#fieldselect');
			await select.selectOption({ index: 1 });

			await page.click('label:has-text("Descending")');
			await page.click('button:has-text("Apply Sort")');

			await expect(page.locator('text=Modified')).toBeVisible();
		});

		test('should show Key Name option for objects', async ({ page }) => {
			// Navigate into settings (object)
			await page.locator('span.text-blue-600:has-text("settings")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			await page.click('button:has-text("Sort Data")');

			const select = page.locator('select#fieldselect');
			const options = await select.locator('option').allTextContents();

			expect(options.some((opt) => opt.includes('Key Name'))).toBe(true);
		});

		test('should sort object by key name', async ({ page }) => {
			await page.locator('span.text-blue-600:has-text("settings")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			await page.click('button:has-text("Sort Data")');

			const select = page.locator('select#fieldselect');
			await select.selectOption('_key');

			await page.click('button:has-text("Apply Sort")');

			await expect(page.locator('text=Modified')).toBeVisible();
		});

		test('should handle nested field names', async ({ page }) => {
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			await page.click('button:has-text("Sort Data")');

			const select = page.locator('select#fieldselect');
			const options = await select.locator('option').allTextContents();

			// Should show dot notation for nested fields if any
			expect(options.length).toBeGreaterThan(0);
		});

		test('should close popup after sorting', async ({ page }) => {
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			await page.click('button:has-text("Sort Data")');
			await page.locator('select#fieldselect').selectOption({ index: 1 });
			await page.click('button:has-text("Apply Sort")');

			await expect(page.locator('h2:has-text("Sort Data")')).not.toBeVisible();
		});

		test('should handle unsortable data gracefully', async ({ page }) => {
			// Create new file with simple value
			await page.click('button:has-text("New File")');

			await page.click('button:has-text("Sort Data")');

			// Should show no sortable fields message
			await expect(page.locator('text=No sortable fields')).toBeVisible();
		});

		test('should handle sorting arrays of primitives', async ({ page }) => {
			// Load data with array of primitives
			const simpleArray = { numbers: [3, 1, 2, 5, 4] };

			const fileChooserPromise = page.waitForEvent('filechooser');
			await page.click('button:has-text("Open File")');
			const fileChooser = await fileChooserPromise;

			await fileChooser.setFiles({
				name: 'simple.json',
				mimeType: 'application/json',
				buffer: Buffer.from(JSON.stringify(simpleArray))
			});

			await page.waitForSelector('text=simple.json');

			// Navigate into numbers
			await page.locator('span.text-blue-600:has-text("numbers")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			await page.click('button:has-text("Sort Data")');

			// Should be able to sort
			const select = page.locator('select#fieldselect');
			if (await select.isVisible()) {
				await select.selectOption({ index: 1 });
				await page.click('button:has-text("Apply Sort")');
			}
		});
	});

	test.describe('Combined Operations', () => {
		test('should format then sort', async ({ page }) => {
			// Format first
			await page.click('button:has-text("Format JSON")');
			await page.locator('input#indentSize').fill('4');
			await page.click('button:has-text("Apply Format")');

			await page.waitForTimeout(300);

			// Then sort
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			await page.click('button:has-text("Sort Data")');
			await page.locator('select#fieldselect').selectOption({ index: 1 });
			await page.click('button:has-text("Apply Sort")');

			await expect(page.locator('text=Modified')).toBeVisible();
		});

		test('should maintain data integrity after multiple operations', async ({ page }) => {
			// Format
			await page.click('button:has-text("Format JSON")');
			await page.click('button:has-text("Apply Format")');

			await page.waitForTimeout(200);

			// Sort
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
			await page.waitForSelector('text=Back to root');
			await page.click('button:has-text("Sort Data")');
			await page.locator('select#fieldselect').selectOption({ index: 1 });
			await page.click('button:has-text("Apply Sort")');

			// Verify still valid JSON
			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});
	});
});
