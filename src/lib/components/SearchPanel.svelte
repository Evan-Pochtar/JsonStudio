<script lang="ts">
	import type { JSONPath, SearchMatch } from '$lib/types.ts';

	let {
		search,
		navigate,
		searchQuery = $bindable(),
		searchResults = []
	}: {
		search: (e: { query: string | undefined; keyFilter: string | null }) => void;
		navigate: (e: { path: JSONPath }) => void;
		searchQuery: string | undefined;
		searchResults: SearchMatch[];
	} = $props();

	let keyFilter: string = $state('');
	let showAdvanced = $state(false);

	const handleSearch = (): void => {
		search({
			query: searchQuery,
			keyFilter: keyFilter.trim() || null
		});
	};

	const navigateToResult = (result: SearchMatch): void => {
		navigate({ path: result.path });
	};

	$effect(() => {
		if (searchQuery) {
			handleSearch();
		}
	});
</script>

<div class="flex-1 overflow-y-auto border-b border-gray-200 bg-white p-3">
	<div class="mb-2 text-xs font-medium text-gray-700">Search</div>

	<input
		bind:value={searchQuery}
		placeholder="Search anywhere..."
		class="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
	/>

	<button class="mt-2 text-xs text-blue-600 hover:text-blue-800" onclick={() => (showAdvanced = !showAdvanced)}>
		{showAdvanced ? 'Hide' : 'Show'} Advanced
	</button>

	{#if showAdvanced}
		<div class="mt-2">
			<input
				bind:value={keyFilter}
				placeholder="Search in specific key..."
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
			<div class="mt-1 text-xs text-gray-500">Leave empty to search everywhere</div>
		</div>
	{/if}

	{#if searchResults.length > 0}
		<div class="mt-3">
			<div class="mb-2 text-xs text-gray-600">
				{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
			</div>
			<div class="max-h-40 space-y-1 overflow-y-auto">
				{#each searchResults as result}
					<button
						class="w-full rounded border bg-gray-50 p-2 text-left text-xs hover:bg-gray-100"
						onclick={() => navigateToResult(result)}
					>
						<div class="font-medium text-gray-900">{result.key}</div>
						<div class="truncate text-gray-600">{result.value}</div>
						<div class="text-gray-400">{result.path.join('.')}</div>
					</button>
				{/each}
			</div>
		</div>
	{:else if searchQuery}
		<div class="mt-3 text-xs text-gray-500">No results found</div>
	{/if}
</div>
