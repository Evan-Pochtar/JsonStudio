import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

if (typeof global.structuredClone === 'undefined') {
	global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

global.IntersectionObserver = class IntersectionObserver {
	constructor() {}
	disconnect() {}
	observe() {}
	takeRecords() {
		return [];
	}
	unobserve() {}
} as any;

global.ResizeObserver = class ResizeObserver {
	constructor() {}
	disconnect() {}
	observe() {}
	unobserve() {}
} as any;

Object.defineProperty(window, 'FileReader', {
	writable: true,
	value: class {
		result: any = null;
		onload: any = null;
		onerror: any = null;
		readAsText(blob: Blob) {
			blob.text().then((text) => {
				this.result = text;
				if (this.onload) this.onload({ target: { result: text } });
			});
		}
		readAsDataURL(blob: Blob) {
			blob.text().then((text) => {
				this.result = `data:text/plain;base64,${btoa(text)}`;
				if (this.onload) this.onload({ target: { result: this.result } });
			});
		}
	}
});
