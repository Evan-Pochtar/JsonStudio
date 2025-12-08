<script lang="ts">
	import { onMount } from 'svelte';
	import type { JSONValue } from '$lib/types';
	import { TAILWIND_CLASSES } from '$lib/utils/constants';

	let {
		data,
		onSort,
		onClose,
		onNavigate
	}: {
		data: JSONValue;
		onSort: (sorted: JSONValue) => void;
		onClose: () => void;
		onNavigate: (key: string) => void;
	} = $props();

	let sortKey = $state('');
	let sortDirection: 'asc' | 'desc' = $state('asc');
	let isSorting = $state(false);

	$effect(() => {
		data;
		sortKey = '';
	});

	const isArray = $derived(Array.isArray(data));

	const showNoSortableFieldsWarning = $derived.by(() => {
		if (typeof data !== 'object' || data === null) return true;
		if (Array.isArray(data) && data.length === 0) return true;
		if (
			(!Array.isArray(data) && Object.keys(data).length === 0) ||
			(!Array.isArray(data) && Object.keys(data).length === 1)
		)
			return true;
		return false;
	});

	const availableKeys = $derived.by(() => {
		if (isArray && (data as any[]).length > 0) {
			const firstItem = (data as any[])[0];
			if (firstItem && typeof firstItem === 'object') {
				return Object.keys(firstItem);
			}
			return [];
		} else if (!isArray && data && typeof data === 'object') {
			return [];
		}
		return [];
	});

	const nestedCollections = $derived.by(() => {
		if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
		return Object.entries(data as Record<string, any>)
			.filter(([_, value]) => typeof value === 'object' && value !== null)
			.map(([key, value]) => ({
				key,
				type: Array.isArray(value) ? 'Array' : 'Object',
				count: Array.isArray(value) ? value.length : Object.keys(value).length
			}));
	});

	async function applySorting(): Promise<void> {
		if (showNoSortableFieldsWarning) return;
		if (isArray && availableKeys.length > 0 && !sortKey) return;
		isSorting = true;
		setTimeout(() => {
			try {
				executeSort();
			} catch (e) {
				console.error('Sort failed', e);
				isSorting = false;
			}
		}, 10);
	}

	function executeSort(): void {
		let sortedData: JSONValue;
		const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
		const dir = sortDirection === 'asc' ? 1 : -1;
		if (isArray) {
			const arr = data as any[];
			sortedData = [...arr].sort((a, b) => {
				let aVal, bVal;
				if (availableKeys.length > 0) {
					aVal = a && typeof a === 'object' ? a[sortKey] : a;
					bVal = b && typeof b === 'object' ? b[sortKey] : b;
				} else {
					aVal = a;
					bVal = b;
				}

				if (aVal === bVal) return 0;
				if (aVal == null) return 1;
				if (bVal == null) return -1;
				const typeA = typeof aVal;
				const typeB = typeof bVal;

				if (typeA !== typeB) {
					return dir * typeA.localeCompare(typeB);
				}
				if (typeA === 'number') {
					return dir * (aVal - bVal);
				}
				if (typeA === 'string') {
					return dir * collator.compare(aVal, bVal);
				}
				if (typeA === 'boolean') {
					return dir * (Number(aVal) - Number(bVal));
				}
				return 0;
			});
		} else if (data && typeof data === 'object') {
			const entries = Object.entries(data as Record<string, any>);
			entries.sort(([keyA, valA], [keyB, valB]) => {
				const aVal = sortKey === '_value' ? valA : keyA;
				const bVal = sortKey === '_value' ? valB : keyB;
				if (aVal === bVal) return 0;
				const typeA = typeof aVal;
				if (typeA === 'number') return dir * (aVal - bVal);
				if (typeA === 'string') return dir * collator.compare(aVal, bVal);
				return 0;
			});
			sortedData = Object.fromEntries(entries);
		} else {
			sortedData = data;
		}
		onSort(sortedData);
		onClose();
		isSorting = false;
	}

	onMount(() => {
		function handleKeyDown(e: KeyboardEvent): void {
			if (e.key === 'Escape') onClose();
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div class={TAILWIND_CLASSES.modals.overlay} role="dialog" onclick={onClose}>
	<div class={TAILWIND_CLASSES.modals.container} role="presentation" onclick={(e) => e.stopPropagation()}>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-gray-900">
				Sort {isArray ? 'Array Items' : 'Object Keys'}
			</h2>
			{#if isSorting}
				<span class="flex items-center text-xs font-medium text-blue-600">
					<svg class="mr-1 h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Processing...
				</span>
			{/if}
		</div>

		<div class="mb-6 space-y-6">
			<div class="space-y-4">
				{#if showNoSortableFieldsWarning}
					<div class="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
						<div class="flex items-center space-x-2">
							<svg class="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M8.257 3.099c.765-1.36 2.722-1.36 3.487 0l5.58 9.92c.765 1.36-.202 3.08-1.742 3.08H4.419c-1.54 0-2.507-1.72-1.742-3.08l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="font-medium">No sortable fields</span>
						</div>
						<p class="mt-1">The current data view is empty or contains a single primitive value.</p>
					</div>
				{:else}
					<div>
						<label for="fieldselect" class="mb-2 block text-sm font-medium text-gray-700">Sort Current View By</label>
						<select id="fieldselect" bind:value={sortKey} class={TAILWIND_CLASSES.inputs.text} disabled={isSorting}>
							<option value="" disabled selected>Select to sort by...</option>

							{#if isArray}
								{#if availableKeys.length > 0}
									{#each availableKeys as key}
										<option value={key}>{key}</option>
									{/each}
								{:else}
									<option value="" selected>Value (Primitives)</option>
								{/if}
							{:else}
								<option value="_key">Key Name (Alphabetical)</option>
							{/if}
						</select>
					</div>

					<fieldset>
						<legend class="mb-2 block text-sm font-medium text-gray-700">Direction</legend>
						<div class="mt-2 flex space-x-4">
							<label class="flex items-center space-x-2">
								<input
									type="radio"
									bind:group={sortDirection}
									value="asc"
									class="h-4 w-4 text-blue-600"
									disabled={isSorting}
								/>
								<span class="text-sm text-gray-700">Ascending (A-Z)</span>
							</label>
							<label class="flex items-center space-x-2">
								<input
									type="radio"
									bind:group={sortDirection}
									value="desc"
									class="h-4 w-4 text-blue-600"
									disabled={isSorting}
								/>
								<span class="text-sm text-gray-700">Descending (Z-A)</span>
							</label>
						</div>
					</fieldset>
				{/if}
			</div>

			{#if nestedCollections.length > 0}
				<div class="border-t border-gray-100 pt-4">
					<p class="mb-2 block text-sm font-medium text-gray-700">Or Sort Nested Content:</p>
					<div class="grid grid-cols-2 gap-2">
						{#each nestedCollections as item}
							<button
								type="button"
								onclick={() => onNavigate(item.key)}
								disabled={isSorting}
								class="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<span class="truncate font-medium">{item.key}</span>
								<span class="ml-2 text-xs text-gray-400">{item.type} [{item.count}]</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<div class="flex justify-end space-x-3">
			<button onclick={onClose} class={TAILWIND_CLASSES.buttons.secondary} type="button" disabled={isSorting}>
				Cancel
			</button>
			<button
				onclick={applySorting}
				class={TAILWIND_CLASSES.buttons.success}
				type="button"
				disabled={isSorting || showNoSortableFieldsWarning}
			>
				{isSorting ? 'Sorting...' : 'Apply Sort'}
			</button>
		</div>
	</div>
</div>
