<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
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
	let notification: { message: string; type: 'error' } | null = $state(null);

	function flattenForTable(obj: JSONValue, prefix = ''): TableRow[] {
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
	}

	function updateValue(path: JSONPath, newValue: string): void {
		const newData = safeClone(data);
		setNestedValue(newData, path, parseValue(newValue));
		update(newData);
	}

	function updateKey(oldKey: string, newKey: string): void {
		if (oldKey === newKey || !newKey.trim()) return;
		if (Array.isArray(data)) return;
		const newData = safeClone(data) as Record<string, any>;

		if (Object.prototype.hasOwnProperty.call(newData, newKey)) {
			notification = { message: `Key "${newKey}" already exists`, type: 'error' };
			setTimeout(() => {
				notification = null;
			}, 3000);
			return;
		}

		const result: Record<string, any> = {};
		for (const key of Object.keys(newData)) {
			if (key === oldKey) {
				result[newKey] = newData[key];
			} else {
				result[key] = newData[key];
			}
		}

		update(result);
	}

	function handleDoubleClick(path: JSONPath): void {
		focus(path);
	}

	function autoResizeColumn(column: string): void {
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
	}

	function startResize(e: MouseEvent, column: string): void {
		e.preventDefault();
		e.stopPropagation();

		const allHeaders = document.querySelectorAll('th[data-column]');
		const newWidths: Record<string, number> = { ...columnWidths };

		allHeaders.forEach((th) => {
			const col = th.getAttribute('data-column');
			if (col && !newWidths[col]) {
				newWidths[col] = th.getBoundingClientRect().width;
			}
		});

		const th = (e.target as HTMLElement).closest('th');
		const actualWidth = th ? th.getBoundingClientRect().width : EDITOR_CONSTANTS.DEFAULT_COL_WIDTH;

		resizingColumn = column;
		resizeStartX = e.clientX;
		resizeStartWidth = actualWidth;
		columnWidths = newWidths;
	}

	function handleMouseMove(e: MouseEvent): void {
		if (!resizingColumn) return;
		const delta = e.clientX - resizeStartX;
		const newWidth = Math.max(
			EDITOR_CONSTANTS.MIN_COL_WIDTH,
			Math.min(EDITOR_CONSTANTS.MAX_COL_WIDTH, resizeStartWidth + delta)
		);
		columnWidths = { ...columnWidths, [resizingColumn]: newWidth };
	}

	function stopResize(): void {
		resizingColumn = null;
	}

	function getCellKey(rowIndex: number, column: string): string {
		return `${rowIndex}-${column}`;
	}

	function startEditing(rowIndex: number, column: string): void {
		editingCell = getCellKey(rowIndex, column);
	}

	function stopEditing(): void {
		editingCell = null;
	}

	function handleContextMenu(e: MouseEvent, column: string): void {
		e.preventDefault();
		e.stopPropagation();
		contextMenu = { x: e.clientX, y: e.clientY, column };
	}

	function closeContextMenu(): void {
		contextMenu = null;
	}

	function handleExpandColumn(): void {
		if (!contextMenu) return;
		autoResizeColumn(contextMenu.column);
		closeContextMenu();
	}

	function handleSortByColumn(): void {
		if (!contextMenu) return;
		if (sortKey === contextMenu.column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = contextMenu.column;
			sortDirection = 'asc';
		}
		closeContextMenu();
	}

	function handleDeleteKey(): void {
		if (!contextMenu) return;
		keyToDelete = contextMenu.column;
		showDeleteKeyPopup = true;
		closeContextMenu();
	}

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

	function isSummaryValue(val: any): boolean {
		return typeof val === 'string' && /^\[\d+ (items|props)\]$/.test(val);
	}

	const tableData = $derived(flattenForTable(data));
	const columns = $derived(tableData.length > 0 ? Object.keys(tableData[0]).filter((k) => k !== 'path') : []);
	const sortedData = $derived(sortKey ? sortByKey(tableData, sortKey, sortDirection) : tableData);
	const isSimpleKeyValue = $derived(columns.length === 2 && columns.includes('key') && columns.includes('value'));
	const isArrayView = $derived(Array.isArray(data));

	$effect(() => {
		const _ = columns;
		columnWidths = {};
	});
</script>

<!-- svelte-ignore a11y_autofocus -->
<div class="h-full overflow-auto bg-white" class:select-none={resizingColumn} class:cursor-col-resize={resizingColumn}>
	{#if columns.length > 0}
		<table class="w-full border-collapse text-left text-sm" style="table-layout: auto;">
			<thead class="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 shadow-sm">
				<tr>
					{#each columns as column}
						<th
							class="group relative cursor-pointer px-4 py-3 text-xs font-semibold tracking-wider whitespace-nowrap text-gray-500 uppercase"
							data-column={column}
							style="
								min-width: {columnWidths[column] || 100}px; 
								width: {columnWidths[column] ? `${columnWidths[column]}px` : 'auto'}; 
								max-width: {columnWidths[column] ? `${columnWidths[column]}px` : 'none'};
							"
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
							<div class="flex items-center space-x-1">
								<span class="truncate" title={column}>{column}</span>
								{#if sortKey === column}
									<svg
										class="h-3.5 w-3.5 flex-shrink-0 text-blue-500 transition-transform {sortDirection === 'desc'
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
								class="absolute top-0 right-0 bottom-0 w-[8px] cursor-col-resize touch-none border-r-2 border-transparent bg-transparent transition-colors group-hover:border-gray-300 hover:border-blue-400"
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
			<tbody class="divide-y divide-gray-100">
				{#each sortedData as row, rowIndex}
					<tr class="group/row transition-colors even:bg-gray-50/30 hover:bg-blue-50/40">
						{#each columns as column}
							{@const cellKey = getCellKey(rowIndex, column)}
							{@const isEditing = editingCell === cellKey}
							{@const cellValue = typeof row[column] === 'object' ? JSON.stringify(row[column]) : (row[column] ?? '')}
							{@const shouldTruncate = !isEditing && !expandedCells.has(cellKey)}

							<td class="relative border-r border-gray-100 px-4 py-2.5 last:border-r-0" data-column={column}>
								{#if column === 'key'}
									{#if isArrayView}
										<button
											class="w-full truncate rounded-md px-2 py-1 text-left font-medium text-blue-600 transition-all duration-200 hover:bg-blue-100"
											ondblclick={() => handleDoubleClick(row.path)}
										>
											{row[column]}
										</button>
									{:else}
										<div class="relative w-full">
											{#if isEditing}
												<textarea
													autofocus
													value={row[column]}
													onchange={(e) => {
														updateKey(row[column], (e.target as HTMLTextAreaElement).value);
														stopEditing();
													}}
													onblur={stopEditing}
													onfocus={(e) => {
														const target = e.target as HTMLTextAreaElement;
														target.style.height = 'auto';
														target.style.height =
															Math.min(target.scrollHeight, EDITOR_CONSTANTS.MAX_CELL_HEIGHT) + 'px';
													}}
													oninput={(e) => {
														const target = e.target as HTMLTextAreaElement;
														target.style.height = 'auto';
														target.style.height =
															Math.min(target.scrollHeight, EDITOR_CONSTANTS.MAX_CELL_HEIGHT) + 'px';
													}}
													class="w-full resize-none overflow-hidden rounded border border-blue-400 bg-white px-2 py-1 text-xs shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
													rows="1"
												></textarea>
											{:else}
												<button
													class="block w-full cursor-text rounded border border-transparent px-2 py-1 text-left text-gray-800 transition-colors hover:border-gray-200 hover:bg-white"
													onclick={() => startEditing(rowIndex, column)}
												>
													{row[column]}
												</button>
											{/if}
										</div>
									{/if}
								{:else if isSummaryValue(row[column])}
									<button
										class="w-full rounded px-2 py-1 text-left font-medium text-blue-600 transition-colors hover:bg-blue-50"
										ondblclick={() => handleDoubleClick(row.path)}
									>
										{row[column]}
									</button>
								{:else if isComplex(row[column])}
									<button
										class="w-full truncate rounded px-2 py-1 text-left text-xs text-purple-600 transition-colors hover:bg-purple-50"
										ondblclick={() => handleDoubleClick(row.path)}
									>
										{row[column]}
									</button>
								{:else}
									<div class="relative w-full">
										{#if isEditing}
											<textarea
												autofocus
												value={cellValue}
												onchange={(e) => {
													const targetPath = isSimpleKeyValue ? row.path : [...row.path, column];
													updateValue(targetPath, (e.target as HTMLTextAreaElement).value);
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
												class="w-full resize-none overflow-hidden rounded border border-blue-400 bg-white px-2 py-1 text-xs shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
												rows="1"
											></textarea>
										{:else}
											<button
												class="block w-full cursor-text rounded border border-transparent px-2 py-1 text-left text-gray-800 transition-colors hover:border-gray-200 hover:bg-white"
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
												{cellValue === '' ? '\u00A0' : cellValue}
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
		<div class="flex h-full flex-col items-center justify-center space-y-2 text-gray-400">
			<svg class="h-12 w-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
				/>
			</svg>
			<span class="text-sm font-medium">No tabular data to display</span>
		</div>
	{/if}
</div>

{#if notification}
	<div
		transition:fly={{ y: 50, duration: 800, easing: quintOut }}
		class="fixed bottom-4 left-1/2 z-50 flex w-full max-w-2xl -translate-x-1/2 transform items-center justify-between gap-6 rounded-xl border border-red-300 bg-red-100 px-6 py-5 shadow-2xl ring-2 ring-red-200/50"
		role="alert"
	>
		<div class="flex items-center gap-4 overflow-hidden">
			<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-200 text-red-700">
				<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
					/>
				</svg>
			</div>

			<div class="flex items-baseline gap-2 truncate text-base">
				<span class="text-lg font-extrabold text-red-900">Error:</span>
				<span class="font-medium text-red-800">{notification.message}</span>
			</div>
		</div>

		<button
			type="button"
			onclick={() => (notification = null)}
			class="shrink-0 rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-200 hover:text-red-800 focus:ring-2 focus:ring-red-400 focus:outline-none"
			aria-label="Close notification"
		>
			<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>
{/if}

{#if contextMenu}
	<div
		class="ring-opacity-5 fixed z-50 w-48 rounded-lg border border-gray-100 bg-white p-1 shadow-xl ring-1 ring-black"
		style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
		onclick={(e) => e.stopPropagation()}
		onkeydown={() => {}}
		role="menu"
		tabindex="0"
	>
		<button
			class="flex w-full items-center space-x-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
			onclick={handleExpandColumn}
			type="button"
		>
			<svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
			</svg>
			<span>Expand Column</span>
		</button>
		<button
			class="flex w-full items-center space-x-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
			onclick={handleSortByColumn}
			type="button"
		>
			<svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
			<div class="my-1 border-t border-gray-100"></div>
			<button
				class="flex w-full items-center space-x-2 rounded-md px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
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
