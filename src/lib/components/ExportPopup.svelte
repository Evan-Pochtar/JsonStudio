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

	const convertToXLSX = (data: JSONValue): Blob => {
		let rows: any[] = [];
		if (Array.isArray(data)) {
			rows = data.map((item) => (typeof item === 'object' && item !== null ? flattenObject(item) : { value: item }));
		} else if (typeof data === 'object' && data !== null) {
			rows = [flattenObject(data)];
		}

		if (rows.length === 0) {
			rows = [{ empty: '' }];
		}

		const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
		const xmlRows = rows.map((row) => {
			const cells = headers.map((header) => {
				const value = row[header];
				const cellValue =
					value === null || value === undefined
						? ''
						: typeof value === 'string'
							? value.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] || c)
							: String(value);
				return `<Cell><Data ss:Type="String">${cellValue}</Data></Cell>`;
			});
			return `<Row>${cells.join('')}</Row>`;
		});

		const headerRow = `<Row>${headers.map((h) => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>`;
		const xml = `<?xml version="1.0"?>
								<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
								xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
								<Worksheet ss:Name="Sheet1">
								<Table>
								${headerRow}
								${xmlRows.join('\n')}
								</Table>
								</Worksheet>
								</Workbook>`;

		return new Blob([xml], { type: 'application/vnd.ms-excel' });
	};

	const handleExport = (): void => {
		const baseName = fileName.replace(/\.json$/, '');
		switch (exportFormat) {
			case 'json':
				downloadFile(JSON.stringify(data, null, 2), `${baseName}.json`, 'application/json');
				break;
			case 'csv':
				downloadFile(convertToCSV(data), `${baseName}.csv`, 'text/csv');
				break;
			case 'xlsx':
				downloadFile(convertToXLSX(data), `${baseName}.xlsx`, 'application/vnd.ms-excel');
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
