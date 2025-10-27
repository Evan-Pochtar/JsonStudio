<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { JSONValue, JSONObject, SearchMatch, UndoEntry } from '$lib/types.ts';
	import TableView from './TableView.svelte';
	import TreeView from './TreeView.svelte';
	import TextView from './TextView.svelte';
	import SearchPanel from './SearchPanel.svelte';
	import ExportPopup from './ExportPopup.svelte';
	import FormatPopup from './FormatPopup.svelte';
	import SortPopup from './SortPopup.svelte';

	let {
		formatted,
		selectAll,
		searchQuery = $bindable()
	}: {
		formatted?: (text: string) => string;
		selectAll?: () => void;
		searchQuery?: string;
	} = $props();

	let showExportPopup = $state(false);
	let showFormatPopup = $state(false);
	let showSortPopup = $state(false);

	let currentData: JSONValue = {} as JSONObject;
	let focusedPath: Array<string | number> = $state([]);
	let fileName = $state('untitled.json');
	let viewMode: 'tree' | 'table' | 'text' = $state('tree');
	let searchResults: SearchMatch[] = $state([]);
	let isModified = $state(false);
	let undoStack: UndoEntry[] = [];
	let redoStack: UndoEntry[] = [];

	let filteredData: JSONValue = $state({} as JSONObject);
	let searchIndex: Map<string, SearchMatch[]> = new Map();

	const MAX_UNDO_STACK = 50;

	export const loadJson = (data: JSONValue, name = 'untitled.json'): void => {
		currentData = structuredClone(data);
		fileName = name;
		focusedPath = [];
		isModified = false;
		undoStack = [];
		redoStack = [];
		updateFilteredData();
		buildSearchIndex();
	};

	const addToUndoStack = (): void => {
		undoStack.push({
			data: structuredClone(currentData),
			path: [...focusedPath]
		});
		if (undoStack.length > MAX_UNDO_STACK) {
			undoStack.shift();
		}
		redoStack = [];
	};

	const undo = (): void => {
		if (undoStack.length > 0) {
			redoStack.push({
				data: structuredClone(currentData),
				path: [...focusedPath]
			});
			const previous = undoStack.pop() as UndoEntry;
			currentData = previous.data;
			focusedPath = previous.path;
			isModified = true;
			updateFilteredData();
			buildSearchIndex();
		}
	};

	const redo = (): void => {
		if (redoStack.length > 0) {
			undoStack.push({
				data: structuredClone(currentData),
				path: [...focusedPath]
			});
			const next = redoStack.pop() as UndoEntry;
			currentData = next.data;
			focusedPath = next.path;
			isModified = true;
			updateFilteredData();
			buildSearchIndex();
		}
	};

	const updateData = (newData: JSONValue): void => {
		addToUndoStack();
		currentData = structuredClone(newData);
		isModified = true;
		updateFilteredData();
		buildSearchIndex();
	};

	const buildSearchIndex = (): void => {
		searchIndex.clear();
		const indexObject = (obj: JSONValue, path: Array<string | number> = []) => {
			if (typeof obj === 'object' && obj !== null) {
				if (Array.isArray(obj)) {
					obj.forEach((item, index) => {
						indexObject(item, [...path, index]);
					});
				} else {
					for (const [key, value] of Object.entries(obj as JSONObject)) {
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
					}
				}
			}
		};
		indexObject(currentData);
	};

	const performSearch = (query: string, keyFilter: string | null = null): void => {
		if (!query.trim()) {
			searchResults = [];
			return;
		}

		const queryLower = query.toLowerCase();
		const results: SearchMatch[] = [];

		for (const [indexKey, matches] of searchIndex.entries()) {
			if (keyFilter && keyFilter.trim()) {
				matches.forEach((match) => {
					if (
						match.key.toLowerCase() === keyFilter.toLowerCase() &&
						match.value.toString().toLowerCase().includes(queryLower)
					) {
						results.push(match);
					}
				});
			} else {
				if (indexKey.includes(queryLower)) {
					results.push(...matches);
				}
			}
		}

		searchResults = results.slice(0, 100);
	};

	const updateFilteredData = (): void => {
		if (focusedPath.length === 0) {
			filteredData = currentData;
			return;
		}
		let data: any = currentData;
		for (const key of focusedPath) {
			if (data == null) {
				data = undefined;
				break;
			}
			data = data[key as keyof typeof data];
		}
		filteredData = data;
	};

	const focusOnPath = (path: Array<string | number>): void => {
		focusedPath = path;
		updateFilteredData();
	};

	const handleFormatted = (formattedText: string): void => {
		try {
			const parsed = JSON.parse(formattedText);
			addToUndoStack();
			currentData = parsed;
			isModified = true;
			updateFilteredData();
			buildSearchIndex();
		} catch (e) {
			console.error('Format error:', e);
		}
	};

	const handleSorted = (sortedData: JSONValue): void => {
		addToUndoStack();
		currentData = sortedData;
		isModified = true;
		updateFilteredData();
		buildSearchIndex();
	};

	const validateJson = (): { valid: true } | { valid: false; error: string } => {
		try {
			JSON.parse(JSON.stringify(currentData));
			return { valid: true };
		} catch (e: any) {
			return { valid: false, error: e?.message ?? String(e) };
		}
	};

	onMount(() => {
		if (!browser) return;
		const handleUndo = (): void => undo();
		const handleRedo = (): void => redo();
		const handleSelectAll = (): void => {
			if (selectAll) selectAll();
		};

		window.addEventListener('editor:undo', handleUndo as EventListener);
		window.addEventListener('editor:redo', handleRedo as EventListener);
		window.addEventListener('editor:selectall', handleSelectAll as EventListener);

		return () => {
			window.removeEventListener('editor:undo', handleUndo as EventListener);
			window.removeEventListener('editor:redo', handleRedo as EventListener);
			window.removeEventListener('editor:selectall', handleSelectAll as EventListener);
		};
	});

	const validation = $derived(validateJson());
</script>

<div class="flex h-full">
	<div class="flex w-80 flex-col border-r border-gray-200 bg-gray-50">
		<div class="border-b border-gray-200 bg-white p-4">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-gray-900">{fileName}</span>
				{#if isModified}
					<span class="text-xs text-orange-600">Modified</span>
				{/if}
			</div>
			<div class="mt-1 text-xs text-gray-500">
				{focusedPath.length > 0 ? `Focused: ${focusedPath.join('.')}` : 'Root level'}
			</div>
		</div>

		<div class="border-b border-gray-200 bg-white p-3">
			<div class="grid grid-cols-3 gap-1">
				<button
					class="rounded-md px-3 py-2 text-xs font-medium {viewMode === 'tree'
						? 'bg-blue-100 text-blue-700'
						: 'text-gray-500 hover:text-gray-700'}"
					onclick={() => (viewMode = 'tree')}
				>
					Tree
				</button>
				<button
					class="rounded-md px-3 py-2 text-xs font-medium {viewMode === 'table'
						? 'bg-blue-100 text-blue-700'
						: 'text-gray-500 hover:text-gray-700'}"
					onclick={() => (viewMode = 'table')}
				>
					Table
				</button>
				<button
					class="rounded-md px-3 py-2 text-xs font-medium {viewMode === 'text'
						? 'bg-blue-100 text-blue-700'
						: 'text-gray-500 hover:text-gray-700'}"
					onclick={() => (viewMode = 'text')}
				>
					Text
				</button>
			</div>
		</div>

		<SearchPanel
			bind:searchQuery
			{searchResults}
			search={(e: { query: string | undefined; keyFilter: string | null }) => performSearch(e.query ?? '', e.keyFilter)}
			navigate={(e: { path: Array<string | number> }) => focusOnPath(e.path)}
		/>

		{#if focusedPath.length > 0}
			<div class="border-b border-gray-200 bg-white p-3">
				<div class="mb-2 text-xs font-medium text-gray-700">Navigation</div>
				<button class="w-full text-left text-xs text-blue-600 hover:text-blue-800" onclick={() => focusOnPath([])}>
					← Back to root
				</button>
				{#if focusedPath.length > 1}
					<button
						class="mt-1 w-full text-left text-xs text-blue-600 hover:text-blue-800"
						onclick={() => focusOnPath(focusedPath.slice(0, -1))}
					>
						← Back to parent
					</button>
				{/if}
			</div>
		{/if}

		<div class="space-y-2 p-3">
			<button
				class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
				onclick={() => (showFormatPopup = true)}
				type="button"
			>
				Format JSON
			</button>
			<button
				class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
				onclick={() => (showSortPopup = true)}
				type="button"
			>
				Sort Data
			</button>
			<button
				class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
				onclick={() => (showExportPopup = true)}
				type="button"
			>
				Download / Export
			</button>
			<div class="text-xs {validation.valid ? 'text-green-600' : 'text-red-600'}">
				{validation.valid ? '✓ Valid JSON' : `✗ ${validation.error}`}
			</div>
		</div>
	</div>

	<div class="flex-1 overflow-hidden">
		{#if viewMode === 'tree'}
			<TreeView
				data={filteredData}
				update={(e: JSONValue) => updateData(e)}
				focus={(e: Array<string | number>) => focusOnPath([...focusedPath, ...e])}
			/>
		{:else if viewMode === 'table'}
			<TableView
				data={filteredData}
				{searchResults}
				update={(e: JSONValue) => updateData(e)}
				focus={(e: Array<string | number>) => focusOnPath([...focusedPath, ...e])}
			/>
		{:else if viewMode === 'text'}
			<TextView data={filteredData} update={(e: JSONValue) => updateData(e)} />
		{/if}
	</div>
	{#if showExportPopup}
		<ExportPopup data={filteredData} {fileName} onClose={() => (showExportPopup = false)} />
	{/if}

	{#if showFormatPopup}
		<FormatPopup data={filteredData} onFormat={handleFormatted} onClose={() => (showFormatPopup = false)} />
	{/if}

	{#if showSortPopup}
		<SortPopup data={filteredData} onSort={handleSorted} onClose={() => (showSortPopup = false)} />
	{/if}
</div>
