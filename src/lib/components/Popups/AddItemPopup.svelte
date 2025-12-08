<script lang="ts">
	import { onMount } from 'svelte';
	import type { JSONValue, JSONPath } from '$lib/types';
	import { safeClone, parseValue, getNestedValue } from '$lib/utils/helpers';
	import { TAILWIND_CLASSES } from '$lib/utils/constants';

	let {
		data,
		targetPath,
		onAdd,
		onClose
	}: {
		data: JSONValue;
		targetPath: JSONPath;
		onAdd: (newData: JSONValue) => void;
		onClose: () => void;
	} = $props();

	let itemValue = $state('');
	let textarea: HTMLTextAreaElement | null = null;

	function handleAdd(): void {
		const trimmedValue = itemValue.trim();
		if (!trimmedValue) {
			alert('Item value cannot be empty');
			return;
		}

		try {
			const newData = safeClone(data);
			const parsedValue = parseValue(trimmedValue);
			const targetArray = targetPath.length === 0 ? newData : getNestedValue(newData, targetPath);
			if (!Array.isArray(targetArray)) {
				alert('Target is not an array');
				return;
			}
			targetArray.push(parsedValue);
			onAdd(newData);
		} catch (e) {
			alert('Invalid JSON value');
		}
	}

	onMount(() => {
		function handleKeyDown(e: KeyboardEvent): void {
			if (e.key === 'Escape') {
				onClose();
			}
		}
		window.addEventListener('keydown', handleKeyDown);
		if (textarea) {
			textarea.focus();
			const lines = itemValue.split('\n');
			const position = lines[0].length + 1;
			textarea.setSelectionRange(position, position);
		}
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class={TAILWIND_CLASSES.modals.overlay} role="dialog" onclick={onClose}>
	<div class={TAILWIND_CLASSES.modals.container} role="presentation" onclick={(e) => e.stopPropagation()}>
		<h2 class="mb-4 text-lg font-semibold text-gray-900">Add Array Item</h2>

		<div class="mb-6 space-y-4">
			<div>
				<label for="itemvalue" class="mb-2 block text-sm font-medium text-gray-700">Item Value</label>
				<textarea
					bind:this={textarea}
					id="itemvalue"
					bind:value={itemValue}
					placeholder={`{"name": "John", "age": 30}`}
					rows="8"
					class="w-full resize-none rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
				></textarea>
				<p class="mt-1.5 text-xs text-gray-500">Can be an object, array, string, number, boolean, or null</p>
			</div>
		</div>

		<div class="flex justify-end space-x-3">
			<button onclick={onClose} class={TAILWIND_CLASSES.buttons.secondary} type="button"> Cancel </button>
			<button onclick={handleAdd} class={TAILWIND_CLASSES.buttons.success} type="button"> Add Item </button>
		</div>
	</div>
</div>
