<script lang="ts">
	import type { JSONValue } from '$lib/types.ts';

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

	const downloadFile = (content: string | Blob, filename: string, type: string): void => {
		const blob = content instanceof Blob ? content : new Blob([content], { type });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
		const flattened: Record<string, any> = {};
		for (const [key, value] of Object.entries(obj)) {
			const newKey = prefix ? `${prefix}.${key}` : key;
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				Object.assign(flattened, flattenObject(value, newKey));
			} else {
				flattened[newKey] = value;
			}
		}
		return flattened;
	};

	const convertToCSV = (data: JSONValue): string => {
		if (Array.isArray(data)) {
			if (data.length === 0) return '';
			const flattened = data.map((item) =>
				typeof item === 'object' && item !== null ? flattenObject(item) : { value: item }
			);
			const headers = Array.from(new Set(flattened.flatMap((row) => Object.keys(row))));
			const csvRows = [
				headers.join(','),
				...flattened.map((row) =>
					headers
						.map((header) => {
							const value = row[header];
							const stringValue =
								value === null || value === undefined
									? ''
									: typeof value === 'string'
										? value.replace(/"/g, '""')
										: String(value);
							return `"${stringValue}"`;
						})
						.join(',')
				)
			];
			return csvRows.join('\n');
		} else if (typeof data === 'object' && data !== null) {
			const flattened = flattenObject(data);
			const headers = Object.keys(flattened);
			const values = headers.map((h) => {
				const value = flattened[h];
				const stringValue =
					value === null || value === undefined
						? ''
						: typeof value === 'string'
							? value.replace(/"/g, '""')
							: String(value);
				return `"${stringValue}"`;
			});
			return `${headers.join(',')}\n${values.join(',')}`;
		}
		return '';
	};

	const convertToXLSX = async (data: JSONValue): Promise<Blob> => {
		const rowsSrc: Record<string, any>[] = Array.isArray(data)
			? data.map((item) => (typeof item === 'object' && item !== null ? flattenObject(item) : { value: item }))
			: typeof data === 'object' && data !== null
				? [flattenObject(data)]
				: [{ value: data }];

		if (rowsSrc.length === 0) {
			return new Blob([new Uint8Array(0)], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			});
		}

		const complexKeys = new Set<string>();
		const normalizedRows: Record<string, string>[] = [];

		for (const row of rowsSrc) {
			const norm: Record<string, string> = {};
			for (const key of Object.keys(row)) {
				const v = row[key];
				if (v === null || v === undefined) {
					norm[key] = '';
					continue;
				}
				if (Array.isArray(v)) {
					if (v.every((el) => el === null || el === undefined || typeof el !== 'object')) {
						norm[key] = v.map((el) => (el === null || el === undefined ? '' : String(el))).join(', ');
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
			return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
		}

		const aoa = [headers];
		for (const r of normalizedRows) {
			const rowArr = headers.map((h) => {
				const cell = r[h] ?? '';
				const s = typeof cell === 'string' ? cell : String(cell);
				if (s.startsWith('=')) return `'${s}`;
				return s;
			});
			aoa.push(rowArr);
		}

		const XLSX = (await import('xlsx')).default || (await import('xlsx'));
		const sheet = XLSX.utils.aoa_to_sheet(aoa);
		const wb = { Sheets: { Sheet1: sheet }, SheetNames: ['Sheet1'] };
		const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
		return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
	};

	const handleExport = async (): Promise<void> => {
		const baseName = fileName.replace(/\.json$/, '');
		switch (exportFormat) {
			case 'json':
				downloadFile(JSON.stringify(data, null, 2), `${baseName}.json`, 'application/json');
				break;
			case 'csv':
				downloadFile(convertToCSV(data), `${baseName}.csv`, 'text/csv');
				break;
			case 'xlsx':
				try {
					const blob = await convertToXLSX(data);
					downloadFile(blob, `${baseName}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
				} catch {
					downloadFile(convertToCSV(data), `${baseName}.csv`, 'text/csv');
				}
				break;
		}
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
		<h2 class="mb-4 text-lg font-semibold text-gray-900">Export Data</h2>

		<div class="mb-6 space-y-3">
			<label class="flex items-center space-x-3">
				<input type="radio" bind:group={exportFormat} value="json" class="h-4 w-4 text-blue-600" />
				<span class="text-sm text-gray-700">JSON (.json)</span>
			</label>
			<label class="flex items-center space-x-3">
				<input type="radio" bind:group={exportFormat} value="csv" class="h-4 w-4 text-blue-600" />
				<span class="text-sm text-gray-700">CSV (.csv)</span>
			</label>
			<label class="flex items-center space-x-3">
				<input type="radio" bind:group={exportFormat} value="xlsx" class="h-4 w-4 text-blue-600" />
				<span class="text-sm text-gray-700">Excel (.xlsx)</span>
			</label>
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
				onclick={handleExport}
				class="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow-md"
				type="button"
			>
				Export
			</button>
		</div>
	</div>
</div>
