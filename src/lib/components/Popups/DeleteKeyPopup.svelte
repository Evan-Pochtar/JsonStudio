<script lang="ts">
	import type { JSONValue } from '$lib/types.ts';

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

	let deleteFromSiblings: boolean = $state(false);

	const findDuplicates = (): number => {
		let count = 0;

		const search = (obj: any) => {
			if (Array.isArray(obj)) {
				obj.forEach((item) => {
					if (typeof item === 'object' && item !== null && keyToDelete in item) {
						count++;
					}
					search(item);
				});
			} else if (typeof obj === 'object' && obj !== null) {
				for (const value of Object.values(obj)) {
					search(value);
				}
			}
		};

		search(data);
		return count;
	};

	const duplicateCount = $derived(findDuplicates());
	const hasDuplicates = $derived(duplicateCount > 1);

	const handleDelete = (): void => {
		const newData = JSON.parse(JSON.stringify(data));

		const removeKey = (obj: any) => {
			if (Array.isArray(obj)) {
				obj.forEach((item) => {
					if (typeof item === 'object' && item !== null) {
						if (deleteFromSiblings && keyToDelete in item) {
							delete item[keyToDelete];
						}
					}
					removeKey(item);
				});
			} else if (typeof obj === 'object' && obj !== null) {
				if (!deleteFromSiblings && keyToDelete in obj) {
					delete obj[keyToDelete];
					return;
				}
				for (const value of Object.values(obj)) {
					removeKey(value);
				}
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
						if (typeof item === 'object' && item !== null && keyToDelete in item) {
							delete item[keyToDelete];
							deleted = true;
							return true;
						}
						if (removeSingle(item)) return true;
					}
				} else if (typeof obj === 'object' && obj !== null) {
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
		onClose();
	};
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
	role="dialog"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	tabindex="-1"
>
	<div
		class="animate-in fade-in zoom-in-95 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-gray-200 duration-200"
		role="presentation"
		onclick={(e) => e.stopPropagation()}
		onkeydown={() => {}}
	>
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
						<p class="text-sm font-medium text-red-800">Are you sure you want to delete "{keyToDelete}"?</p>
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
							<p class="text-xs text-gray-600">Remove this key from all {duplicateCount} locations</p>
						</div>
					</label>
				</div>
			{/if}
		</div>

		<div class="flex justify-end space-x-3">
			<button
				onclick={onClose}
				class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow"
				type="button"
			>
				Cancel
			</button>
			<button
				onclick={handleDelete}
				class="rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-red-700 hover:to-red-800 hover:shadow-md"
				type="button"
			>
				Delete Key
			</button>
		</div>
	</div>
</div>
