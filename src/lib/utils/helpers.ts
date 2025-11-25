import type { JSONValue, JSONPath } from '$lib/types';
import { EDITOR_CONSTANTS } from './constants';

export function safeClone<T>(value: T): T {
	try {
		return structuredClone(value) as T;
	} catch {
		return JSON.parse(JSON.stringify(value)) as T;
	}
}

export function pathToKey(path: JSONPath): string {
	return path.length === 0 ? 'root' : path.map(String).join('.');
}

export function getNestedValue(obj: any, path: string | JSONPath): any {
	const keys = Array.isArray(path) ? path : path.split('.');

	if (keys.length === 0 || (keys.length === 1 && keys[0] === '')) {
		return obj;
	}

	let current = obj;

	for (const key of keys) {
		if (current && typeof current === 'object') {
			current = current[key];
		} else {
			return undefined;
		}
	}

	return current;
}

export function setNestedValue(obj: any, path: JSONPath, value: any): void {
	if (path.length === 0) return;

	let current = obj;
	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i];
		if (!current[key] || typeof current[key] !== 'object') {
			const nextKey = path[i + 1];
			current[key] = typeof nextKey === 'number' ? [] : {};
		}
		current = current[key];
	}

	const lastKey = path[path.length - 1];
	current[lastKey] = value;
}

export function deleteNestedValue(obj: any, path: JSONPath): void {
	if (path.length === 0) return;

	let current = obj;
	for (let i = 0; i < path.length - 1; i++) {
		current = current[path[i]];
		if (!current || typeof current !== 'object') {
			return;
		}
	}

	const lastKey = path[path.length - 1];
	if (Array.isArray(current) && typeof lastKey === 'number') {
		current.splice(lastKey, 1);
	} else {
		delete current[lastKey];
	}
}

export function flattenObject(obj: any, prefix = ''): Record<string, any> {
	const flattened: Record<string, any> = {};

	for (const [key, value] of Object.entries(obj)) {
		const newKey = prefix ? `${prefix}.${key}` : key;

		if (value && typeof value === 'object' && !Array.isArray(value)) {
			Object.assign(flattened, flattenObject(value, newKey));
		} else if (Array.isArray(value)) {
			flattened[newKey] = `[${value.length} items]`;
		} else {
			flattened[newKey] = value;
		}
	}

	return flattened;
}

export function flattenObjectKeys(obj: any, prefix = ''): string[] {
	const keys: string[] = [];

	for (const [key, value] of Object.entries(obj)) {
		const newKey = prefix ? `${prefix}.${key}` : key;

		if (value && typeof value === 'object' && !Array.isArray(value)) {
			keys.push(...flattenObjectKeys(value, newKey));
		} else {
			keys.push(newKey);
		}
	}

	return keys;
}

export function parseValue(value: string): any {
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

export function downloadFile(content: string | Blob, filename: string, type: string): void {
	const blob = content instanceof Blob ? content : new Blob([content], { type });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export function isComplex(value: any): boolean {
	return typeof value === 'string' && value.startsWith('[') && (value.includes('items]') || value.includes('props]'));
}

export function validateJson(data: JSONValue): { valid: true } | { valid: false; error: string } {
	try {
		JSON.parse(JSON.stringify(data));
		return { valid: true };
	} catch (e: any) {
		return { valid: false, error: e?.message ?? String(e) };
	}
}

export function adjustTextareaHeight(
	textarea: HTMLTextAreaElement,
	maxHeight: number = EDITOR_CONSTANTS.MAX_EDIT_HEIGHT
): void {
	textarea.style.height = 'auto';
	const newHeight = Math.min(textarea.scrollHeight, maxHeight);
	textarea.style.height = newHeight + 'px';
}

export function sortByKey<T extends Record<string, any>>(items: T[], key: string, direction: 'asc' | 'desc'): T[] {
	return [...items].sort((a, b) => {
		const aVal = a[key] ?? '';
		const bVal = b[key] ?? '';

		if (typeof aVal === 'number' && typeof bVal === 'number') {
			return direction === 'asc' ? aVal - bVal : bVal - aVal;
		}

		const aStr = String(aVal);
		const bStr = String(bVal);

		const aNum = aStr.match(/^\[(\d+)\]$/);
		const bNum = bStr.match(/^\[(\d+)\]$/);

		if (aNum && bNum) {
			const aIndex = parseInt(aNum[1], 10);
			const bIndex = parseInt(bNum[1], 10);
			return direction === 'asc' ? aIndex - bIndex : bIndex - aIndex;
		}

		if (aVal === '' && bVal !== '') return 1;
		if (aVal !== '' && bVal === '') return -1;

		const compare = aStr.localeCompare(bStr);
		return direction === 'asc' ? compare : -compare;
	});
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>;

	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}

export function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

export function getFileExtension(filename: string): string {
	const lastDotIndex = filename.lastIndexOf('.');
	if (lastDotIndex <= 0) return '';
	return filename.slice(lastDotIndex).toLowerCase();
}

export function removeFileExtension(filename: string): string {
	const lastDotIndex = filename.lastIndexOf('.');
	if (lastDotIndex === -1) return filename;
	if (lastDotIndex === 0) return '';
	return filename.slice(0, lastDotIndex);
}
