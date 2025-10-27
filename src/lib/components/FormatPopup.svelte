<script lang="ts">
	import type { JSONValue } from '$lib/types.ts';

	let {
		data,
		onFormat,
		onClose
	}: {
		data: JSONValue;
		onFormat: (formatted: string) => void;
		onClose: () => void;
	} = $props();

	let selectedFormat: 'standard' | 'compact' | 'rfc8259' | 'ecma404' = $state('standard');
	let indentSize: number = $state(2);

	const formatOptions = [
		{ value: 'standard', label: 'Standard (Pretty Print)', description: 'Standard JSON with configurable indentation' },
		{ value: 'compact', label: 'Compact (Minified)', description: 'Single line, no whitespace' },
		{ value: 'rfc8259', label: 'RFC 8259 Compliant', description: 'Internet standard format' },
		{ value: 'ecma404', label: 'ECMA-404 Standard', description: 'JSON data interchange syntax' }
	];

	const applyFormat = (): void => {
		let formatted: string;
		switch (selectedFormat) {
			case 'compact':
				formatted = JSON.stringify(data);
				break;
			case 'rfc8259':
			case 'ecma404':
				formatted = JSON.stringify(data, null, indentSize);
				break;
			case 'standard':
			default:
				formatted = JSON.stringify(data, null, indentSize);
				break;
		}
		onFormat(formatted);
		onClose();
	};
</script>

<dialog
	class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	aria-modal="true"
	open
>
	<div
		class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
		onclick={(e) => e.stopPropagation()}
		role="presentation"
	>
		<h2 class="mb-4 text-lg font-semibold text-gray-900">Format JSON</h2>

		<div class="mb-6 space-y-4">
			{#each formatOptions as option}
				<label class="flex cursor-pointer items-start space-x-3 rounded-lg border p-3 hover:bg-gray-50">
					<input type="radio" bind:group={selectedFormat} value={option.value} class="mt-1 h-4 w-4 text-blue-600" />
					<div class="flex-1">
						<div class="text-sm font-medium text-gray-900">{option.label}</div>
						<div class="text-xs text-gray-500">{option.description}</div>
					</div>
				</label>
			{/each}

			{#if selectedFormat !== 'compact'}
				<div class="rounded-lg border p-3">
					<label for="indentSize" class="mb-2 block text-sm font-medium text-gray-700">Indentation Size</label>
					<input
						id="indentSize"
						type="number"
						bind:value={indentSize}
						min="1"
						max="8"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>
			{/if}
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
				onclick={applyFormat}
				class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
				type="button"
			>
				Apply Format
			</button>
		</div>
	</div>
</dialog>
