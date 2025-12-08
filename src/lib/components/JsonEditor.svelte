<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { JSONValue, JSONPath, JSONObject, SearchMatch, UndoEntry } from '$lib/types';
	import { safeClone, getNestedValue, setNestedValue } from '$lib/utils/helpers';
	import { EDITOR_CONSTANTS, TAILWIND_CLASSES } from '$lib/utils/constants';
	import TableView from './Views/TableView.svelte';
	import TreeView from './Views/TreeView.svelte';
	import TextView from './Views/TextView.svelte';
	import SearchPanel from './SearchPanel.svelte';
	import ExportPopup from './Popups/ExportPopup.svelte';
	import FormatPopup from './Popups/FormatPopup.svelte';
	import SortPopup from './Popups/SortPopup.svelte';

	let {
		selectAll,
		searchQuery = $bindable()
	}: {
		selectAll?: () => void;
		searchQuery?: string;
	} = $props();

	let showExportPopup = $state(false);
	let showFormatPopup = $state(false);
	let showSortPopup = $state(false);
	let exportFormat: 'json' | 'csv' | 'xlsx' = $state('json');
	let indentSize: number = $state(EDITOR_CONSTANTS.DEFAULT_INDENT_SIZE);
	let currentData: JSONValue = {} as JSONObject;
	let focusedPath: JSONPath = $state([]);
	let fileName = $state('untitled.json');
	let viewMode: 'tree' | 'table' | 'text' = $state('tree');
	let searchResults: SearchMatch[] = $state([]);
	let isModified = $state(false);
	let undoStack: UndoEntry[] = [];
	let redoStack: UndoEntry[] = [];
	let filteredData: JSONValue = $state({} as JSONObject);
	let searchIndex = new Map<string, SearchMatch[]>();

	export function loadJson(data: JSONValue, name = 'untitled.json'): void {
		currentData = safeClone(data);
		fileName = name;
		focusedPath = [];
		isModified = false;
		undoStack = [];
		redoStack = [];
		updateFilteredData();
		buildSearchIndex();
	}

	function addToUndoStack(): void {
		undoStack.push({
			data: safeClone(currentData),
			path: [...focusedPath]
		});
		if (undoStack.length > EDITOR_CONSTANTS.MAX_UNDO_STACK) {
			undoStack.shift();
		}
		redoStack = [];
	}

	function undo(): void {
		if (undoStack.length === 0) return;

		redoStack.push({
			data: safeClone(currentData),
			path: [...focusedPath]
		});

		const previous = undoStack.pop()!;
		currentData = previous.data;
		focusedPath = previous.path;
		isModified = true;
		updateFilteredData();
		buildSearchIndex();
	}

	function redo(): void {
		if (redoStack.length === 0) return;

		undoStack.push({
			data: safeClone(currentData),
			path: [...focusedPath]
		});

		const next = redoStack.pop()!;
		currentData = next.data;
		focusedPath = next.path;
		isModified = true;
		updateFilteredData();
		buildSearchIndex();
	}

	function updateData(newData: JSONValue): void {
		addToUndoStack();
		if (focusedPath.length === 0) {
			currentData = safeClone(newData);
		} else {
			const rootClone = safeClone(currentData);
			setNestedValue(rootClone, focusedPath, safeClone(newData));
			currentData = rootClone;
		}

		isModified = true;
		updateFilteredData();
		buildSearchIndex();
	}

	function buildSearchIndex(): void {
		searchIndex.clear();

		function indexObject(obj: JSONValue, path: JSONPath = []): void {
			if (!obj || typeof obj !== 'object') return;

			if (Array.isArray(obj)) {
				obj.forEach((item, index) => indexObject(item, [...path, index]));
			} else {
				Object.entries(obj as JSONObject).forEach(([key, value]) => {
					const currentPath = [...path, key];
					if (typeof value === 'string' || typeof value === 'number') {
						const searchText = `${key}:${value}`.toLowerCase();
						if (!searchIndex.has(searchText)) {
							searchIndex.set(searchText, []);
						}
						searchIndex.get(searchText)!.push({
							path: currentPath,
							key,
							value,
							type: typeof value
						});
					}
					indexObject(value, currentPath);
				});
			}
		}
		indexObject(currentData);
	}

	function performSearch(query: string, keyFilter: string | null = null): void {
		if (!query.trim()) {
			searchResults = [];
			return;
		}

		const queryLower = query.toLowerCase();
		const results: SearchMatch[] = [];
		for (const [indexKey, matches] of searchIndex.entries()) {
			if (keyFilter?.trim()) {
				matches.forEach((match) => {
					if (
						match.key.toLowerCase() === keyFilter.toLowerCase() &&
						match.value.toString().toLowerCase().includes(queryLower)
					) {
						results.push(match);
					}
				});
			} else if (indexKey.includes(queryLower)) {
				results.push(...matches);
			}
		}

		searchResults = results.slice(0, EDITOR_CONSTANTS.MAX_SEARCH_RESULTS);
	}

	function updateFilteredData(): void {
		if (focusedPath.length === 0) {
			filteredData = currentData;
			return;
		}

		const data = getNestedValue(currentData, focusedPath);
		if (data === undefined) {
			focusedPath = [];
			filteredData = currentData;
			return;
		}

		filteredData = data;
	}

	function focusOnPath(path: JSONPath): void {
		focusedPath = path;
		updateFilteredData();
	}

	function handleFormatted(formattedText: string, newIndentSize: number): void {
		try {
			const parsed = JSON.parse(formattedText);
			const oldData = focusedPath.length === 0 ? currentData : getNestedValue(currentData, focusedPath);
			const oldFormatted = JSON.stringify(oldData, null, indentSize);
			const newFormatted = JSON.stringify(parsed, null, newIndentSize);
			const hasChanged = oldFormatted !== newFormatted;

			indentSize = newIndentSize;
			if (focusedPath.length === 0) {
				if (hasChanged) {
					addToUndoStack();
					currentData = parsed;
					isModified = true;
				}
			} else {
				if (hasChanged) {
					const newData = safeClone(currentData);
					setNestedValue(newData, focusedPath, parsed);
					addToUndoStack();
					currentData = newData;
					isModified = true;
				}
			}

			updateFilteredData();
			buildSearchIndex();
		} catch (e) {
			alert('Failed to apply format');
		}
	}

	function handleSorted(sortedData: JSONValue): void {
		const oldData = focusedPath.length === 0 ? currentData : getNestedValue(currentData, focusedPath);
		const hasChanged = JSON.stringify(oldData) !== JSON.stringify(sortedData);
		if (!hasChanged) return;

		addToUndoStack();
		if (focusedPath.length === 0) {
			currentData = safeClone(sortedData);
		} else {
			const rootClone = safeClone(currentData);
			setNestedValue(rootClone, focusedPath, safeClone(sortedData));
			currentData = rootClone;
		}

		isModified = true;
		updateFilteredData();
		buildSearchIndex();
	}

	function handleNavigateBack(): void {
		if (focusedPath.length > 0) {
			focusOnPath(focusedPath.slice(0, -1));
		}
	}

	onMount(() => {
		if (!browser) return;

		const handlers = {
			'treeview:navigateback': handleNavigateBack,
			'editor:undo': undo,
			'editor:redo': redo,
			'editor:selectall': () => selectAll?.()
		};

		Object.entries(handlers).forEach(([event, handler]) => {
			window.addEventListener(event, handler as EventListener);
		});

		return () => {
			Object.entries(handlers).forEach(([event, handler]) => {
				window.removeEventListener(event, handler as EventListener);
			});
		};
	});
</script>

<div class="flex h-full">
	<div class="flex w-80 flex-col border-r border-gray-200/80 bg-gradient-to-b from-gray-50 to-gray-100/50">
		<div class="border-b border-gray-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-2">
					<svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<span class="text-sm font-medium text-gray-900">{fileName}</span>
				</div>
				{#if isModified}
					<span
						class="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-600/20 ring-inset"
					>
						Modified
					</span>
				{/if}
			</div>
			<div class="mt-2 flex items-center space-x-1.5 text-xs text-gray-500">
				<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
					/>
				</svg>
				<span>{focusedPath.length > 0 ? focusedPath.join('.') : 'Root level'}</span>
			</div>
		</div>

		<div class="border-b border-gray-200/80 bg-white/95 p-3 shadow-sm backdrop-blur-sm">
			<div class="inline-flex w-full rounded-lg bg-gray-100 p-1">
				{#each ['tree', 'table', 'text'] as mode}
					<button
						class="flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all duration-200 {viewMode === mode
							? 'bg-white text-red-600 shadow-sm'
							: 'text-gray-600 hover:text-gray-900'}"
						onclick={() => (viewMode = mode as typeof viewMode)}
						type="button"
					>
						{mode.charAt(0).toUpperCase() + mode.slice(1)}
					</button>
				{/each}
			</div>
		</div>

		<SearchPanel
			bind:searchQuery
			{searchResults}
			search={(e) => performSearch(e.query ?? '', e.keyFilter)}
			navigate={(e) => focusOnPath(e.path)}
		/>

		{#if focusedPath.length > 0}
			<div
				class="border-b border-l-4 border-gray-200/80 border-l-red-500 bg-white/95 p-3 shadow-md ring-1 ring-red-50/60 backdrop-blur-sm"
			>
				<div class="mb-2">
					<div class="flex items-baseline justify-between">
						<div class="text-sm font-semibold text-red-700">Navigation</div>
						<div class="text-xs text-gray-500">{focusedPath.join('.')}</div>
					</div>
				</div>

				<div class="space-y-2">
					<button
						class="group flex w-full items-center space-x-3 rounded-md bg-red-50/30 px-3 py-2 text-left text-sm font-medium shadow-sm transition duration-150 hover:bg-red-100 hover:shadow focus:ring-2 focus:ring-red-500/20 focus:outline-none"
						onclick={() => focusOnPath([])}
						type="button"
					>
						<svg
							class="h-4 w-4 text-red-600 transition-transform group-hover:-translate-x-0.5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
						</svg>
						<span>Back to root</span>
					</button>

					{#if focusedPath.length > 1}
						<button
							class="group flex w-full items-center space-x-3 rounded-md bg-red-50/30 px-3 py-2 text-left text-sm font-medium shadow-sm transition duration-150 hover:bg-red-100 hover:shadow focus:ring-2 focus:ring-red-500/20 focus:outline-none"
							onclick={() => focusOnPath(focusedPath.slice(0, -1))}
							type="button"
						>
							<svg
								class="h-4 w-4 text-red-600 transition-transform group-hover:-translate-x-0.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
							</svg>
							<span>Back to parent</span>
						</button>
					{/if}
				</div>
			</div>
		{/if}

		<div class="space-y-2 p-4">
			<button
				class="group flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow focus:ring-2 focus:ring-gray-500/20 focus:ring-offset-2 focus:outline-none"
				onclick={() => (showFormatPopup = true)}
				type="button"
			>
				<svg
					class="h-4 w-4 transition-transform group-hover:scale-110"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
				<span>Format JSON</span>
			</button>

			<button
				class="group flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow focus:ring-2 focus:ring-gray-500/20 focus:ring-offset-2 focus:outline-none"
				onclick={() => (showSortPopup = true)}
				type="button"
			>
				<svg
					class="h-4 w-4 transition-transform group-hover:scale-110"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
					/>
				</svg>
				<span>Sort Data</span>
			</button>

			<button class="w-full {TAILWIND_CLASSES.buttons.primary}" onclick={() => (showExportPopup = true)} type="button">
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
					/>
				</svg>
				<span>Download / Export</span>
			</button>
		</div>
	</div>

	<div class="flex-1 overflow-hidden">
		{#if viewMode === 'tree'}
			<TreeView
				data={filteredData}
				{focusedPath}
				update={updateData}
				focus={(e) => focusOnPath([...focusedPath, ...e])}
			/>
		{:else if viewMode === 'table'}
			<TableView
				data={filteredData}
				{searchResults}
				update={updateData}
				focus={(e) => focusOnPath([...focusedPath, ...e])}
			/>
		{:else if viewMode === 'text'}
			<TextView data={filteredData} update={updateData} {indentSize} />
		{/if}
	</div>

	{#if showExportPopup}
		<ExportPopup data={filteredData} {fileName} bind:exportFormat onClose={() => (showExportPopup = false)} />
	{/if}

	{#if showFormatPopup}
		<FormatPopup data={filteredData} onFormat={handleFormatted} onClose={() => (showFormatPopup = false)} />
	{/if}

	{#if showSortPopup}
		<SortPopup
			data={filteredData}
			onSort={handleSorted}
			onNavigate={(key) => focusOnPath([...focusedPath, key])}
			onClose={() => (showSortPopup = false)}
		/>
	{/if}
</div>
