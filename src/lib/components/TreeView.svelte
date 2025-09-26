<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { JSONValue, JSONPath, SearchMatch, FlatNode } from '$lib/types.ts';

	const dispatch = createEventDispatcher<{
		focus: JSONPath;
		update: JSONValue;
	}>();

	export let data: JSONValue = {} as { [k: string]: JSONValue };
	export let searchResults: SearchMatch[] = [];

	let expandedNodes = new Set<string>();

	const pathToKey = (path: JSONPath): string => path.map(String).join('.');

	const toggleNode = (path: JSONPath): void => {
		const k = pathToKey(path);
		if (expandedNodes.has(k)) expandedNodes.delete(k);
		else expandedNodes.add(k);
		expandedNodes = new Set(expandedNodes);
	};

	const isExpanded = (path: JSONPath): boolean => expandedNodes.has(pathToKey(path));

	const handleDoubleClick = (path: JSONPath): void => {
		dispatch('focus', path);
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

	const addItem = (path: JSONPath, key: string | number, value: any): void => {
		const newData = structuredClone(data) as any;
		let current: any = newData;
		for (const p of path) {
			current = current[p as keyof typeof current];
		}
		if (Array.isArray(current) && typeof key === 'number') {
			current.splice(key, 0, value);
		} else {
			current[key as string] = value;
		}
		dispatch('update', newData);
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
		dispatch('update', newData);
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

	$: visibleNodes = buildVisibleNodes();

	const nodeHasSearchMatch = (node: FlatNode): boolean => {
		const nodeKey = pathToKey(node.path);
		return searchResults.some((r) => pathToKey(r.path).startsWith(nodeKey));
	};
</script>

<div class="h-full overflow-auto bg-white p-4">
	<div class="font-mono text-sm">
		{#each visibleNodes as node (pathToKey(node.path))}
			<div class="flex items-center" style="margin-left: {node.depth * 1}rem;">
				{#if node.hasChildren}
					<button
						class="mr-2 text-gray-400 hover:text-gray-600"
						on:click={() => toggleNode(node.path)}
						aria-expanded={isExpanded(node.path)}
						type="button"
					>
						{isExpanded(node.path) ? '▼' : '▶'}
					</button>
				{:else}
					<div class="mr-2 w-5"></div>
				{/if}

				<div class="flex-1">
					<div class="group flex items-center">
						<span
							class="cursor-pointer rounded px-1 font-semibold text-blue-600 hover:bg-blue-50"
							on:dblclick={() => handleDoubleClick(node.path)}
							role="button"
							tabindex="0"
						>
							{node.key !== null ? node.key : 'root'}
							{#if node.isArray}
								<span>{'[]'}</span>
							{:else if node.isObject}
								<span>{'{}'}</span>
							{/if}
						</span>
						<span class="ml-2 text-xs text-gray-500">
							{#if node.isArray}
								{node.childCount} items
							{:else if node.isObject}
								{node.childCount} props
							{:else}
								<span class="text-gray-600"
									>{typeof node.value === 'string' ? `"${node.value}"` : String(node.value)}</span
								>
							{/if}
						</span>
					</div>
				</div>

				<div class="ml-2 opacity-0 group-hover:opacity-100">
					<button class="mr-2 text-xs text-blue-600" on:click={() => dispatch('focus', node.path)} type="button">
						Open
					</button>
					<button class="text-xs text-red-500" on:click={() => deleteItem(node.path)} type="button"> x </button>
				</div>
			</div>
		{/each}
	</div>
</div>
