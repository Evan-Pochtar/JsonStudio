<script lang="ts">
	import { onMount } from 'svelte';
	import type { JSONValue } from '$lib/types';
	import { downloadFile, flattenObject, removeFileExtension } from '$lib/utils/helpers';
	import { TAILWIND_CLASSES, FILE_TYPES } from '$lib/utils/constants';

	let {
		data,
		fileName,
		onClose
	}: {
		data: JSONValue;
		fileName: string;
		onClose: () => void;
	} = $props();

	let exportFormat: 'json' | 'csv' | 'xlsx' = $state('json');

	function convertToCSV(data: JSONValue): string {
		if (Array.isArray(data)) {
			if (data.length === 0) return '';

			const flattened = data.map((item) => (item && typeof item === 'object' ? flattenObject(item) : { value: item }));

			const headers = Array.from(new Set(flattened.flatMap((row) => Object.keys(row))));

			const csvRows = [
				headers.join(','),
				...flattened.map((row) =>
					headers
						.map((header) => {
							const value = row[header];
							const stringValue =
								value == null ? '' : typeof value === 'string' ? value.replace(/"/g, '""') : String(value);
							return `"${stringValue}"`;
						})
						.join(',')
				)
			];

			return csvRows.join('\n');
		}

		if (data && typeof data === 'object') {
			const flattened = flattenObject(data);
			const headers = Object.keys(flattened);
			const values = headers.map((h) => {
				const value = flattened[h];
				const stringValue = value == null ? '' : typeof value === 'string' ? value.replace(/"/g, '""') : String(value);
				return `"${stringValue}"`;
			});
			return `${headers.join(',')}\n${values.join(',')}`;
		}

		return '';
	}

	async function convertToXLSX(data: JSONValue): Promise<Blob> {
		const rowsSrc: Record<string, any>[] = Array.isArray(data)
			? data.map((item) => (item && typeof item === 'object' ? flattenObject(item) : { value: item }))
			: data && typeof data === 'object'
				? [flattenObject(data)]
				: [{ value: data }];
		if (rowsSrc.length === 0) {
			return new Blob([new Uint8Array(0)], { type: FILE_TYPES.xlsx.mime });
		}

		const complexKeys = new Set<string>();
		const normalizedRows: Record<string, string>[] = [];
		for (const row of rowsSrc) {
			const norm: Record<string, string> = {};
			for (const key of Object.keys(row)) {
				const v = row[key];
				if (v == null) {
					norm[key] = '';
					continue;
				}
				if (Array.isArray(v)) {
					if (v.every((el) => el == null || typeof el !== 'object')) {
						norm[key] = v.map((el) => (el == null ? '' : String(el))).join(', ');
					} else {
						complexKeys.add(key);
					}
					continue;
				}
				if (typeof v === 'object') {
					complexKeys.add(key);
					continue;
				}
				norm[key] = String(v);
			}
			normalizedRows.push(norm);
		}

		const allKeys = Array.from(new Set(normalizedRows.flatMap((r) => Object.keys(r))));
		const headers = allKeys.filter((k) => !complexKeys.has(k));
		if (headers.length === 0) {
			const aoa = [['empty'], ['']];
			const XLSX = (await import('xlsx')).default || (await import('xlsx'));
			const sheet = XLSX.utils.aoa_to_sheet(aoa);
			const wb = { Sheets: { Sheet1: sheet }, SheetNames: ['Sheet1'] };
			const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
			return new Blob([wbout], { type: FILE_TYPES.xlsx.mime });
		}

		const aoa = [headers];
		for (const r of normalizedRows) {
			const rowArr = headers.map((h) => {
				const cell = r[h] ?? '';
				const s = typeof cell === 'string' ? cell : String(cell);
				return s.startsWith('=') ? `'${s}` : s;
			});
			aoa.push(rowArr);
		}

		const XLSX = (await import('xlsx')).default || (await import('xlsx'));
		const sheet = XLSX.utils.aoa_to_sheet(aoa);
		const wb = { Sheets: { Sheet1: sheet }, SheetNames: ['Sheet1'] };
		const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
		return new Blob([wbout], { type: FILE_TYPES.xlsx.mime });
	}

	async function handleExport(): Promise<void> {
		const baseName = removeFileExtension(fileName);
		switch (exportFormat) {
			case 'json':
				downloadFile(JSON.stringify(data), `${baseName}${FILE_TYPES.json.extension}`, FILE_TYPES.json.mime);
				break;
			case 'csv':
				downloadFile(convertToCSV(data), `${baseName}${FILE_TYPES.csv.extension}`, FILE_TYPES.csv.mime);
				break;
			case 'xlsx':
				try {
					const blob = await convertToXLSX(data);
					downloadFile(blob, `${baseName}${FILE_TYPES.xlsx.extension}`, FILE_TYPES.xlsx.mime);
				} catch {
					downloadFile(convertToCSV(data), `${baseName}${FILE_TYPES.csv.extension}`, FILE_TYPES.csv.mime);
				}
				break;
		}
		onClose();
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
		<h2 class="mb-4 text-lg font-semibold text-gray-900">Export Data</h2>

		<div class="mb-6 space-y-3">
			<label class="flex items-center space-x-3">
				<input type="radio" bind:group={exportFormat} value="json" class="h-4 w-4 text-red-600" />
				<span class="text-sm text-gray-700">JSON (.json)</span>
			</label>
			<label class="flex items-center space-x-3">
				<input type="radio" bind:group={exportFormat} value="csv" class="h-4 w-4 text-red-600" />
				<span class="text-sm text-gray-700">CSV (.csv)</span>
			</label>
			<label class="flex items-center space-x-3">
				<input type="radio" bind:group={exportFormat} value="xlsx" class="h-4 w-4 text-red-600" />
				<span class="text-sm text-gray-700">Excel (.xlsx)</span>
			</label>
		</div>

		<div class="flex justify-end space-x-3">
			<button onclick={onClose} class={TAILWIND_CLASSES.buttons.secondary} type="button"> Cancel </button>
			<button onclick={handleExport} class={TAILWIND_CLASSES.buttons.success} type="button"> Export </button>
		</div>
	</div>
</div>
