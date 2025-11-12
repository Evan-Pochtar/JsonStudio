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

	const findArrayPaths = (obj: any, path = ''): Array<{ path: string; keys: string[] }> => {
		const results: Array<{ path: string; keys: string[] }> = [];
		
		if (Array.isArray(obj) && obj.length > 0) {
			const firstItem = obj[0];
			if (typeof firstItem === 'object' && firstItem !== null) {
				const keys = Object.keys(firstItem);
				results.push({ path: path || 'root', keys });
			}
		} else if (typeof obj === 'object' && obj !== null) {
			for (const [key, value] of Object.entries(obj)) {
				const newPath = path ? `${path}.${key}` : key;
				results.push(...findArrayPaths(value, newPath));
			}
		}
		
		return results;
	};

	const getNestedValue = (obj: any, path: string): any => {
		const keys = path.split('.');
		let current = obj;
		for (const key of keys) {
			if (current && typeof current === 'object') {
				current = current[key];
			} else {
				return undefined;
			}
		}
		return current;
	};

	const setNestedValue = (obj: any, path: string, value: any): void => {
		const keys = path.split('.');
		let current = obj;
		for (let i = 0; i < keys.length - 1; i++) {
			current = current[keys[i]];
		}
		current[keys[keys.length - 1]] = value;
	};

	const availableArrays = $derived(findArrayPaths(data));
	
	const isTopLevelObject = $derived.by(() => {
		return typeof data === 'object' && data !== null && !Array.isArray(data);
	});

	const applySorting = (): void => {
		if (!sortKey) {
			onClose();
			return;
		}

		// Handle special sorting for top-level object by key name
		if (sortKey === '_object_keys') {
			const entries = Object.entries(data as Record<string, any>);
			entries.sort(([keyA], [keyB]) => {
				const comparison = keyA.localeCompare(keyB);
				return sortDirection === 'asc' ? comparison : -comparison;
			});
			const sortedData = Object.fromEntries(entries);
			onSort(sortedData);
			onClose();
			return;
		}

		const [arrayPath, fieldKey] = sortKey.split('::');
		const sortedData = JSON.parse(JSON.stringify(data));
		
		const arrayToSort = getNestedValue(sortedData, arrayPath);
		if (!Array.isArray(arrayToSort)) {
			onClose();
			return;
		}

		arrayToSort.sort((a, b) => {
			const aVal = a[fieldKey];
			const bVal = b[fieldKey];

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

		setNestedValue(sortedData, arrayPath, arrayToSort);
		onSort(sortedData);
		onClose();
	};
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
	role="dialog"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	tabindex="-1"
>
	<div
		class="animate-in fade-in zoom-in-95 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-gray-200 duration-200"
		role="presentation"
		onclick={(e) => e.stopPropagation()}
		onkeydown={() => {}}
	>
		<h2 class="mb-4 text-lg font-semibold text-gray-900">Sort Data</h2>

		{#if availableArrays.length > 0 || isTopLevelObject}
			<div class="mb-6 space-y-4">
				<div>
					<label for="fieldselect" class="mb-2 block text-sm font-medium text-gray-700">Sort By</label>
					<select
						id="fieldselect"
						bind:value={sortKey}
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					>
						<option value="">Select a field to sort</option>
						{#if isTopLevelObject}
							<optgroup label="Top Level">
								<option value="_object_keys">Key Name</option>
							</optgroup>
						{/if}
						{#each availableArrays as array}
							<optgroup label={array.path}>
								{#each array.keys as key}
									<option value={`${array.path}::${key}`}>{key}</option>
								{/each}
							</optgroup>
						{/each}
					</select>
					<p class="mt-1.5 text-xs text-gray-500">
						{#if isTopLevelObject && availableArrays.length > 0}
							Sort top-level keys or arrays with objects
						{:else if isTopLevelObject}
							Sort top-level keys by name
						{:else}
							Only arrays with objects can be sorted
						{/if}
					</p>
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
					class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow"
					type="button"
				>
					Cancel
				</button>
				<button
					onclick={applySorting}
					class="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow-md"
					type="button"
				>
					Apply Sort
				</button>
			</div>
		{:else}
			<p class="mb-6 text-sm text-gray-500">No sortable data found. Data must be an object with keys or contain arrays with objects.</p>
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
</div>
