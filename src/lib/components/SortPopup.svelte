<script lang="ts">
	import type { JSONValue } from '$lib/types.ts';

	let {
		data,
		onSort,
		onClose
	}: {
		data: JSONValue;
		onSort: (sorted: JSONValue) => void;
		onClose: () => void;
	} = $props();

	let sortKey: string = $state('');
	let sortDirection: 'asc' | 'desc' = $state('asc');

	const availableKeys = $derived.by(() => {
		if (Array.isArray(data) && data.length > 0) {
			const firstItem = data[0];
			if (typeof firstItem === 'object' && firstItem !== null) {
				return Object.keys(firstItem as Record<string, any>);
			}
		} else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
			return Object.keys(data as Record<string, any>);
		}
		return [];
	});

	const applySorting = (): void => {
		if (!sortKey) {
			onClose();
			return;
		}

		let sortedData: JSONValue;

		if (Array.isArray(data)) {
			sortedData = [...data].sort((a, b) => {
				const aVal = typeof a === 'object' && a !== null ? (a as any)[sortKey] : a;
				const bVal = typeof b === 'object' && b !== null ? (b as any)[sortKey] : b;

				if (aVal === undefined || aVal === null) return 1;
				if (bVal === undefined || bVal === null) return -1;

				if (typeof aVal === 'number' && typeof bVal === 'number') {
					return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
				}

				const aStr = String(aVal).toLowerCase();
				const bStr = String(bVal).toLowerCase();
				const comparison = aStr.localeCompare(bStr);
				return sortDirection === 'asc' ? comparison : -comparison;
			});
		} else if (typeof data === 'object' && data !== null) {
			const entries = Object.entries(data as Record<string, any>);
			entries.sort(([keyA, valA], [keyB, valB]) => {
				const aVal = sortKey === '_key' ? keyA : valA;
				const bVal = sortKey === '_key' ? keyB : valB;

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
	};
</script>

<dialog class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black" onclick={onClose}>
	<div
		role="presentation"
		class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
		onclick={(e) => e.stopPropagation()}
	>
		<h2 class="mb-4 text-lg font-semibold text-gray-900">Sort Data</h2>

		{#if availableKeys.length > 0}
			<div class="mb-6 space-y-4">
				<div>
					<label for="fieldselect" class="mb-2 block text-sm font-medium text-gray-700">Sort By</label>
					<select
						id="fieldselect"
						bind:value={sortKey}
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					>
						<option value="">Select a field</option>
						{#if !Array.isArray(data)}
							<option value="_key">Key Name</option>
						{/if}
						{#each availableKeys as key}
							<option value={key}>{key}</option>
						{/each}
					</select>
				</div>

				<div>
					<fieldset class="mb-2">
						<legend class="block text-sm font-medium text-gray-700">Direction</legend>
						<div class="mt-2 flex space-x-4">
							<label class="flex items-center space-x-2">
								<input
									type="radio"
									bind:group={sortDirection}
									id="sort-asc"
									value="asc"
									class="h-4 w-4 text-blue-600"
								/>
								<span class="text-sm text-gray-700">Ascending (A-Z, 0-9)</span>
							</label>
							<label class="flex items-center space-x-2">
								<input
									type="radio"
									bind:group={sortDirection}
									id="sort-desc"
									value="desc"
									class="h-4 w-4 text-blue-600"
								/>
								<span class="text-sm text-gray-700">Descending (Z-A, 9-0)</span>
							</label>
						</div>
					</fieldset>
				</div>
			</div>

			<div class="flex justify-end space-x-3">
				<button
					onclick={onClose}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					type="button"
				>
					Cancel
				</button>
				<button
					onclick={applySorting}
					disabled={!sortKey}
					class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					type="button"
				>
					Apply Sort
				</button>
			</div>
		{:else}
			<p class="mb-6 text-sm text-gray-500">No sortable fields available in current data.</p>
			<div class="flex justify-end">
				<button
					onclick={onClose}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					type="button"
				>
					Close
				</button>
			</div>
		{/if}
	</div>
</dialog>
