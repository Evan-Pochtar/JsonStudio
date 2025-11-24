<script lang="ts">
	import { onMount } from 'svelte';
	import type { JSONValue } from '$lib/types';
	import { TAILWIND_CLASSES } from '$lib/utils/constants';

	let {
		data,
		keyToDelete,
		onDelete,
		onClose
	}: {
		data: JSONValue;
		keyToDelete: string;
		onDelete: (newData: JSONValue) => void;
		onClose: () => void;
	} = $props();

	let deleteFromSiblings = $state(false);

	const duplicateCount = $derived(findDuplicates());
	const hasDuplicates = $derived(duplicateCount > 1);

	function findDuplicates(): number {
		let count = 0;
		function search(obj: any): void {
			if (Array.isArray(obj)) {
				obj.forEach((item) => {
					if (item && typeof item === 'object' && keyToDelete in item) {
						count++;
					}
					search(item);
				});
			} else if (obj && typeof obj === 'object') {
				Object.values(obj).forEach(search);
			}
		}

		search(data);
		return count;
	}

	function handleDelete(): void {
		const newData = JSON.parse(JSON.stringify(data));

		const removeKey = (obj: any): void => {
			if (Array.isArray(obj)) {
				obj.forEach((item) => {
					if (item && typeof item === 'object') {
						if (deleteFromSiblings && keyToDelete in item) {
							delete item[keyToDelete];
						}
					}
					removeKey(item);
				});
			} else if (obj && typeof obj === 'object') {
				if (!deleteFromSiblings && keyToDelete in obj) {
					delete obj[keyToDelete];
					return;
				}
				Object.values(obj).forEach(removeKey);
			}
		};

		if (deleteFromSiblings) {
			removeKey(newData);
		} else {
			let deleted = false;
			const removeSingle = (obj: any): boolean => {
				if (deleted) return false;

				if (Array.isArray(obj)) {
					for (const item of obj) {
						if (item && typeof item === 'object' && keyToDelete in item) {
							delete item[keyToDelete];
							deleted = true;
							return true;
						}
						if (removeSingle(item)) return true;
					}
				} else if (obj && typeof obj === 'object') {
					if (keyToDelete in obj) {
						delete obj[keyToDelete];
						deleted = true;
						return true;
					}
					for (const value of Object.values(obj)) {
						if (removeSingle(value)) return true;
					}
				}
				return false;
			};
			removeSingle(newData);
		}
		onDelete(newData);
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
		<h2 class="mb-4 text-lg font-semibold text-gray-900">Delete Key</h2>

		<div class="mb-6 space-y-4">
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="flex items-start space-x-3">
					<svg class="mt-0.5 h-5 w-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
					<div>
						<p class="text-sm font-medium text-red-800">
							Are you sure you want to delete "{keyToDelete}"?
						</p>
						{#if hasDuplicates}
							<p class="mt-1 text-xs text-red-700">
								This key appears {duplicateCount} times in your data.
							</p>
						{:else}
							<p class="mt-1 text-xs text-red-700">This action cannot be undone.</p>
						{/if}
					</div>
				</div>
			</div>

			{#if hasDuplicates}
				<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
					<label class="flex items-start space-x-3">
						<input type="checkbox" bind:checked={deleteFromSiblings} class="mt-0.5 h-4 w-4 text-blue-600" />
						<div>
							<span class="text-sm font-medium text-gray-900">Delete from all occurrences</span>
							<p class="text-xs text-gray-600">
								Remove this key from all {duplicateCount} locations
							</p>
						</div>
					</label>
				</div>
			{/if}
		</div>

		<div class="flex justify-end space-x-3">
			<button onclick={onClose} class={TAILWIND_CLASSES.buttons.secondary} type="button"> Cancel </button>
			<button onclick={handleDelete} class={TAILWIND_CLASSES.buttons.danger} type="button"> Delete Key </button>
		</div>
	</div>
</div>
