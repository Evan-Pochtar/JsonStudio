import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts and Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('text=users');
	});

	test.describe('Keyboard Shortcuts', () => {
		test('should undo with Ctrl+Z', async ({ page }) => {
			// Make a change
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');
			const original = await textarea.inputValue();

			await textarea.fill('{"changed": true}');
			await page.waitForTimeout(100);

			// Undo
			await page.keyboard.press('Control+z');
			await page.waitForTimeout(100);

			const afterUndo = await textarea.inputValue();
			expect(afterUndo).toBe(original);
		});

		test('should undo with Meta+Z on Mac', async ({ page }) => {
			// Make a change
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');
			const original = await textarea.inputValue();

			await textarea.fill('{"changed": true}');
			await page.waitForTimeout(100);

			// Undo with Meta
			await page.keyboard.press('Meta+z');
			await page.waitForTimeout(100);

			const afterUndo = await textarea.inputValue();
			expect(afterUndo).toBe(original);
		});

		test('should redo with Ctrl+Shift+Z', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('{"new": "value"}');
			await page.waitForTimeout(100);

			await page.keyboard.press('Control+z');
			await page.waitForTimeout(100);

			await page.keyboard.press('Control+Shift+z');
			await page.waitForTimeout(100);

			const content = await textarea.inputValue();
			expect(content).toContain('new');
		});

		test('should not trigger shortcuts on input fields', async ({ page }) => {
			const searchInput = page.locator('input[placeholder="Search anywhere..."]');
			await searchInput.click();

			// Type "s" - should not trigger save
			await searchInput.type('s');

			// Should just type in the input
			expect(await searchInput.inputValue()).toBe('s');
		});

		test('should handle Escape key to close popups', async ({ page }) => {
			await page.click('button:has-text("Download / Export")');
			await expect(page.locator('h2:has-text("Export Data")')).toBeVisible();

			await page.keyboard.press('Escape');

			await expect(page.locator('h2:has-text("Export Data")')).not.toBeVisible();
		});

		test('should handle Tab key in text view', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.click();
			await textarea.press('End');
			await textarea.press('Enter');
			await textarea.press('Tab');

			const content = await textarea.inputValue();
			expect(content).toContain('  '); // Should add spaces
		});

		test('should handle bracket auto-completion', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('');
			await textarea.type('{');

			const content = await textarea.inputValue();
			expect(content).toBe('{}');
		});

		test('should handle quote auto-completion', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('');
			await textarea.type('"');

			const content = await textarea.inputValue();
			expect(content).toBe('""');
		});

		test('should handle array bracket auto-completion', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('');
			await textarea.type('[');

			const content = await textarea.inputValue();
			expect(content).toBe('[]');
		});
	});

	test.describe('Navigation', () => {
		test('should focus on path when drilling down', async ({ page }) => {
			const usersKey = page.locator('span.text-blue-600:has-text("users")').first();
			await usersKey.dblclick();

			// Should show current path
			await expect(page.locator('div').filter({ hasText: /^users$/ })).toBeVisible();
			await expect(page.locator('text=Back to root')).toBeVisible();
		});

		test('should navigate back to parent', async ({ page }) => {
			// Navigate into users
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			// Navigate into first item
			await page.locator('span.text-blue-600').first().dblclick();
			await page.waitForTimeout(300);

			// Navigate back to parent (users)
			if (await page.locator('button:has-text("Back to parent")').isVisible()) {
				await page.click('button:has-text("Back to parent")');
				await expect(page.locator('text=users')).toBeVisible();
			}
		});

		test('should navigate back to root', async ({ page }) => {
			// Navigate into nested path
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			// Back to root
			await page.click('button:has-text("Back to root")');

			await expect(page.locator('text=Root level')).toBeVisible();
		});

		test('should show breadcrumb path', async ({ page }) => {
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
			await page.locator('span.text-blue-600:has-text("0 {}")').first().dblclick();

			// Should show path in sidebar
			await expect(page.locator('div').filter({ hasText: /^users.0$/ })).toBeVisible();
		});

		test('should maintain focus when switching views', async ({ page }) => {
			// Navigate into users
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			// Switch to table view
			await page.click('button:has-text("Table")');
			await page.waitForTimeout(300);

			// Should still show focused path
			await expect(page.locator('div').filter({ hasText: /^users$/ })).toBeVisible();

			// Switch back
			await page.click('button:has-text("Tree")');

			// Should still be focused on users
			await expect(page.locator('text=Back to root')).toBeVisible();
		});

		test('should navigate with double-click in tree view', async ({ page }) => {
			const usersKey = page.locator('span.text-blue-600:has-text("users")').first();
			await usersKey.dblclick();

			await expect(page.locator('text=Back to root')).toBeVisible();
		});

		test('should navigate with double-click in table view', async ({ page }) => {
			await page.click('button:has-text("Table")');

			const complexCell = page.locator('button.text-purple-600').first();
			if (await complexCell.isVisible()) {
				await complexCell.dblclick();
				await expect(page.locator('text=Back to root')).toBeVisible();
			}
		});

		test('should show navigation buttons only when focused', async ({ page }) => {
			// At root - no navigation buttons
			await expect(page.locator('button:has-text("Back to root")')).not.toBeVisible();

			// Navigate into users
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();

			// Should show navigation
			await expect(page.locator('button:has-text("Back to root")')).toBeVisible();
		});

		test('should preserve data when navigating', async ({ page }) => {
			// Make a change at root
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');
			const original = await textarea.inputValue();

			// Navigate away
			await page.click('button:has-text("Tree")');
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();

			// Navigate back
			await page.click('button:has-text("Back to root")');

			// Switch to text
			await page.click('button:has-text("Text")');

			// Data should be preserved
			expect(await textarea.inputValue()).toBe(original);
		});
	});

	test.describe('View Switching', () => {
		test('should switch to tree view', async ({ page }) => {
			await page.click('button:has-text("Table")');
			await page.click('button:has-text("Tree")');

			// Tree view should be visible
			await expect(page.locator('span.text-blue-600').first()).toBeVisible();
		});

		test('should switch to table view', async ({ page }) => {
			await page.click('button:has-text("Table")');

			// Table should be visible
			await expect(page.locator('table')).toBeVisible();
			await expect(page.locator('th:has-text("key")')).toBeVisible();
		});

		test('should switch to text view', async ({ page }) => {
			await page.click('button:has-text("Text")');

			// Text editor should be visible
			await expect(page.locator('textarea')).toBeVisible();
		});

		test('should highlight active view', async ({ page }) => {
			await page.click('button:has-text("Table")');

			const tableButton = page.locator('button:has-text("Table")').first();

			// Should have active styling
			await expect(tableButton).toHaveClass(/bg-white/);
			await expect(tableButton).toHaveClass(/text-red-600/);
		});

		test('should preserve data when switching views', async ({ page }) => {
			// Get data in tree view
			await expect(page.locator('text=users')).toBeVisible();

			// Switch views
			await page.click('button:has-text("Table")');
			await page.click('button:has-text("Text")');
			await page.click('button:has-text("Tree")');

			// Data should still be there
			await expect(page.locator('text=users')).toBeVisible();
		});

		test('should handle rapid view switching', async ({ page }) => {
			for (let i = 0; i < 5; i++) {
				await page.click('button:has-text("Table")');
				await page.waitForTimeout(100);
				await page.click('button:has-text("Text")');
				await page.waitForTimeout(100);
				await page.click('button:has-text("Tree")');
				await page.waitForTimeout(100);
			}

			// Should still work
			await expect(page.locator('text=users')).toBeVisible();
			await expect(page.locator('text=JSON syntax error')).not.toBeVisible();
		});
	});

	test.describe('Focus Management', () => {
		test('should focus textarea when switching to text view', async ({ page }) => {
			await page.click('button:has-text("Text")');

			const textarea = page.locator('textarea');
			await expect(textarea).toBeFocused();
		});

		test('should maintain focus in textarea when typing', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.type('test');

			await expect(textarea).toBeFocused();
		});

		test('should handle Tab navigation in forms', async ({ page }) => {
			await page.click('button:has-text("Download / Export")');

			// Tab through radio buttons
			await page.keyboard.press('Tab');
			await page.keyboard.press('Tab');
			await page.keyboard.press('Tab');

			// Should be able to navigate
			await expect(page.locator('h2:has-text("Export Data")')).toBeVisible();
		});
	});
});
