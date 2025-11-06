<script lang="ts">
	import type { TableRow, JSONValue, JSONPath } from '$lib/types.ts';

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

	let sortKey: string = $state('');
	let sortDirection: 'asc' | 'desc' = $state('asc');

	const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
		const flattened: Record<string, any> = {};
		for (const [key, value] of Object.entries(obj)) {
			const newKey = prefix ? `${prefix}.${key}` : key;
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				Object.assign(flattened, flattenObject(value, newKey));
			} else if (Array.isArray(value)) {
				flattened[newKey] = `[${value.length} items]`;
			} else {
				flattened[newKey] = value;
			}
		}
		return flattened;
	};

	const flattenForTable = (obj: JSONValue, prefix = ''): TableRow[] => {
		const items: TableRow[] = [];

		if (Array.isArray(obj)) {
			obj.forEach((item, index) => {
				if (typeof item === 'object' && item !== null) {
					const flattened = flattenObject(item);
					items.push({
						key: `${prefix}[${index}]`,
						path: [index],
						...flattened
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

			if (entries.length > 0) {
				const hasComplexChildren = entries.some(([_, value]) => typeof value === 'object' && value !== null);

				if (hasComplexChildren) {
					for (const [key, value] of entries) {
						if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
							const flattened = flattenObject(value);
							items.push({
								key,
								path: [key],
								...flattened
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
				} else {
					const row: TableRow = {
						key: 'root',
						path: []
					};
					for (const [key, value] of entries) {
						row[key] = value;
					}
					items.push(row);
				}
			}
		}

		return items;
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
		update(newData);
	};

	const handleDoubleClick = (path: JSONPath): void => {
		focus(path);
	};

	const sortData = (items: TableRow[], key: string, direction: 'asc' | 'desc'): TableRow[] => {
		return [...items].sort((a, b) => {
			const aVal = a[key] ?? '';
			const bVal = b[key] ?? '';

			if (typeof aVal === 'number' && typeof bVal === 'number') {
				return direction === 'asc' ? aVal - bVal : bVal - aVal;
			}

			const compare = aVal.toString().localeCompare(bVal.toString());
			return direction === 'asc' ? compare : -compare;
		});
	};

	const tableData = $derived(flattenForTable(data));
	const columns = $derived(tableData.length > 0 ? Object.keys(tableData[0]).filter((k) => k !== 'path') : []);
	const sortedData = $derived(sortKey ? sortData(tableData, sortKey, sortDirection) : tableData);
</script>

<div class="h-full overflow-auto">
	{#if columns.length > 0}
		<table class="w-full">
			<thead class="sticky top-0 bg-gradient-to-b from-gray-50 to-gray-100 shadow-sm">
				<tr>
					{#each columns as column}
						<th
							class="border-b-2 border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-700 uppercase"
						>
							<button
								class="flex items-center space-x-2 transition-colors hover:text-gray-900"
								onclick={() => {
									if (sortKey === column) {
										sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
									} else {
										sortKey = column;
										sortDirection = 'asc';
									}
								}}
							>
								<span class="max-w-xs truncate" title={column}>{column}</span>
								{#if sortKey === column}
									<svg
										class="h-3.5 w-3.5 text-blue-600 transition-transform {sortDirection === 'desc'
											? 'rotate-180'
											: ''}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
									</svg>
								{/if}
							</button>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200 bg-white">
				{#each sortedData as row, index}
					<tr class="transition-colors duration-150 hover:bg-blue-50/30">
						{#each columns as column}
							<td class="border-r border-gray-100 px-4 py-3 text-sm text-gray-900">
								{#if column === 'key'}
									<button
										class="rounded-md px-2 py-1 font-medium text-blue-600 transition-all duration-200 hover:bg-blue-100"
										ondblclick={() => handleDoubleClick(row.path)}
									>
										{row[column]}
									</button>
								{:else if typeof row[column] === 'string' && row[column].startsWith('[') && row[column].includes('items]')}
									<button
										class="rounded-md px-2 py-1 text-purple-600 transition-all duration-200 hover:bg-purple-100"
										ondblclick={() => handleDoubleClick(row.path)}
									>
										{row[column]}
									</button>
								{:else}
									<input
										value={typeof row[column] === 'object' ? JSON.stringify(row[column]) : (row[column] ?? '')}
										onchange={(e) => updateValue(row.path, (e.target as HTMLInputElement).value)}
										class="w-full rounded-md border-0 bg-transparent px-2 py-1 transition-all duration-200 hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
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
