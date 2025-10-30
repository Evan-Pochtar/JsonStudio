<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import JsonEditor from '$lib/components/JsonEditor.svelte';
	import type { JSONValue } from '$lib/types.ts';
	import Logo from '$lib/assets/logo.png';

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
	<header class="border-b border-gray-200/80 bg-white/95 px-6 py-4 shadow-sm backdrop-blur-sm">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-3">
				<img src={Logo} alt="Logo" class="h-12 w-12 rounded-lg" />
				<h1 class="text-xl font-semibold text-gray-900">JSON Studio</h1>
			</div>
			<div class="flex items-center space-x-2">
				<button
					onclick={() => fileInput?.click()}
					class="inline-flex items-center rounded-lg border border-transparent bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-red-700 hover:to-red-800 hover:shadow-md focus:ring-2 focus:ring-red-500/20 focus:ring-offset-2 focus:outline-none"
					type="button"
				>
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
						/>
					</svg>
					Open File
				</button>
				<button
					onclick={createNewFile}
					class="inline-flex items-center rounded-lg border border-transparent bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-red-700 hover:to-red-800 hover:shadow-md focus:ring-2 focus:ring-red-500/20 focus:ring-offset-2 focus:outline-none"
					type="button"
				>
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					New File
				</button>
				<input
					bind:this={fileInput}
					type="file"
					accept=".json,application/json"
					onchange={handleFileUpload}
					class="hidden"
				/>
			</div>
		</div>
	</header>
	<div class="flex-1 overflow-hidden">
		<JsonEditor bind:this={jsonEditor} />
	</div>
</div>
