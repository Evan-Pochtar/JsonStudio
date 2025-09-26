<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { TableRow, JSONValue, JSONPath } from '$lib/types.ts';

	const dispatch = createEventDispatcher<{
		update: JSONValue;
		focus: JSONPath;
	}>();

	export let data: JSONValue = {};
	export const searchResults: Array<{ path: JSONPath; key: string; value: any; type: string }> = [];

	let sortKey: string = '';
	let sortDirection: 'asc' | 'desc' = 'asc';

	const flattenForTable = (obj: JSONValue, prefix = ''): TableRow[] => {
		const items: TableRow[] = [];

		if (Array.isArray(obj)) {
			obj.forEach((item, index) => {
				if (typeof item === 'object' && item !== null) {
					items.push({
						key: `${prefix}[${index}]`,
						path: [index],
						...(item as object as Record<string, any>)
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
			for (const [key, value] of Object.entries(obj as Record<string, any>)) {
				if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
					const flattened = flattenForTable(value as JSONValue, key + '.');
					items.push(
						...flattened.map((item) => ({
							...item,
							path: [key, ...item.path]
						}))
					);
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
		const newData = structuredClone(data) as any;
		let current: any = newData;
		for (let i = 0; i < path.length - 1; i++) {
			current = current[path[i] as keyof typeof current];
		}
		try {
			current[path[path.length - 1] as keyof typeof current] = JSON.parse(newValue);
		} catch {
			current[path[path.length - 1] as keyof typeof current] = newValue;
		}
		dispatch('update', newData);
	};

	const handleDoubleClick = (path: JSONPath): void => {
		dispatch('focus', path);
	};

	const sortData = (items: TableRow[], key: string, direction: 'asc' | 'desc'): TableRow[] => {
		return [...items].sort((a, b) => {
			const aVal = a[key] ?? '';
			const bVal = b[key] ?? '';
			const compare = aVal.toString().localeCompare(bVal.toString());
			return direction === 'asc' ? compare : -compare;
		});
	};

	$: tableData = flattenForTable(data);
	$: columns = tableData.length > 0 ? Object.keys(tableData[0]).filter((k) => k !== 'path') : [];
	$: sortedData = sortKey ? sortData(tableData, sortKey, sortDirection) : tableData;
</script>

<div class="h-full overflow-auto">
	{#if columns.length > 0}
		<table class="w-full">
			<thead class="sticky top-0 bg-gray-50">
				<tr>
					{#each columns as column}
						<th class="border-b px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
							<button
								class="flex items-center space-x-1 hover:text-gray-700"
								on:click={() => {
									if (sortKey === column) {
										sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
									} else {
										sortKey = column;
										sortDirection = 'asc';
									}
								}}
							>
								<span>{column}</span>
								{#if sortKey === column}
									<span class="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
								{/if}
							</button>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200 bg-white">
				{#each sortedData as row, index}
					<tr class="hover:bg-gray-50">
						{#each columns as column}
							<td class="border-r px-4 py-2 text-sm text-gray-900">
								{#if column === 'key'}
									<button
										class="font-medium text-blue-600 hover:text-blue-800"
										on:dblclick={() => handleDoubleClick(row.path)}
									>
										{row[column]}
									</button>
								{:else}
									<input
										value={typeof row[column] === 'object' ? JSON.stringify(row[column]) : (row[column] ?? '')}
										on:change={(e: Event) => updateValue(row.path, (e.target as HTMLInputElement).value)}
										class="w-full rounded border-0 bg-transparent px-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
									/>
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
