<script lang="ts">
	import { onMount } from 'svelte';
	import type { TableRow, JSONValue, JSONPath } from '$lib/types';
	import { safeClone, flattenObject, parseValue, setNestedValue, isComplex, sortByKey } from '$lib/utils/helpers';
	import { EDITOR_CONSTANTS } from '$lib/utils/constants';
	import DeleteKeyPopup from '../Popups/DeleteKeyPopup.svelte';

	let {
		focus,
		update,
		data = {}
	}: {
		focus: (e: JSONPath) => void;
		update: (e: JSONValue) => void;
		data: JSONValue;
		searchResults: Array<{ path: JSONPath; key: string; value: any; type: string }>;
	} = $props();

	let sortKey = $state('');
	let sortDirection: 'asc' | 'desc' = $state('asc');
	let editingCell: string | null = $state(null);
	let expandedCells = $state(new Set<string>());
	let contextMenu: { x: number; y: number; column: string } | null = $state(null);
	let showDeleteKeyPopup = $state(false);
	let keyToDelete = $state('');
	let columnWidths: Record<string, number> = $state({});
	let resizingColumn: string | null = $state(null);
	let resizeStartX = 0;
	let resizeStartWidth = 0;

	const flattenForTable = (obj: JSONValue, prefix = ''): TableRow[] => {
		const items: TableRow[] = [];

		if (Array.isArray(obj)) {
			obj.forEach((item, index) => {
				if (typeof item === 'object' && item !== null) {
					items.push({
						key: `${prefix}[${index}]`,
						path: [index],
						...flattenObject(item)
					});
				} else {
					items.push({
						key: `${prefix}[${index}]`,
						path: [index],
						value: item
					});
				}
			});
		} else if (typeof obj === 'object' && obj !== null) {
			const entries = Object.entries(obj as Record<string, any>);

			for (const [key, value] of entries) {
				if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
					const propCount = Object.keys(value).length;
					items.push({
						key,
						path: [key],
						value: `[${propCount} props]`
					});
				} else if (Array.isArray(value)) {
					items.push({
						key,
						path: [key],
						value: `[${value.length} items]`
					});
				} else {
					items.push({
						key,
						path: [key],
						value
					});
				}
			}
		}

		return items;
	};

	const updateValue = (path: JSONPath, newValue: string): void => {
		const newData = safeClone(data);
		setNestedValue(newData, path, parseValue(newValue));
		update(newData);
	};

	const handleDoubleClick = (path: JSONPath): void => {
		focus(path);
	};

	const autoResizeColumn = (column: string): void => {
		const cells = document.querySelectorAll(`[data-column="${column}"]`);
		let maxWidth: number = EDITOR_CONSTANTS.MIN_COL_WIDTH;

		cells.forEach((cell) => {
			const content = cell.textContent || '';
			const tempSpan = document.createElement('span');
			tempSpan.style.cssText = 'visibility:hidden;position:absolute;white-space:pre';
			tempSpan.style.font = window.getComputedStyle(cell).font;
			tempSpan.textContent = content;
			document.body.appendChild(tempSpan);
			const width = tempSpan.offsetWidth + 48;
			maxWidth = Math.max(maxWidth, width);
			document.body.removeChild(tempSpan);
		});

		columnWidths = {
			...columnWidths,
			[column]: Math.min(maxWidth, EDITOR_CONSTANTS.MAX_COL_WIDTH)
		};
	};

	const startResize = (e: MouseEvent, column: string): void => {
		e.preventDefault();
		e.stopPropagation();

		const allHeaders = document.querySelectorAll('th[data-column]');
		const newWidths: Record<string, number> = {};

		allHeaders.forEach((th) => {
			const col = th.getAttribute('data-column');
			if (col) {
				newWidths[col] = th.getBoundingClientRect().width;
			}
		});

		const th = (e.target as HTMLElement).closest('th');
		const actualWidth = th ? th.getBoundingClientRect().width : EDITOR_CONSTANTS.DEFAULT_COL_WIDTH;

		resizingColumn = column;
		resizeStartX = e.clientX;
		resizeStartWidth = actualWidth;
		columnWidths = newWidths;
	};

	const handleMouseMove = (e: MouseEvent): void => {
		if (!resizingColumn) return;
		const delta = e.clientX - resizeStartX;
		const newWidth = Math.max(
			EDITOR_CONSTANTS.MIN_COL_WIDTH,
			Math.min(EDITOR_CONSTANTS.MAX_COL_WIDTH, resizeStartWidth + delta)
		);
		columnWidths = { ...columnWidths, [resizingColumn]: newWidth };
	};

	const stopResize = (): void => {
		resizingColumn = null;
	};

	const getCellKey = (rowIndex: number, column: string): string => `${rowIndex}-${column}`;

	const startEditing = (rowIndex: number, column: string): void => {
		editingCell = getCellKey(rowIndex, column);
	};

	const stopEditing = (): void => {
		editingCell = null;
	};

	const handleContextMenu = (e: MouseEvent, column: string): void => {
		e.preventDefault();
		e.stopPropagation();
		contextMenu = { x: e.clientX, y: e.clientY, column };
	};

	const closeContextMenu = (): void => {
		contextMenu = null;
	};

	const handleExpandColumn = (): void => {
		if (!contextMenu) return;
		autoResizeColumn(contextMenu.column);
		closeContextMenu();
	};

	const handleSortByColumn = (): void => {
		if (!contextMenu) return;
		if (sortKey === contextMenu.column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = contextMenu.column;
			sortDirection = 'asc';
		}
		closeContextMenu();
	};

	const handleDeleteKey = (): void => {
		if (!contextMenu) return;
		keyToDelete = contextMenu.column;
		showDeleteKeyPopup = true;
		closeContextMenu();
	};

	onMount(() => {
		const handlers = {
			click: closeContextMenu,
			mousemove: handleMouseMove,
			mouseup: stopResize
		};

		Object.entries(handlers).forEach(([event, handler]) => {
			document.addEventListener(event, handler as EventListener);
		});

		return () => {
			Object.entries(handlers).forEach(([event, handler]) => {
				document.removeEventListener(event, handler as EventListener);
			});
		};
	});

	const tableData = $derived(flattenForTable(data));
	const columns = $derived(tableData.length > 0 ? Object.keys(tableData[0]).filter((k) => k !== 'path') : []);
	const sortedData = $derived(sortKey ? sortByKey(tableData, sortKey, sortDirection) : tableData);
	const isSimpleKeyValue = $derived(columns.length === 2 && columns.includes('key') && columns.includes('value'));
</script>

<div class="h-full overflow-auto" class:select-none={resizingColumn} class:cursor-col-resize={resizingColumn}>
	{#if columns.length > 0}
		<table class="w-full border-collapse" style="table-layout: auto;">
			<thead class="sticky top-0 z-10 bg-gradient-to-b from-gray-50 to-gray-100 shadow-sm">
				<tr>
					{#each columns as column}
						<th
							class="group relative cursor-pointer items-center space-x-2 border-b-2 border-gray-200 px-4 py-3 text-xs font-semibold tracking-wider text-gray-700 transition-colors hover:text-gray-900"
							data-column={column}
							style="min-width: {columnWidths[column] || EDITOR_CONSTANTS.DEFAULT_COL_WIDTH}px; width: {columnWidths[
								column
							] || EDITOR_CONSTANTS.DEFAULT_COL_WIDTH}px; max-width: {columnWidths[column] ||
								EDITOR_CONSTANTS.DEFAULT_COL_WIDTH}px;"
							oncontextmenu={(e) => handleContextMenu(e, column)}
							onclick={(e) => {
								if ((e.target as HTMLElement).closest('button[aria-label="Resize column"]')) return;
								if (sortKey === column) {
									sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
								} else {
									sortKey = column;
									sortDirection = 'asc';
								}
							}}
						>
							<div class="flex h-full w-full">
								<span class="flex-1 truncate text-left" title={column}>{column}</span>
								{#if sortKey === column}
									<svg
										class="h-3.5 w-3.5 flex-shrink-0 text-blue-600 transition-transform {sortDirection === 'desc'
											? 'rotate-180'
											: ''}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
									</svg>
								{/if}
							</div>
							<button
								class="absolute top-0 right-0 bottom-0 w-[8px] cursor-col-resize border-0 bg-transparent p-0 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-blue-400"
								onmousedown={(e) => {
									e.stopPropagation();
									startResize(e, column);
								}}
								ondblclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									autoResizeColumn(column);
								}}
								onclick={(e) => e.stopPropagation()}
								aria-label="Resize column"
							></button>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200 bg-white">
				{#each sortedData as row, rowIndex}
					<tr class="transition-colors duration-150 hover:bg-blue-50/30">
						{#each columns as column}
							{@const cellKey = getCellKey(rowIndex, column)}
							{@const isEditing = editingCell === cellKey}
							{@const cellValue = typeof row[column] === 'object' ? JSON.stringify(row[column]) : (row[column] ?? '')}
							{@const shouldTruncate = !isEditing && !expandedCells.has(cellKey)}
							<td class="relative border-r border-gray-100 px-4 py-2 text-sm text-gray-900" data-column={column}>
								{#if column === 'key'}
									<button
										class="w-full truncate rounded-md px-2 py-1 text-left font-medium text-blue-600 transition-all duration-200 hover:bg-blue-100"
										ondblclick={() => handleDoubleClick(row.path)}
									>
										{row[column]}
									</button>
								{:else if isComplex(row[column])}
									<button
										class="w-full truncate rounded-md px-2 py-1 text-left text-purple-600 transition-all duration-200 hover:bg-purple-100"
										ondblclick={() => handleDoubleClick(row.path)}
									>
										{row[column]}
									</button>
								{:else}
									<div class="relative w-full">
										{#if isEditing}
											<textarea
												value={cellValue}
												onchange={(e) => {
													updateValue(row.path, (e.target as HTMLTextAreaElement).value);
													stopEditing();
												}}
												onblur={stopEditing}
												onfocus={(e) => {
													const target = e.target as HTMLTextAreaElement;
													target.style.height = 'auto';
													target.style.height = Math.min(target.scrollHeight, EDITOR_CONSTANTS.MAX_CELL_HEIGHT) + 'px';
												}}
												oninput={(e) => {
													const target = e.target as HTMLTextAreaElement;
													target.style.height = 'auto';
													target.style.height = Math.min(target.scrollHeight, EDITOR_CONSTANTS.MAX_CELL_HEIGHT) + 'px';
												}}
												class="w-full resize-none overflow-auto rounded-md border border-blue-500 bg-white px-2 py-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
												rows="1"
											></textarea>
										{:else}
											<button
												class="w-full cursor-text overflow-hidden rounded-md border-0 bg-transparent px-2 py-1 transition-all duration-200 hover:bg-gray-50"
												class:line-clamp-2={shouldTruncate}
												style={shouldTruncate
													? ''
													: `max-height: ${EDITOR_CONSTANTS.MAX_CELL_HEIGHT}px; overflow-y: auto;`}
												onclick={() => startEditing(rowIndex, column)}
												ondblclick={(e) => {
													e.stopPropagation();
													const newSet = new Set(expandedCells);
													newSet.has(cellKey) ? newSet.delete(cellKey) : newSet.add(cellKey);
													expandedCells = newSet;
												}}
												tabindex="0"
											>
												{cellValue}
											</button>
										{/if}
									</div>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<div class="flex h-full items-center justify-center text-gray-500">No tabular data to display</div>
	{/if}
</div>

{#if contextMenu}
	<div
		class="fixed z-50 w-48 rounded-lg border border-gray-200 bg-white shadow-lg"
		style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
		onclick={(e) => e.stopPropagation()}
		onkeydown={() => {}}
		role="menu"
		tabindex="0"
	>
		<div class="py-1">
			<button
				class="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
				onclick={handleExpandColumn}
				type="button"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
				</svg>
				<span>Expand Column</span>
			</button>
			<button
				class="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
				onclick={handleSortByColumn}
				type="button"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
					/>
				</svg>
				<span>Sort By</span>
			</button>
			{#if !isSimpleKeyValue}
				<div class="my-1 border-t border-gray-200"></div>
				<button
					class="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-red-700 transition-colors hover:bg-red-50"
					onclick={handleDeleteKey}
					type="button"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/>
					</svg>
					<span>Delete Key</span>
				</button>
			{/if}
		</div>
	</div>
{/if}

{#if showDeleteKeyPopup}
	<DeleteKeyPopup
		{data}
		{keyToDelete}
		onDelete={(newData) => {
			update(newData);
			showDeleteKeyPopup = false;
		}}
		onClose={() => (showDeleteKeyPopup = false)}
	/>
{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
