<script lang="ts">
	import type { JSONValue, JSONPath } from '$lib/types.ts';

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

	let keyName: string = $state('');
	let defaultValue: string = $state('');
	let applyToSiblings: boolean = $state(false);

	const getParentArray = (): any[] | null => {
		if (targetPath.length === 0) return null;

		let current: any = data;
		for (let i = 0; i < targetPath.length - 1; i++) {
			current = current[targetPath[i]];
		}

		if (Array.isArray(current)) {
			return current;
		}
		return null;
	};

	const hasSiblings = $derived.by(() => {
		const parent = getParentArray();
		return parent && parent.length > 1;
	});

	const handleAdd = (): void => {
		if (!keyName.trim()) {
			alert('Key name cannot be empty');
			return;
		}

		let parsedValue: any;
		try {
			parsedValue = JSON.parse(defaultValue);
		} catch {
			parsedValue = defaultValue;
		}

		const newData = JSON.parse(JSON.stringify(data));

		if (applyToSiblings && hasSiblings) {
			const parentArray = getParentArray();
			if (parentArray) {
				let current: any = newData;
				for (let i = 0; i < targetPath.length - 1; i++) {
					current = current[targetPath[i]];
				}

				current.forEach((item: any) => {
					if (typeof item === 'object' && item !== null) {
						item[keyName] = parsedValue;
					}
				});
			}
		} else {
			let current: any = newData;
			for (const key of targetPath) {
				current = current[key];
			}

			if (typeof current === 'object' && current !== null) {
				current[keyName] = parsedValue;
			}
		}

		onAdd(newData);
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
		<h2 class="mb-4 text-lg font-semibold text-gray-900">Add Key</h2>

		<div class="mb-6 space-y-4">
			<div>
				<label for="keyname" class="mb-2 block text-sm font-medium text-gray-700">Key Name</label>
				<input
					id="keyname"
					type="text"
					bind:value={keyName}
					placeholder="e.g., newField"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				/>
			</div>

			<div>
				<label for="defaultval" class="mb-2 block text-sm font-medium text-gray-700">Default Value</label>
				<input
					id="defaultval"
					type="text"
					bind:value={defaultValue}
					placeholder="e.g., 'text' or 123 or true"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				/>
				<p class="mt-1.5 text-xs text-gray-500">Can be a string, number, boolean, or JSON</p>
			</div>

			{#if hasSiblings}
				<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
					<label class="flex items-start space-x-3">
						<input type="checkbox" bind:checked={applyToSiblings} class="mt-0.5 h-4 w-4 text-blue-600" />
						<div>
							<span class="text-sm font-medium text-gray-900">Apply to all siblings</span>
							<p class="text-xs text-gray-600">Add this key to all items in the parent array</p>
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
				onclick={handleAdd}
				class="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow-md"
				type="button"
			>
				Add Key
			</button>
		</div>
	</div>
</div>
