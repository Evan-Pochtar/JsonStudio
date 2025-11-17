<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { JSONValue, JSONPath, FlatNode } from '$lib/types';
	import {
		safeClone,
		pathToKey,
		setNestedValue,
		deleteNestedValue,
		parseValue,
		adjustTextareaHeight
	} from '$lib/utils/helpers';
	import { EDITOR_CONSTANTS } from '$lib/utils/constants';
	import AddKeyPopup from '../Popups/AddKeyPopup.svelte';

	let {
		focus,
		update,
		data,
		focusedPath = []
	}: {
		focus: (e: JSONPath) => void;
		update: (e: JSONValue) => void;
		data: JSONValue;
		focusedPath?: JSONPath;
	} = $props();

	let expandedNodes = $state(new Set<string>(['root']));
	let editingPath: string | null = $state(null);
	let editValue = $state('');
	let containerElement: HTMLTextAreaElement | null = $state(null);
	let showAddKeyPopup = $state(false);
	let addKeyTargetPath: JSONPath = $state([]);

	function toggleNode(path: JSONPath): void {
		const key = pathToKey(path);
		const newSet = new Set(expandedNodes);
		newSet.has(key) ? newSet.delete(key) : newSet.add(key);
		expandedNodes = newSet;
	}

	function isExpanded(path: JSONPath): boolean {
		return expandedNodes.has(pathToKey(path));
	}

	function handleDoubleClick(e: MouseEvent, path: JSONPath, value: JSONValue): void {
		e.stopPropagation();
		typeof value === 'object' && value !== null ? focus(path) : startEditing(path, value);
	}

	function navigateBack(): void {
		if (focusedPath.length > 0) {
			window.dispatchEvent(new CustomEvent('treeview:navigateback'));
		}
	}

	async function startEditing(path: JSONPath, value: JSONValue): Promise<void> {
		editingPath = pathToKey(path);
		editValue = typeof value === 'string' ? value : JSON.stringify(value);
		await tick();
		if (containerElement) {
			adjustTextareaHeight(containerElement);
			containerElement.focus();
		}
	}

	function finishEditing(path: JSONPath): void {
		if (!editingPath) return;

		const newData = safeClone(data);
		setNestedValue(newData, path, parseValue(editValue));
		update(newData);

		editingPath = null;
		editValue = '';
	}

	function deleteItem(path: JSONPath): void {
		const newData = safeClone(data);
		deleteNestedValue(newData, path);
		update(newData);
	}

	function openAddKeyPopup(path: JSONPath): void {
		addKeyTargetPath = path;
		showAddKeyPopup = true;
	}

	function cancelEditing(): void {
		editingPath = null;
		editValue = '';
	}

	function getRootName(): string {
		return focusedPath.length === 0 ? 'root' : String(focusedPath[focusedPath.length - 1]);
	}

	function getRootBrackets(): string {
		if (Array.isArray(data)) return '[]';
		if (typeof data === 'object' && data !== null) return '{}';
		return '';
	}

	function buildVisibleNodes(): FlatNode[] {
		const nodes: FlatNode[] = [];

		function walk(value: JSONValue, path: JSONPath = [], depth = 0): void {
			const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
			const isArray = Array.isArray(value);
			const childrenKeys = isArray
				? (value as JSONValue[]).map((_, i) => i)
				: isObject
					? Object.keys(value as Record<string, any>)
					: [];
			const childCount = childrenKeys.length;
			nodes.push({
				key: path.length === 0 ? null : String(path[path.length - 1]),
				path: [...path],
				value,
				isObject,
				isArray,
				depth,
				hasChildren: childCount > 0,
				childCount
			});

			const shouldDescend = expandedNodes.has(pathToKey(path));
			if (shouldDescend && childCount > 0) {
				if (isArray) {
					(value as JSONValue[]).forEach((item, i) => walk(item, [...path, i], depth + 1));
				} else if (isObject) {
					Object.keys(value as Record<string, any>).forEach((key) =>
						walk((value as Record<string, any>)[key], [...path, key], depth + 1)
					);
				}
			}
		}

		walk(data);
		return nodes;
	}

	onMount(() => {
		const handleClickOutside = (e: MouseEvent): void => {
			if (editingPath && containerElement && !containerElement.contains(e.target as Node)) {
				const node = visibleNodes.find((n) => pathToKey(n.path) === editingPath);
				if (node) finishEditing(node.path);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	});

	$effect(() => {
		if (containerElement && editingPath) {
			adjustTextareaHeight(containerElement);
		}
	});

	const visibleNodes = $derived(buildVisibleNodes());
	const isAtRoot = $derived(focusedPath.length === 0);
</script>

<div class="h-full overflow-auto bg-gradient-to-b from-white to-gray-50/30 p-4">
	<div class="font-mono text-sm">
		{#each visibleNodes as node (pathToKey(node.path))}
			<div
				class="group flex items-center rounded-lg transition-all duration-150 hover:bg-blue-50/50"
				style="padding-left: {node.depth * 1}rem;"
			>
				{#if node.path.length === 0}
					{#if isAtRoot}
						{#if node.hasChildren}
							<button
								class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-all duration-200 hover:bg-blue-100 hover:text-blue-600"
								onclick={() => toggleNode(node.path)}
								aria-expanded={isExpanded(node.path)}
								type="button"
								aria-label={isExpanded(node.path) ? 'Collapse root' : 'Expand root'}
								title={isExpanded(node.path) ? 'Collapse root' : 'Expand root'}
							>
								<svg
									class="h-3 w-3 transition-transform duration-200 {isExpanded(node.path) ? 'rotate-90' : ''}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							</button>
						{:else}
							<div class="mr-2 h-6 w-6 shrink-0"></div>
						{/if}
					{:else}
						<button
							class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-all duration-200 hover:bg-blue-100 hover:text-blue-600"
							onclick={navigateBack}
							type="button"
							aria-label="Navigate back"
							title="Navigate back"
						>
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
							</svg>
						</button>
					{/if}
				{:else if node.hasChildren}
					<button
						class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-all duration-200 hover:bg-blue-100 hover:text-blue-600"
						onclick={() => toggleNode(node.path)}
						aria-expanded={isExpanded(node.path)}
						type="button"
						aria-label={isExpanded(node.path) ? 'Collapse node' : 'Expand node'}
						title={isExpanded(node.path) ? 'Collapse node' : 'Expand node'}
					>
						<svg
							class="h-3 w-3 transition-transform duration-200 {isExpanded(node.path) ? 'rotate-90' : ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				{:else}
					<div class="mr-2 h-6 w-6 shrink-0"></div>
				{/if}

				<div class="flex flex-1 flex-col py-1.5">
					<div class="flex items-center">
						<span
							class="cursor-pointer rounded-md px-2 py-1 font-semibold text-blue-600 transition-all duration-200 hover:bg-blue-100"
							ondblclick={(e) => handleDoubleClick(e, node.path, node.value)}
							role="button"
							tabindex="0"
						>
							{#if node.key !== null}
								{node.key}
								{#if node.isArray}
									<span class="text-purple-600">[]</span>
								{:else if node.isObject}
									<span class="text-purple-600">{'{}'}</span>
								{/if}
							{:else}
								{getRootName()}<span class="text-purple-600">{getRootBrackets()}</span>
							{/if}
						</span>

						{#if editingPath === pathToKey(node.path)}
							<textarea
								bind:this={containerElement}
								bind:value={editValue}
								onblur={() => finishEditing(node.path)}
								oninput={(e) => adjustTextareaHeight(e.currentTarget)}
								onkeydown={(e) => {
									if (e.key === 's' && (e.ctrlKey || e.metaKey)) finishEditing(node.path);
									if (e.key === 'Escape') cancelEditing();
								}}
								class="ml-2 min-h-[2rem] flex-1 resize-none overflow-auto rounded-md border border-blue-500 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
								style="max-height: {EDITOR_CONSTANTS.MAX_EDIT_HEIGHT}px;"
							></textarea>
						{:else}
							<span
								class="ml-2 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600"
								ondblclick={(e) => handleDoubleClick(e, node.path, node.value)}
								role="button"
								tabindex="0"
							>
								{#if node.isArray}
									{node.childCount} items
								{:else if node.isObject}
									{node.childCount} props
								{:else}
									<span class="text-gray-700"
										>{typeof node.value === 'string' ? `"${node.value}"` : String(node.value)}</span
									>
								{/if}
							</span>
						{/if}
					</div>

					{#if editingPath === pathToKey(node.path)}
						<div class="mt-2 ml-2 text-xs text-gray-500">Press Ctrl+S to save, Esc to cancel</div>
					{/if}
				</div>

				<div class="ml-2 flex shrink-0 space-x-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
					{#if node.isObject || node.isArray}
						<button
							class="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 transition-all duration-200 hover:bg-blue-200"
							onclick={() => focus(node.path)}
							type="button"
						>
							Open
						</button>
					{/if}
					{#if node.isObject}
						<button
							class="rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700 transition-all duration-200 hover:bg-green-200"
							onclick={() => openAddKeyPopup(node.path)}
							type="button"
						>
							Add Key
						</button>
					{/if}
					{#if node.path.length > 0}
						<button
							class="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 transition-all duration-200 hover:bg-red-200"
							onclick={() => deleteItem(node.path)}
							type="button"
						>
							Delete
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

{#if showAddKeyPopup}
	<AddKeyPopup
		{data}
		targetPath={addKeyTargetPath}
		onAdd={(newData) => {
			update(newData);
			showAddKeyPopup = false;
		}}
		onClose={() => (showAddKeyPopup = false)}
	/>
{/if}
