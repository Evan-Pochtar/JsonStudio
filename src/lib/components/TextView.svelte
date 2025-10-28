<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import type { JSONValue } from '$lib/types.ts';

	let {
		update,
		data
	}: {
		update: (data: JSONValue) => void;
		data: JSONValue;
	} = $props();

	let textContent: string = $state('');
	let lineNumbers: number[] = $state([]);
	let errorLine: number | null = $state(null);
	let textarea: HTMLTextAreaElement | null = null;

	const updateTextContent = (): void => {
		try {
			textContent = JSON.stringify(data, null, 2);
			errorLine = null;
			updateLineNumbers();
		} catch (e) {
			console.error('Failed to stringify JSON:', e);
		}
	};

	const updateLineNumbers = (): void => {
		const lines = textContent.split('\n');
		lineNumbers = lines.map((_, i) => i + 1);
	};

	const handleInput = (): void => {
		try {
			const parsed = JSON.parse(textContent);
			update(parsed);
			errorLine = null;
		} catch (e: any) {
			const msg = e?.message ?? String(e);
			const match = msg.match(/line[:\s]+(\d+)/i) || msg.match(/position\s+(\d+)/i);
			if (match) {
				const maybePos = parseInt(match[1], 10);
				if (msg.toLowerCase().includes('position')) {
					const pos = maybePos;
					const upToPos = textContent.slice(0, pos);
					errorLine = upToPos.split('\n').length;
				} else {
					errorLine = maybePos;
				}
			} else {
				errorLine = null;
			}
		}
		updateLineNumbers();
	};

	const formatJson = async (): Promise<void> => {
		try {
			const parsed = JSON.parse(textContent);
			textContent = JSON.stringify(parsed, null, 2);
			updateLineNumbers();
			update(parsed);
			await tick();
			if (textarea) textarea.focus();
		} catch {}
	};

	const handleKeyDown = (e: KeyboardEvent): void => {
		if (!textarea) return;

		if (e.key === 'Tab') {
			e.preventDefault();
			const start = textarea.selectionStart ?? 0;
			const end = textarea.selectionEnd ?? 0;
			const newValue = textContent.substring(0, start) + '  ' + textContent.substring(end);
			textContent = newValue;
			requestAnimationFrame(() => {
				if (!textarea) return;
				textarea.selectionStart = textarea.selectionEnd = start + 2;
			});
			return;
		}

		if (e.key === '{' || e.key === '[') {
			e.preventDefault();
			const start = textarea.selectionStart ?? 0;
			const end = textarea.selectionEnd ?? 0;
			const closer = e.key === '{' ? '}' : ']';
			const newValue = textContent.substring(0, start) + e.key + closer + textContent.substring(end);
			textContent = newValue;
			requestAnimationFrame(() => {
				if (!textarea) return;
				textarea.selectionStart = textarea.selectionEnd = start + 1;
			});
		}
	};

	onMount(() => {
		updateTextContent();

		if (browser) {
			const handleFormat = (): void => void formatJson();
			window.addEventListener('editor:format', handleFormat as EventListener);
			return () => window.removeEventListener('editor:format', handleFormat as EventListener);
		}
	});

	$effect(() => {
		if (data) {
			updateTextContent();
		}
	});
</script>

<div class="flex h-full">
	<div class="min-w-12 overflow-auto border-r bg-gray-50 px-3 py-4 font-mono text-xs text-gray-500 select-none">
		{#each lineNumbers as lineNum}
			<div class="leading-6" class:error={errorLine === lineNum}>
				<span class:errorLine={errorLine === lineNum}>
					{lineNum}
				</span>
			</div>
		{/each}
	</div>

	<div class="relative flex-1">
		<textarea
			bind:this={textarea}
			bind:value={textContent}
			oninput={handleInput}
			onkeydown={handleKeyDown}
			class="h-full w-full resize-none border-0 bg-white p-4 font-mono text-sm leading-6 focus:outline-none"
			placeholder="Enter JSON here..."
			spellcheck="false"
		></textarea>

		{#if errorLine}
			<div
				class="animate-in slide-in-from-bottom-2 fade-in absolute right-4 bottom-4 left-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 shadow-lg duration-300"
			>
				<div class="flex items-center space-x-2">
					<svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span class="text-sm font-medium text-red-800">JSON syntax error on line {errorLine}</span>
				</div>
			</div>
		{/if}
	</div>
</div>
