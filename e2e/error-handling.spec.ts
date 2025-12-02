import { test, expect } from '@playwright/test';

test.describe('Error Handling and Edge Cases', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('text=users');
	});

	test.describe('Invalid JSON Handling', () => {
		test('should show error for invalid JSON in text view', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('{ invalid: json }');

			// Should show error message
			await expect(page.locator('text=JSON syntax error')).toBeVisible();
		});

		test('should show error line number', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('{\n  "valid": true,\n  invalid\n}');

			// Should highlight error line
			await expect(page.locator('text=JSON syntax error')).toBeVisible();
			await expect(page.getByText('JSON syntax error on line 3')).toBeVisible();
		});

		test('should recover from invalid JSON when fixed', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			// Enter invalid JSON
			await textarea.fill('{ invalid }');
			await expect(page.locator('text=JSON syntax error')).toBeVisible();

			// Fix it
			await textarea.fill('{"valid": true}');

			// Error should disappear
			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});
	});

	test.describe('Empty Data Handling', () => {
		test('should handle empty object', async ({ page }) => {
			await page.click('button:has-text("New File")');

			// Should show root with empty object
			await expect(page.locator('text=Root level')).toBeVisible();
		});

		test('should handle empty array', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('[]');

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should display empty object in tree view', async ({ page }) => {
			await page.click('button:has-text("New File")');

			// Switch to tree view
			await page.click('button:has-text("Tree")');

			// Should show root node
			await expect(page.getByText('untitled.json')).toBeVisible();
			await expect(page.getByRole('button', { name: 'root{}' })).toBeVisible();
			await expect(page.locator('text=0 props')).toBeVisible();
		});

		test('should display empty object in table view', async ({ page }) => {
			await page.click('button:has-text("New File")');
			await page.click('button:has-text("Table")');

			// Should show message or empty table
			await expect(page.locator('text=No tabular data').or(page.locator('table'))).toBeVisible();
		});

		test('should handle null values', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('{"value": null}');

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});
	});

	test.describe('Large Data Handling', () => {
		test('should handle large arrays', async ({ page }) => {
			const largeArray = {
				items: Array.from({ length: 1000 }, (_, i) => ({
					id: i,
					value: `item-${i}`
				}))
			};

			const fileChooserPromise = page.waitForEvent('filechooser');
			await page.click('button:has-text("Open File")');
			const fileChooser = await fileChooserPromise;

			await fileChooser.setFiles({
				name: 'large.json',
				mimeType: 'application/json',
				buffer: Buffer.from(JSON.stringify(largeArray))
			});

			await expect(page.locator('text=large.json')).toBeVisible();
			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle deeply nested objects', async ({ page }) => {
			let deep: any = { value: 'end' };
			for (let i = 0; i < 20; i++) {
				deep = { level: deep };
			}

			const fileChooserPromise = page.waitForEvent('filechooser');
			await page.click('button:has-text("Open File")');
			const fileChooser = await fileChooserPromise;

			await fileChooser.setFiles({
				name: 'deep.json',
				mimeType: 'application/json',
				buffer: Buffer.from(JSON.stringify(deep))
			});

			await expect(page.locator('text=deep.json')).toBeVisible();
		});

		test('should handle large text content', async ({ page }) => {
			const largeText = 'x'.repeat(10000);
			const data = { largeText };

			const fileChooserPromise = page.waitForEvent('filechooser');
			await page.click('button:has-text("Open File")');
			const fileChooser = await fileChooserPromise;

			await fileChooser.setFiles({
				name: 'large-text.json',
				mimeType: 'application/json',
				buffer: Buffer.from(JSON.stringify(data))
			});

			await expect(page.locator('text=large-text.json')).toBeVisible();
		});
	});

	test.describe('Special Characters', () => {
		test('should handle unicode characters', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('{"emoji": "😀", "chinese": "你好", "arabic": "مرحبا"}');

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle escaped characters', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('{"escaped": "Line 1\\nLine 2\\tTabbed"}');

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle special keys in objects', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('{"key.with.dots": true, "key/with/slashes": true}');

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});
	});

	test.describe('Browser Compatibility', () => {
		test('should work without console errors', async ({ page }) => {
			const errors: string[] = [];
			page.on('console', (msg) => {
				if (msg.type() === 'error') {
					errors.push(msg.text());
				}
			});

			await page.click('button:has-text("Table")');
			await page.click('button:has-text("Text")');
			await page.click('button:has-text("Tree")');

			// Should have no errors
			expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
		});

		test('should handle window resize', async ({ page }) => {
			await page.setViewportSize({ width: 800, height: 600 });
			await page.waitForTimeout(300);

			await expect(page.locator('h1:has-text("JSON Studio")')).toBeVisible();

			await page.setViewportSize({ width: 1920, height: 1080 });
			await page.waitForTimeout(300);

			await expect(page.locator('h1:has-text("JSON Studio")')).toBeVisible();
		});

		test('should handle small viewport', async ({ page }) => {
			await page.setViewportSize({ width: 400, height: 600 });

			// UI should still be functional
			await expect(page.locator('h1:has-text("JSON Studio")')).toBeVisible();
		});
	});

	test.describe('Edge Cases', () => {
		test('should handle mixed data types in array', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('[1, "string", true, null, {"obj": "value"}, [1,2,3]]');

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle numeric keys', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('{"0": "zero", "1": "one", "2": "two"}');

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle boolean primitive', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('true');

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle null primitive', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('null');

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle number primitive', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('42');

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle string primitive', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('"just a string"');

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle very long key names', async ({ page }) => {
			const longKey = 'a'.repeat(200);
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill(`{"${longKey}": "value"}`);

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle very long string values', async ({ page }) => {
			const longValue = 'x'.repeat(1000);
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill(`{"key": "${longValue}"}`);

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle duplicate keys', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			// JSON with duplicate keys (last one wins)
			await textarea.fill('{"key": "first", "key": "second"}');

			// Should still be valid JSON
			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle floating point precision', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('{"pi": 3.141592653589793, "small": 0.00000001}');

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle scientific notation', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('{"large": 1e10, "small": 1e-10}');

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle negative numbers', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('{"negative": -42, "negativeFloat": -3.14}');

			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});
	});

	test.describe('Memory and Performance', () => {
		test('should handle rapid data changes', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			for (let i = 0; i < 20; i++) {
				await textarea.fill(`{"iteration": ${i}}`);
				await page.waitForTimeout(50);
			}

			// Should still be responsive
			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});

		test('should handle undo/redo limit gracefully', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			// Make many changes (more than MAX_UNDO_STACK)
			for (let i = 0; i < 60; i++) {
				await textarea.fill(`{"change": ${i}}`);
				await page.waitForTimeout(10);
			}

			// Try to undo all
			for (let i = 0; i < 70; i++) {
				await page.keyboard.press('Control+z');
				await page.waitForTimeout(10);
			}

			// Should still be functional
			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});
	});
});
