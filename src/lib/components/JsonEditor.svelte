<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { JSONValue, JSONObject, SearchMatch, UndoEntry } from '$lib/types.ts';
	import { safeClone } from '$lib/utils/helpers';
	import TableView from './TableView.svelte';
	import TreeView from './TreeView.svelte';
	import TextView from './TextView.svelte';
	import SearchPanel from './SearchPanel.svelte';
	import ExportPopup from './ExportPopup.svelte';
	import FormatPopup from './FormatPopup.svelte';
	import SortPopup from './SortPopup.svelte';

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
	let indentSize = $state(2);

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
		currentData = safeClone(data);
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
			data: safeClone(currentData),
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
				data: safeClone(currentData),
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
				data: safeClone(currentData),
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
		currentData = safeClone(newData);
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

	const handleFormatted = (formattedText: string, newIndentSize: number): void => {
		try {
			const parsed = JSON.parse(formattedText);
			indentSize = newIndentSize;

			if (focusedPath.length === 0) {
				addToUndoStack();
				currentData = parsed;
				isModified = true;
				updateFilteredData();
				buildSearchIndex();
			} else {
				const newData = safeClone(currentData) as any;
				let current: any = newData;

				for (let i = 0; i < focusedPath.length - 1; i++) {
					current = current[focusedPath[i] as keyof typeof current];
				}

				if (focusedPath.length === 1) {
					current[focusedPath[0] as keyof typeof current] = parsed;
				} else {
					current[focusedPath[focusedPath.length - 1] as keyof typeof current] = parsed;
				}

				addToUndoStack();
				currentData = newData;
				isModified = true;
				updateFilteredData();
				buildSearchIndex();
			}
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
						>Modified</span
					>
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
				<span>{focusedPath.length > 0 ? `${focusedPath.join('.')}` : 'Root level'}</span>
			</div>
		</div>

		<div class="border-b border-gray-200/80 bg-white/95 p-3 shadow-sm backdrop-blur-sm">
			<div class="inline-flex w-full rounded-lg bg-gray-100 p-1">
				<button
					class="flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all duration-200 {viewMode === 'tree'
						? 'bg-white text-blue-600 shadow-sm'
						: 'text-gray-600 hover:text-gray-900'}"
					onclick={() => (viewMode = 'tree')}
				>
					Tree
				</button>
				<button
					class="flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all duration-200 {viewMode === 'table'
						? 'bg-white text-blue-600 shadow-sm'
						: 'text-gray-600 hover:text-gray-900'}"
					onclick={() => (viewMode = 'table')}
				>
					Table
				</button>
				<button
					class="flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all duration-200 {viewMode === 'text'
						? 'bg-white text-blue-600 shadow-sm'
						: 'text-gray-600 hover:text-gray-900'}"
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
			<div
				class="border-b border-l-4 border-gray-200/80 bg-white/95 p-3 shadow-md ring-1 ring-blue-50/60 backdrop-blur-sm"
			>
				<div class="mb-2">
					<div class="flex items-baseline justify-between">
						<div class="text-sm font-semibold text-blue-700">Navigation</div>
						<div class="text-xs text-gray-500">{focusedPath.join('.')}</div>
					</div>
				</div>

				<div class="space-y-2">
					<button
						class="group flex w-full items-center space-x-3 rounded-md bg-blue-50/30 px-3 py-2 text-left text-sm font-medium shadow-sm transition duration-150 hover:bg-blue-100 hover:shadow focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
						onclick={() => focusOnPath([])}
					>
						<svg
							class="h-4 w-4 text-blue-600 transition-transform group-hover:-translate-x-0.5"
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
							class="group flex w-full items-center space-x-3 rounded-md bg-blue-50/30 px-3 py-2 text-left text-sm font-medium shadow-sm transition duration-150 hover:bg-blue-100 hover:shadow focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
							onclick={() => focusOnPath(focusedPath.slice(0, -1))}
						>
							<svg
								class="h-4 w-4 text-blue-600 transition-transform group-hover:-translate-x-0.5"
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
				class="group flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow"
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
				class="group flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow"
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
			<button
				class="group flex w-full items-center justify-center space-x-2 rounded-lg border border-transparent bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:from-red-600 hover:to-red-700 hover:shadow-md"
				onclick={() => (showExportPopup = true)}
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
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
					/>
				</svg>
				<span>Download / Export</span>
			</button>
			<div
				class="mt-4 flex items-center justify-center space-x-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-inset {validation.valid
					? 'ring-green-600/20'
					: 'ring-red-600/20'}"
			>
				<svg
					class="h-4 w-4 {validation.valid ? 'text-green-600' : 'text-red-600'}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					{#if validation.valid}
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					{:else}
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					{/if}
				</svg>
				<span class="text-xs font-medium {validation.valid ? 'text-green-700' : 'text-red-700'}">
					{validation.valid ? 'Valid JSON' : validation.error}
				</span>
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
			<TextView data={filteredData} update={(e: JSONValue) => updateData(e)} {indentSize} />
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
