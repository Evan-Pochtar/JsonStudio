<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { children } = $props();

	onMount(() => {
		if (!browser) return;

		const keyMap: Record<string, string> = {
			s: 'editor:save',
			a: 'editor:selectall'
		};

		function handleKeydown(e: KeyboardEvent): void {
			if (!(e.ctrlKey || e.metaKey)) return;

			const key = e.key.toLowerCase();
			if (key === 'z') {
				e.preventDefault();
				const event = e.shiftKey ? 'editor:redo' : 'editor:undo';
				window.dispatchEvent(new CustomEvent(event));
				return;
			}

			if (key in keyMap) {
				const shouldPrevent =
					key !== 'a' ||
					(document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA');

				if (shouldPrevent) {
					e.preventDefault();
					window.dispatchEvent(new CustomEvent(keyMap[key]));
				}
			}
		}

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<main class="h-full">
	{@render children?.()}
</main>
