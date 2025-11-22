<script lang="ts">
	import type { JSONValue } from '$lib/types';
	import { TAILWIND_CLASSES, EDITOR_CONSTANTS } from '$lib/utils/constants';

	let {
		data,
		onFormat,
		onClose
	}: {
		data: JSONValue;
		onFormat: (formatted: string, indentSize: number) => void;
		onClose: () => void;
	} = $props();

	let selectedFormat: 'standard' | 'compact' = $state('standard');
	let indentSize = $state(EDITOR_CONSTANTS.DEFAULT_INDENT_SIZE);

	const formatOptions = [
		{
			value: 'standard',
			label: 'Standard (Pretty Print)',
			description: 'Standard JSON with configurable indentation'
		},
		{
			value: 'compact',
			label: 'Compact (Minified)',
			description: 'Single line, no whitespace'
		}
	];

	function applyFormat(): void {
		const finalIndent = selectedFormat === 'compact' ? 0 : indentSize;
		const formatted = selectedFormat === 'compact' ? JSON.stringify(data) : JSON.stringify(data, null, indentSize);

		onFormat(formatted, finalIndent);
		onClose();
	}
</script>

<div
	class={TAILWIND_CLASSES.modals.overlay}
	role="dialog"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	tabindex="-1"
>
	<div
		class={TAILWIND_CLASSES.modals.container}
		role="presentation"
		onclick={(e) => e.stopPropagation()}
		onkeydown={() => {}}
	>
		<h2 class="mb-4 text-lg font-semibold text-gray-900">Format JSON</h2>

		<div class="mb-6 space-y-4">
			{#each formatOptions as option}
				<label class="flex cursor-pointer items-start space-x-3 rounded-lg border p-3 hover:bg-gray-50">
					<input type="radio" bind:group={selectedFormat} value={option.value} class="mt-1 h-4 w-4 text-red-600" />
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
						min={EDITOR_CONSTANTS.MIN_INDENT_SIZE}
						max={EDITOR_CONSTANTS.MAX_INDENT_SIZE}
						class={TAILWIND_CLASSES.inputs.text}
					/>
				</div>
			{/if}
		</div>

		<div class="flex justify-end space-x-3">
			<button onclick={onClose} class={TAILWIND_CLASSES.buttons.secondary} type="button"> Cancel </button>
			<button onclick={applyFormat} class={TAILWIND_CLASSES.buttons.success} type="button"> Apply Format </button>
		</div>
	</div>
</div>
