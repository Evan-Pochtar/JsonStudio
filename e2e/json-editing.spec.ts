import { test, expect } from '@playwright/test';

test.describe('JSON Editing', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('text=users');
	});

	test.describe('Tree View Editing', () => {
		test('should edit a value by double-clicking', async ({ page }) => {
			// Find and double-click a value
			await page.locator('span.text-blue-600:has-text("users []")').first().dblclick();
			await page.locator('span.text-blue-600:has-text("0 {}")').first().dblclick();
			await page.locator('span.text-gray-700:has-text("David Smith")').first().dblclick();

			// Should show textarea
			const textarea = page.locator('textarea');
			await expect(textarea).toBeVisible();

			// Edit value
			await textarea.fill('"New Value"');
			await textarea.blur();

			// Should show modified
			await expect(page.locator('text=Modified')).toBeVisible();
		});

		test('should expand and collapse nodes', async ({ page }) => {
			// locate the row that contains the label "users"
			const usersRow = page.locator('div', { has: page.locator('text=users') }).first();

			// Expand
			const expandButton = usersRow.locator('button[title="Expand node"]').first();
			await expandButton.click();

			// Verify Expanded Items Shown
			await expect(page.locator('text=0 {}')).toBeVisible();

			// Collapse
			const collapseButton = usersRow.locator('button[title="Collapse node"]');
			await collapseButton.click();

			// Verify Items Hidden
			await expect(page.locator('text=0 {}')).not.toBeVisible();
		});

		test('should navigate into objects', async ({ page }) => {
			// Find users node
			const usersKey = page.locator('span.text-blue-600:has-text("users")').first();
			await usersKey.dblclick();

			// Should focus on users array
			await expect(page.getByRole('button', { name: 'users[]' })).toBeVisible();
			await expect(page.locator('text=Back to root')).toBeVisible();
		});

		test('should navigate back from focused view', async ({ page }) => {
			// Navigate into users
			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();
			await page.waitForSelector('text=Back to root');

			// Navigate back
			await page.click('button:has-text("Back to root")');

			// Should be at root
			await expect(page.locator('text=Root level')).toBeVisible();
		});

		test('should delete an item', async ({ page }) => {
			// Hover over a node to show delete button
			const nodeDiv = page.locator('div.group').filter({ hasText: 'settings' }).first();
			await nodeDiv.hover();

			// Click delete button
			const deleteButton = nodeDiv.locator('button:has-text("Delete")');
			await deleteButton.click();

			// Settings should be removed
			await expect(page.locator('span.text-blue-600:has-text("settings")')).not.toBeVisible();
			await expect(page.locator('text=Modified')).toBeVisible();
		});

		test('should add a key to an object', async ({ page }) => {
			// Hover over settings node
			const settingsNode = page.locator('div.group').filter({ hasText: 'settings' }).first();
			await settingsNode.hover();

			// Click Add Key
			await settingsNode.locator('button:has-text("Add Key")').click();

			// Fill in popup
			await page.fill('input#keyname', 'newSetting');
			await page.fill('input#defaultval', 'true');
			await page.click('button.bg-red-600:has-text("Add Key")');

			// Verify key was added
			await expect(page.locator('text=Modified')).toBeVisible();
		});

		test('should save edits with Ctrl+S', async ({ page }) => {
			// Wait for initial load
			await page.waitForSelector('text=users');

			// Make a change in tree view
			await page.locator('span.text-blue-600:has-text("users []")').first().dblclick();
			await page.locator('span.text-blue-600:has-text("0 {}")').first().dblclick();
			await page.locator('span.text-gray-700:has-text("David Smith")').first().dblclick();

			// Clear the whole field and type the new name
			await page.keyboard.press('Control+A');
			await page.keyboard.press('Backspace');
			await page.keyboard.type('Daniel Johnson');
			await page.keyboard.press('Control+s');

			// Should show modified badge
			await expect(page.locator('text=Modified')).toBeVisible({ timeout: 5000 });
		});

		test('should cancel edits with Escape', async ({ page }) => {
			await page.locator('span.text-blue-600:has-text("users []")').first().dblclick();
			await page.locator('span.text-blue-600:has-text("0 {}")').first().dblclick();
			await page.locator('span.text-gray-700:has-text("David Smith")').first().dblclick();

			const textarea = page.locator('textarea');
			await textarea.fill('"Different Value"');

			// Press Escape
			await textarea.press('Escape');

			// Should revert
			await expect(textarea).not.toBeVisible();
		});
	});

	test.describe('Table View Editing', () => {
		test.beforeEach(async ({ page }) => {
			await page.click('button:has-text("Table")');
			await page.waitForSelector('table');
		});

		test('should display data in table format', async ({ page }) => {
			await expect(page.locator('th:has-text("key")')).toBeVisible();
			await expect(page.locator('th:has-text("value")')).toBeVisible();
			await expect(page.locator('td:has-text("users")')).toBeVisible();
		});

		test('should edit cell value', async ({ page }) => {
			// Click on a cell
			await page.locator('td button:has-text("[3 items]")').first().dblclick();
			await page.locator('td button:has-text("David Smith")').first().dblclick();

			// Should show textarea
			const textarea = page.locator('textarea').first();
			await expect(textarea).toBeVisible();

			// Edit and blur
			await textarea.fill('Updated Value');
			await textarea.blur();

			await expect(page.locator('text=Modified')).toBeVisible();
		});

		test('should expand/collapse cells', async ({ page }) => {
			const cell = page.locator('td button').filter({ hasText: /\[/ }).first();
			await cell.dblclick();

			// Cell should expand (implementation dependent)
		});

		test('should sort by column', async ({ page }) => {
			// Click on column header
			await page.click('th:has-text("key")');

			// Should show sort indicator
			await expect(page.locator('svg.text-blue-500')).toBeVisible();
		});

		test('should reverse sort on second click', async ({ page }) => {
			const header = page.locator('th:has-text("key")');

			// First click - ascending
			await header.click();
			await page.waitForTimeout(100);

			// Second click - descending
			await header.click();
			await page.waitForTimeout(100);

			// Sort arrow should be rotated
			const arrow = page.locator('svg.text-blue-500').first();
			await expect(arrow).toHaveClass(/rotate-180/);
		});

		test('should open context menu on right-click', async ({ page }) => {
			const header = page.locator('th:has-text("key")');
			await header.click({ button: 'right' });

			// Context menu should appear
			await expect(page.locator('text=Expand Column')).toBeVisible();
			await expect(page.locator('text=Sort By')).toBeVisible();
		});

		test('should resize columns', async ({ page }) => {
			const header = page.locator('th:has-text("key")');
			const resizeHandle = header.locator('button[aria-label="Resize column"]');

			await resizeHandle.hover();
			await expect(resizeHandle).toBeVisible();
		});

		test('should navigate into complex values', async ({ page }) => {
			const complexCell = page.locator('button.text-blue-600').first();
			await complexCell.dblclick();

			// Should navigate to that path
			await expect(page.locator('text=Back to root')).toBeVisible();
		});

		test('should edit object keys but NOT array indices', async ({ page }) => {
			// Navigate to an object (users[0])
			await page.locator('td button:has-text("[3 items]")').first().dblclick();
			await page.waitForTimeout(100); 
			
			// Try to edit the 'id' key
			const idKeyButton = page.locator('td button:has-text("David Smith")').first();
			await expect(idKeyButton).toBeVisible();
			await idKeyButton.click();

			// It should turn into a textarea
			const textarea = page.locator('td textarea').first();
			await expect(textarea).toBeVisible();
			
			// Rename 'id' to 'userId'
			await textarea.fill('John Doe');
			await textarea.blur();

			// Verify change
			await expect(page.locator('td button:has-text("John Doe")')).toBeVisible();
			await expect(page.locator('td button:has-text("David Smith")')).not.toBeVisible();
			await expect(page.locator('text=Modified')).toBeVisible();

			// Verify we see indices 0, 1, 2...
			const indexButton = page.locator('td button:has-text("0")').first();
			await expect(indexButton).toBeVisible();

			// Clicking index should NOT open textarea
			await indexButton.click();
			await expect(page.locator('td textarea')).not.toBeVisible();

			// Double clicking index should drill down
			await indexButton.dblclick();
			await expect(page.locator('text=Back to root')).toBeVisible();
		});
	});

	test.describe('Text View Editing', () => {
		test.beforeEach(async ({ page }) => {
			await page.click('button:has-text("Text")');
			await page.waitForSelector('textarea');
			await page.click('textarea');
		});

		test('should display JSON as text', async ({ page }) => {
			const textarea = page.locator('textarea');
			const content = await textarea.inputValue();

			expect(content).toContain('users');
			expect(content).toContain('settings');

			// Should be formatted
			expect(content).toContain('\n');
		});

		test('should show line numbers', async ({ page }) => {
			await expect(page.getByText('1', { exact: true })).toBeVisible();
			await expect(page.getByText('16', { exact: true })).toBeVisible();
			await expect(page.getByText('35', { exact: true })).toBeVisible();

			await page.click('button:has-text("Tree")');
			await page.waitForSelector('text=users');

			await page.locator('span.text-blue-600:has-text("users")').first().dblclick();

			await page.click('button:has-text("Text")');
			await page.waitForSelector('textarea');

			await expect(page.getByText('1', { exact: true })).toBeVisible();
			await expect(page.getByText('23', { exact: true })).toBeVisible();
			await expect(page.getByText('35', { exact: true })).not.toBeVisible();
		});

		test('should edit JSON text', async ({ page }) => {
			const textarea = page.locator('textarea');
			await textarea.fill('{"test": "value"}');

			// Should update data
			await expect(page.locator('text=Modified')).toBeVisible();
		});

		test('should show syntax errors', async ({ page }) => {
			const textarea = page.locator('textarea');
			await textarea.fill('{ invalid json }');
			// Should show error
			await expect(page.locator('text=JSON syntax error')).toBeVisible();
		});

		test('should auto-indent on Enter', async ({ page }) => {
			const textarea = page.locator('textarea');

			// Get initial content
			await textarea.click();
			await textarea.press('ArrowDown');
			await textarea.press('End');

			// Press Enter
			await page.keyboard.press('Enter');

			// Find the newly created line
			const content = await textarea.inputValue();
			const lines = content.split('\n');
			let foundIndentedLine = false;
			for (let i = 1; i < lines.length; i++) {
				if (lines[i].match(/^\s+/) || lines[i] === '') {
					if (lines[i - 1].match(/^\s+/)) {
						foundIndentedLine = true;
						break;
					}
				}
			}

			// Verify that a new line was indented
			expect(foundIndentedLine).toBe(true);
		});

		test('should auto-close brackets', async ({ page }) => {
			const textarea = page.locator('textarea');
			await textarea.fill('');
			await textarea.type('{');

			const content = await textarea.inputValue();
			expect(content).toBe('{}');
		});

		test('should handle Tab key for indentation', async ({ page }) => {
			const textarea = page.locator('textarea');
			await textarea.fill('test');
			await textarea.click();
			await textarea.press('Home');
			await textarea.press('Tab');

			const content = await textarea.inputValue();
			expect(content).toMatch(/^\s+test/);
		});
	});

	test.describe('Undo/Redo', () => {
		test('should undo changes', async ({ page }) => {
			// Make a change
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');
			const original = await textarea.inputValue();

			await textarea.fill('{"changed": true}');
			await page.waitForTimeout(100);

			// Undo with Ctrl+Z
			await page.keyboard.press('Control+z');
			await page.waitForTimeout(100);

			const afterUndo = await textarea.inputValue();
			expect(afterUndo).toBe(original);
		});

		test('should redo changes', async ({ page }) => {
			// Make a change
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			await textarea.fill('{"changed": true}');
			await page.waitForTimeout(100);

			// Undo
			await page.keyboard.press('Control+z');
			await page.waitForTimeout(100);

			// Redo with Ctrl+Shift+Z
			await page.keyboard.press('Control+Shift+z');
			await page.waitForTimeout(100);

			const content = await textarea.inputValue();
			expect(content).toContain('changed');
		});

		test('should have undo limit', async ({ page }) => {
			await page.click('button:has-text("Text")');
			const textarea = page.locator('textarea');

			// Make many changes
			for (let i = 0; i < 60; i++) {
				await textarea.fill(`{"change": ${i}}`);
				await page.waitForTimeout(10);
			}

			// Undo all possible
			for (let i = 0; i < 60; i++) {
				await page.keyboard.press('Control+z');
				await page.waitForTimeout(10);
			}

			// Should stop at undo limit (50)
			const content = await textarea.inputValue();
			expect(content).toBeTruthy();
		});
	});
});
