<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import JsonEditor from '$lib/components/JsonEditor.svelte';
	import type { JSONValue } from '$lib/types.ts';

	let jsonEditor: { loadJson?: (data: JSONValue, name?: string) => void } | null = null;
	let fileInput: HTMLInputElement | null = null;

	const handleFileUpload = async (event: Event): Promise<void> => {
		const input = event.target as HTMLInputElement | null;
		const file = input?.files?.[0];
		if (!file) return;

		const isJsonMime = file.type === 'application/json';
		const isJsonExt = file.name.toLowerCase().endsWith('.json');
		if (!isJsonMime && !isJsonExt) {
			alert('Please select a JSON file');
			return;
		}

		try {
			const text = await file.text();
			const data = JSON.parse(text) as JSONValue;
			jsonEditor?.loadJson?.(data, file.name);
		} catch (e) {
			alert('Invalid JSON file');
		}
	};

	const createNewFile = (): void => {
		jsonEditor?.loadJson?.({}, 'untitled.json');
	};

	onMount(() => {
		const sampleData: JSONValue = {
			users: [
				{ id: 1, name: 'David Smith', email: 'david@example.com', role: 'admin', active: true },
				{ id: 2, name: 'Sarah Johnson', email: 'sarah@example.com', role: 'user', active: true },
				{ id: 3, name: 'Mike Davis', email: 'mike@example.com', role: 'user', active: false }
			],
			settings: {
				theme: 'dark',
				notifications: true,
				autoSave: false
			},
			metadata: {
				version: '1.0.0',
				created: '2024-01-01T00:00:00Z',
				lastModified: '2024-01-15T10:30:00Z'
			}
		};

		if (browser) {
			jsonEditor?.loadJson?.(sampleData, 'sample.json');
		}
	});
</script>

<div class="flex h-screen flex-col bg-white">
	<header class="border-b border-gray-200 bg-white px-6 py-3">
		<div class="flex items-center justify-between">
			<h1 class="text-xl font-semibold text-gray-900">JSON Editor</h1>
			<div class="flex items-center space-x-3">
				<button
					on:click={() => fileInput?.click()}
					class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm leading-4 font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					type="button"
				>
					Open File
				</button>
				<button
					on:click={createNewFile}
					class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm leading-4 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					type="button"
				>
					New File
				</button>
				<input
					bind:this={fileInput}
					type="file"
					accept=".json,application/json"
					on:change={handleFileUpload}
					class="hidden"
				/>
			</div>
		</div>
	</header>
	<div class="flex-1 overflow-hidden">
		<JsonEditor bind:this={jsonEditor} />
	</div>
</div>
