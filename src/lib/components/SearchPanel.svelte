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
		const parentPath = result.path.slice(0, -1);
		navigate({ path: parentPath });
	};

	$effect(() => {
		if (searchQuery) {
			handleSearch();
		} else {
			search({ query: '', keyFilter: null });
		}
	});
</script>

<div class="no-scrollbar flex-1 overflow-y-auto border-b border-gray-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
	<div class="mb-3 flex items-center space-x-2">
		<svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
		<span class="text-xs font-medium text-gray-700">Search</span>
	</div>

	<input
		bind:value={searchQuery}
		placeholder="Search anywhere..."
		class="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
	/>

	<button
		class="mt-2.5 flex items-center space-x-1.5 text-xs text-blue-600 transition-colors hover:text-blue-800"
		onclick={() => (showAdvanced = !showAdvanced)}
	>
		<svg
			class="h-3.5 w-3.5 transition-transform {showAdvanced ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
		<span>{showAdvanced ? 'Hide' : 'Show'} Advanced</span>
	</button>

	{#if showAdvanced}
		<div class="animate-in fade-in slide-in-from-top-2 mt-3 duration-200">
			<input
				bind:value={keyFilter}
				placeholder="Search in specific key..."
				class="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
			/>
			<p class="mt-1.5 text-xs text-gray-500">Leave empty to search everywhere</p>
		</div>
	{/if}

	{#if searchResults.length > 0}
		<div class="animate-in fade-in slide-in-from-top-2 mt-4 h-full duration-300">
			<div class="mb-2 text-xs text-gray-600">
				{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
			</div>
			<div class="max-h-full space-y-2 overflow-y-auto">
				{#each searchResults as result}
					<button
						class="group w-full rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-3 text-left text-xs shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md"
						onclick={() => navigateToResult(result)}
					>
						<div class="font-medium text-gray-900 group-hover:text-blue-700">{result.key}</div>
						<div class="mt-1 truncate text-gray-600">{result.value}</div>
						<div class="mt-1 flex items-center space-x-1 text-gray-400">
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
								/>
							</svg>
							<span class="text-xs">{result.path.join('.')}</span>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{:else if searchQuery}
		<div class="mt-4 rounded-lg bg-gray-50 p-3 text-center text-xs text-gray-500">No results found</div>
	{/if}
</div>

<style>
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
