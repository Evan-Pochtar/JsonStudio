<script lang="ts">
	import type { JSONValue } from '$lib/types';
	import { flattenObjectKeys, getNestedValue } from '$lib/utils/helpers';
	import { TAILWIND_CLASSES } from '$lib/utils/constants';

	let {
		data,
		onSort,
		onClose
	}: {
		data: JSONValue;
		onSort: (sorted: JSONValue) => void;
		onClose: () => void;
	} = $props();

	let sortKey = $state('');
	let sortDirection: 'asc' | 'desc' = $state('asc');

	const availableKeys = $derived.by(() => {
		if (Array.isArray(data) && data.length > 0) {
			const firstItem = data[0];
			if (firstItem && typeof firstItem === 'object') {
				return flattenObjectKeys(firstItem as Record<string, any>);
			}
		} else if (data && typeof data === 'object' && !Array.isArray(data)) {
			return flattenObjectKeys(data as Record<string, any>);
		}
		return [];
	});

	function applySorting(): void {
		if (!sortKey) {
			onClose();
			return;
		}

		let sortedData: JSONValue;
		if (Array.isArray(data)) {
			sortedData = [...data].sort((a, b) => {
				const aVal = a && typeof a === 'object' ? getNestedValue(a, sortKey) : a;
				const bVal = b && typeof b === 'object' ? getNestedValue(b, sortKey) : b;

				if (aVal == null) return 1;
				if (bVal == null) return -1;

				if (typeof aVal === 'number' && typeof bVal === 'number') {
					return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
				}

				const aStr = String(aVal).toLowerCase();
				const bStr = String(bVal).toLowerCase();
				const comparison = aStr.localeCompare(bStr);
				return sortDirection === 'asc' ? comparison : -comparison;
			});
		} else if (data && typeof data === 'object') {
			const entries = Object.entries(data as Record<string, any>);
			entries.sort(([keyA, valA], [keyB, valB]) => {
				const aVal = sortKey === '_key' ? keyA : getNestedValue(valA, sortKey);
				const bVal = sortKey === '_key' ? keyB : getNestedValue(valB, sortKey);

				if (aVal == null) return 1;
				if (bVal == null) return -1;

				if (typeof aVal === 'number' && typeof bVal === 'number') {
					return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
				}

				const aStr = String(aVal).toLowerCase();
				const bStr = String(bVal).toLowerCase();
				const comparison = aStr.localeCompare(bStr);
				return sortDirection === 'asc' ? comparison : -comparison;
			});
			sortedData = Object.fromEntries(entries);
		} else {
			sortedData = data;
		}

		onSort(sortedData);
		onClose();
	}
</script>

<div
	class={TAILWIND_CLASSES.modals.overlay}
	role="dialog"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	tabindex="-1"
>
	<div
		class={TAILWIND_CLASSES.modals.container}
		role="presentation"
		onclick={(e) => e.stopPropagation()}
		onkeydown={() => {}}
	>
		<h2 class="mb-4 text-lg font-semibold text-gray-900">Sort Data</h2>

		{#if availableKeys.length > 0}
			<div class="mb-6 space-y-4">
				<div>
					<label for="fieldselect" class="mb-2 block text-sm font-medium text-gray-700">Sort By</label>
					<select id="fieldselect" bind:value={sortKey} class={TAILWIND_CLASSES.inputs.text}>
						<option value="">Select a field</option>

						{#if !Array.isArray(data)}
							<option value="_key">Key Name</option>
						{/if}

						{#each availableKeys as key}
							<option value={key}>{key}</option>
						{/each}
					</select>
					<p class="mt-1.5 text-xs text-gray-500">Nested fields shown with dot notation (e.g., variables.state)</p>
				</div>

				<fieldset>
					<legend class="mb-2 block text-sm font-medium text-gray-700">Direction</legend>
					<div class="mt-2 flex space-x-4">
						<label class="flex items-center space-x-2">
							<input type="radio" bind:group={sortDirection} value="asc" class="h-4 w-4 text-blue-600" />
							<span class="text-sm text-gray-700">Ascending (A-Z, 0-9)</span>
						</label>
						<label class="flex items-center space-x-2">
							<input type="radio" bind:group={sortDirection} value="desc" class="h-4 w-4 text-blue-600" />
							<span class="text-sm text-gray-700">Descending (Z-A, 9-0)</span>
						</label>
					</div>
				</fieldset>
			</div>

			<div class="flex justify-end space-x-3">
				<button onclick={onClose} class={TAILWIND_CLASSES.buttons.secondary} type="button"> Cancel </button>
				<button onclick={applySorting} class={TAILWIND_CLASSES.buttons.success} type="button"> Apply Sort </button>
			</div>
		{:else}
			<p class="mb-6 text-sm text-gray-500">No sortable fields available in current data.</p>
			<div class="flex justify-end">
				<button onclick={onClose} class={TAILWIND_CLASSES.buttons.secondary} type="button"> Close </button>
			</div>
		{/if}
	</div>
</div>
