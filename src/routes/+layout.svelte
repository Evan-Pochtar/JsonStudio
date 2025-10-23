<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { children } = $props();

	onMount(() => {
		if (browser) {
			const handleKeydown = (e: any) => {
				if (e.ctrlKey || e.metaKey) {
					switch (e.key.toLowerCase()) {
						case 's':
							e.preventDefault();
							window.dispatchEvent(new CustomEvent('editor:save'));
							break;
						case 'z':
							if (e.shiftKey) {
								e.preventDefault();
								window.dispatchEvent(new CustomEvent('editor:redo'));
							} else {
								e.preventDefault();
								window.dispatchEvent(new CustomEvent('editor:undo'));
							}
							break;
						case 'a':
							if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
								e.preventDefault();
								window.dispatchEvent(new CustomEvent('editor:selectall'));
							}
							break;
					}
				}
			};

			window.addEventListener('keydown', handleKeydown);
			return () => window.removeEventListener('keydown', handleKeydown);
		}
	});
</script>

<main class="h-full">
	{@render children?.()}
</main>
