<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import type { JSONValue } from '$lib/types.ts';

	let {
		update,
		data,
		indentSize = 2
	}: {
		update: (data: JSONValue) => void;
		data: JSONValue;
		indentSize?: number;
	} = $props();

	let textContent: string = $state('');
	let lineNumbers: number[] = $state([]);
	let errorLine: number | null = $state(null);
	let errorMessage: string = $state('');
	let textarea: HTMLTextAreaElement | null = null;
	let lastValidData: JSONValue = data;

	const updateTextContent = (): void => {
		try {
			textContent = JSON.stringify(data, null, indentSize);
			errorLine = null;
			errorMessage = '';
			lastValidData = data;
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
		updateLineNumbers();

		try {
			const parsed = JSON.parse(textContent);
			update(parsed);
			lastValidData = parsed;
			errorLine = null;
			errorMessage = '';
		} catch (e: any) {
			const msg = e?.message ?? String(e);
			errorMessage = msg;

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
	};

	const formatJson = async (): Promise<void> => {
		try {
			const parsed = JSON.parse(textContent);
			textContent = JSON.stringify(parsed, null, indentSize);
			updateLineNumbers();
			update(parsed);
			errorLine = null;
			errorMessage = '';
			await tick();
			if (textarea) textarea.focus();
		} catch (e: any) {
			errorMessage = e?.message ?? String(e);
		}
	};

	const handleKeyDown = (e: KeyboardEvent): void => {
		if (!textarea) return;

		if (e.key === 'Tab') {
			e.preventDefault();
			const start = textarea.selectionStart ?? 0;
			const end = textarea.selectionEnd ?? 0;
			const newValue = textContent.substring(0, start) + '  ' + textContent.substring(end);
			textContent = newValue;
			handleInput();
			requestAnimationFrame(() => {
				if (!textarea) return;
				textarea.selectionStart = textarea.selectionEnd = start + 2;
			});
			return;
		}

		if (e.key === 'Enter') {
			e.preventDefault();
			const start = textarea.selectionStart ?? 0;
			const end = textarea.selectionEnd ?? 0;
			const beforeCursor = textContent.substring(0, start);
			const afterCursor = textContent.substring(end);

			const currentLine = beforeCursor.split('\n').pop() || '';
			const leadingSpaces = currentLine.match(/^\s*/)?.[0] || '';

			let newValue = beforeCursor + '\n' + leadingSpaces + afterCursor;
			textContent = newValue;
			handleInput();

			requestAnimationFrame(() => {
				if (!textarea) return;
				const newPos = start + 1 + leadingSpaces.length;
				textarea.selectionStart = textarea.selectionEnd = newPos;
			});
			return;
		}

		if (e.key === '{' || e.key === '[' || e.key === '"') {
			e.preventDefault();
			const start = textarea.selectionStart ?? 0;
			const end = textarea.selectionEnd ?? 0;
			const closers: Record<string, string> = { '{': '}', '[': ']', '"': '"' };
			const closer = closers[e.key];
			const newValue = textContent.substring(0, start) + e.key + closer + textContent.substring(end);
			textContent = newValue;
			handleInput();
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
		if (data !== lastValidData) {
			updateTextContent();
		}
	});

	$effect(() => {
		if (indentSize) {
			updateTextContent();
		}
	});
</script>

<div class="flex h-full">
	<div class="min-w-12 overflow-auto border-r bg-gray-50 px-3 py-4 font-mono text-xs text-gray-500 select-none">
		{#each lineNumbers as lineNum}
			<div class="leading-6" class:text-red-600={errorLine === lineNum} class:font-bold={errorLine === lineNum}>
				{lineNum}
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
				<div class="flex items-start space-x-2">
					<svg class="mt-0.5 h-5 w-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<div class="flex-1">
						<div class="text-sm font-medium text-red-800">JSON syntax error on line {errorLine}</div>
						<div class="mt-1 text-xs text-red-700">{errorMessage}</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
