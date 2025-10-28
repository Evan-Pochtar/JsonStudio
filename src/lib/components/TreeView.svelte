<script lang="ts">
	import type { JSONValue, JSONPath, FlatNode } from '$lib/types.ts';

	let {
		focus,
		update,
		data
	}: {
		focus: (e: JSONPath) => void;
		update: (e: JSONValue) => void;
		data: JSONValue;
	} = $props();

	let expandedNodes = $state(new Set<string>());

	const pathToKey = (path: JSONPath): string => path.map(String).join('.');
	const toggleNode = (path: JSONPath): void => {
		const k = pathToKey(path);
		const newSet = new Set(expandedNodes);
		if (newSet.has(k)) {
			newSet.delete(k);
		} else {
			newSet.add(k);
		}
		expandedNodes = newSet;
	};

	const isExpanded = (path: JSONPath): boolean => expandedNodes.has(pathToKey(path));

	const handleDoubleClick = (path: JSONPath): void => {
		focus(path);
	};

	const deleteItem = (path: JSONPath): void => {
		const newData = structuredClone(data) as any;
		let current: any = newData;
		for (let i = 0; i < path.length - 1; i++) {
			current = current[path[i] as keyof typeof current];
		}
		const last = path[path.length - 1];
		if (Array.isArray(current) && typeof last === 'number') {
			current.splice(last, 1);
		} else {
			delete current[last as keyof typeof current];
		}
		update(newData);
	};

	const buildVisibleNodes = (): FlatNode[] => {
		const out: FlatNode[] = [];

		const walk = (value: JSONValue, path: JSONPath = [], depth = 0) => {
			const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
			const isArray = Array.isArray(value);
			const childrenKeys = isArray
				? (value as JSONValue[]).map((_, i) => i as number)
				: isObject
					? Object.keys(value as Record<string, any>)
					: [];
			const childCount = childrenKeys.length;
			const node: FlatNode = {
				key: path.length === 0 ? null : String(path[path.length - 1]),
				path: [...path],
				value,
				isObject,
				isArray,
				depth,
				hasChildren: childCount > 0,
				childCount
			};
			out.push(node);

			const k = pathToKey(path);
			const shouldDescend = path.length === 0 || expandedNodes.has(k);
			if (shouldDescend && childCount > 0) {
				if (isArray) {
					(value as JSONValue[]).forEach((item, i) => walk(item, [...path, i], depth + 1));
				} else if (isObject) {
					for (const key of Object.keys(value as Record<string, any>)) {
						walk((value as Record<string, any>)[key], [...path, key], depth + 1);
					}
				}
			}
		};

		walk(data, [], 0);
		return out;
	};

	const visibleNodes = $derived(buildVisibleNodes());
</script>

<div class="h-full overflow-auto bg-gradient-to-b from-white to-gray-50/30 p-4">
	<div class="font-mono text-sm">
		{#each visibleNodes as node (pathToKey(node.path))}
			<div
				class="group flex items-center rounded-lg transition-all duration-150 hover:bg-blue-50/50"
				style="padding-left: {node.depth * 1}rem;"
			>
				{#if node.hasChildren}
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

				<div class="flex flex-1 items-center py-1.5">
					<span
						class="cursor-pointer rounded-md px-2 py-1 font-semibold text-blue-600 transition-all duration-200 hover:bg-blue-100"
						ondblclick={() => handleDoubleClick(node.path)}
						role="button"
						tabindex="0"
					>
						{node.key !== null ? node.key : 'root'}
						{#if node.isArray}
							<span class="text-purple-600">[]</span>
						{:else if node.isObject}
							<span class="text-purple-600">{'{}'}</span>
						{/if}
					</span>
					<span class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
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
				</div>

				<div class="ml-2 flex shrink-0 space-x-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
					<button
						class="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 transition-all duration-200 hover:bg-blue-200"
						onclick={() => focus(node.path)}
						type="button"
					>
						Open
					</button>
					<button
						class="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 transition-all duration-200 hover:bg-red-200"
						onclick={() => deleteItem(node.path)}
						type="button"
					>
						Delete
					</button>
				</div>
			</div>
		{/each}
	</div>
</div>
