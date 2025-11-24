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

	let keyName = $state('');
	let defaultValue = $state('');
	let applyToSiblings = $state(false);

	const hasSiblings = $derived.by(() => {
		const parent = getParentArray();
		return parent && parent.length > 1;
	});

	function getParentArray(): any[] | null {
		if (targetPath.length === 0) return null;

		const parent = getNestedValue(data, targetPath.slice(0, -1));
		return Array.isArray(parent) ? parent : null;
	}

	function handleAdd(): void {
		const trimmedKey = keyName.trim();
		if (!trimmedKey) {
			alert('Key name cannot be empty');
			return;
		}

		const newData = safeClone(data);
		const parsedValue = parseValue(defaultValue);
		if (applyToSiblings && hasSiblings) {
			const parentArray = getParentArray();
			if (parentArray) {
				const parent = getNestedValue(newData, targetPath.slice(0, -1)) as any[];
				parent.forEach((item: any) => {
					if (item && typeof item === 'object') {
						item[trimmedKey] = parsedValue;
					}
				});
			}
		} else {
			let current: any = newData;
			for (const key of targetPath) {
				current = current[key];
			}
			if (current && typeof current === 'object') {
				current[trimmedKey] = parsedValue;
			}
		}
		onAdd(newData);
	}

	onMount(() => {
		function handleKeyDown(e: KeyboardEvent): void {
			if (e.key === 'Escape') {
				onClose();
			}
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class={TAILWIND_CLASSES.modals.overlay} role="dialog" onclick={onClose}>
	<div class={TAILWIND_CLASSES.modals.container} role="presentation" onclick={(e) => e.stopPropagation()}>
		<h2 class="mb-4 text-lg font-semibold text-gray-900">Add Key</h2>

		<div class="mb-6 space-y-4">
			<div>
				<label for="keyname" class="mb-2 block text-sm font-medium text-gray-700">Key Name</label>
				<input
					id="keyname"
					type="text"
					bind:value={keyName}
					placeholder="e.g., newField"
					class={TAILWIND_CLASSES.inputs.text}
				/>
			</div>

			<div>
				<label for="defaultval" class="mb-2 block text-sm font-medium text-gray-700">Default Value</label>
				<input
					id="defaultval"
					type="text"
					bind:value={defaultValue}
					placeholder="e.g., 'text' or 123 or true"
					class={TAILWIND_CLASSES.inputs.text}
				/>
				<p class="mt-1.5 text-xs text-gray-500">Can be a string, number, boolean, or JSON</p>
			</div>

			{#if hasSiblings}
				<div class="rounded-lg border border-red-200 bg-red-50 p-3">
					<label class="flex items-start space-x-3">
						<input type="checkbox" bind:checked={applyToSiblings} class="mt-0.5 h-4 w-4 text-red-600" />
						<div>
							<span class="text-sm font-medium text-gray-900">Apply to all siblings</span>
							<p class="text-xs text-gray-600">Add this key to all items in the parent array</p>
						</div>
					</label>
				</div>
			{/if}
		</div>

		<div class="flex justify-end space-x-3">
			<button onclick={onClose} class={TAILWIND_CLASSES.buttons.secondary} type="button"> Cancel </button>
			<button onclick={handleAdd} class={TAILWIND_CLASSES.buttons.success} type="button"> Add Key </button>
		</div>
	</div>
</div>
