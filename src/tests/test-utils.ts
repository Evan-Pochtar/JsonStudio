import type { JSONValue } from '$lib/types';

export function createMockFile(content: string, filename: string, type: string = 'application/json'): File {
	const blob = new Blob([content], { type });
	return new File([blob], filename, { type });
}

export function createMockJSONFile(data: JSONValue, filename: string = 'test.json'): File {
	return createMockFile(JSON.stringify(data), filename, 'application/json');
}

export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitFor(
	condition: () => boolean | Promise<boolean>,
	options: { timeout?: number; interval?: number } = {}
): Promise<void> {
	const { timeout = 5000, interval = 50 } = options;
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return;
		}
		await wait(interval);
	}

	throw new Error('Condition not met within timeout');
}

export const mockData = {
	simpleObject: (): JSONValue => ({
		name: 'Test',
		value: 123,
		active: true
	}),

	nestedObject: (): JSONValue => ({
		user: {
			name: 'John Doe',
			email: 'john@example.com',
			profile: {
				age: 30,
				location: 'NYC'
			}
		}
	}),

	arrayOfObjects: (count: number = 3): JSONValue => ({
		items: Array.from({ length: count }, (_, i) => ({
			id: i + 1,
			name: `Item ${i + 1}`,
			value: Math.random() * 100
		}))
	}),

	largeDataset: (itemCount: number = 1000): JSONValue => ({
		items: Array.from({ length: itemCount }, (_, i) => ({
			id: i,
			name: `Item ${i}`,
			description: `Description for item ${i}`,
			value: Math.random() * 1000,
			tags: [`tag${i % 5}`, `tag${i % 7}`],
			metadata: {
				created: new Date().toISOString(),
				updated: new Date().toISOString()
			}
		}))
	}),

	deeplyNested: (depth: number = 10): JSONValue => {
		let current: any = { value: 'deepest' };
		for (let i = 0; i < depth; i++) {
			current = { level: i, child: current };
		}
		return current;
	},

	mixedTypes: (): JSONValue => ({
		string: 'text',
		number: 42,
		float: 3.14,
		boolean: true,
		null: null,
		array: [1, 2, 3],
		object: { nested: true },
		emptyArray: [],
		emptyObject: {}
	}),

	specialCharacters: (): JSONValue => ({
		unicode: '你好世界',
		emoji: '🎉🎊🎈',
		escaped: 'Line 1\nLine 2\tTabbed',
		quotes: 'He said "Hello"',
		backslash: 'C:\\path\\to\\file'
	})
};

export const assertions = {
	isValidJSON: (value: string): boolean => {
		try {
			JSON.parse(value);
			return true;
		} catch {
			return false;
		}
	},

	jsonEqual: (a: JSONValue, b: JSONValue): boolean => {
		return JSON.stringify(a) === JSON.stringify(b);
	},

	hasKeys: (obj: any, keys: string[]): boolean => {
		return keys.every((key) => key in obj);
	},

	arrayContainsObject: (arr: any[], props: Record<string, any>): boolean => {
		return arr.some((item) => Object.entries(props).every(([key, value]) => item[key] === value));
	}
};

export const dom = {
	getComputedStyle: (element: HTMLElement, property: string): string => {
		return window.getComputedStyle(element).getPropertyValue(property);
	},

	isVisible: (element: HTMLElement): boolean => {
		return element.offsetParent !== null;
	},

	getCleanText: (element: HTMLElement): string => {
		return element.textContent?.trim().replace(/\s+/g, ' ') || '';
	},

	setFileInput: async (input: HTMLInputElement, file: File): Promise<void> => {
		const dataTransfer = new DataTransfer();
		dataTransfer.items.add(file);
		input.files = dataTransfer.files;
		input.dispatchEvent(new Event('change', { bubbles: true }));
	}
};

export const events = {
	click: (element: HTMLElement): void => {
		element.click();
	},

	doubleClick: (element: HTMLElement): void => {
		element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
	},

	keyPress: (element: HTMLElement, key: string, modifiers: KeyboardEventInit = {}): void => {
		element.dispatchEvent(
			new KeyboardEvent('keydown', {
				key,
				bubbles: true,
				...modifiers
			})
		);
	},

	typeText: async (element: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> => {
		element.focus();
		element.value = text;
		element.dispatchEvent(new Event('input', { bubbles: true }));
		await wait(10);
	},

	submitForm: (form: HTMLFormElement): void => {
		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
	}
};

export const cleanup = {
	clearLocalStorage: (): void => {
		localStorage.clear();
	},

	clearSessionStorage: (): void => {
		sessionStorage.clear();
	},

	resetBody: (): void => {
		document.body.innerHTML = '';
	},

	clearWindowListeners: (): void => {
		const newWindow = window.constructor.prototype;
		Object.keys(newWindow).forEach((key) => {
			if (key.startsWith('on')) {
				(window as any)[key] = null;
			}
		});
	}
};

export const performance = {
	measure: async <T>(fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> => {
		const start = Date.now();
		const result = await fn();
		const duration = Date.now() - start;
		return { result, duration };
	},

	benchmark: async (fn: () => any | Promise<any>, iterations: number = 100): Promise<number> => {
		const times: number[] = [];

		for (let i = 0; i < iterations; i++) {
			const { duration } = await performance.measure(fn);
			times.push(duration);
		}

		return times.reduce((a, b) => a + b, 0) / times.length;
	}
};

export const validation = {
	isEmail: (email: string): boolean => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	},

	isURL: (url: string): boolean => {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	},

	isJSONString: (str: string): boolean => {
		try {
			JSON.parse(str);
			return true;
		} catch {
			return false;
		}
	}
};

export class TestDataBuilder {
	private data: any = {};

	with(key: string, value: any): this {
		this.data[key] = value;
		return this;
	}

	withNested(path: string, value: any): this {
		const keys = path.split('.');
		let current = this.data;

		for (let i = 0; i < keys.length - 1; i++) {
			const key = keys[i];
			if (!current[key]) {
				current[key] = {};
			}
			current = current[key];
		}

		current[keys[keys.length - 1]] = value;
		return this;
	}

	build(): JSONValue {
		return JSON.parse(JSON.stringify(this.data));
	}
}

export const errors = {
	expectToThrow: async (fn: () => any | Promise<any>): Promise<Error> => {
		try {
			await fn();
			throw new Error('Expected function to throw');
		} catch (error) {
			return error as Error;
		}
	},

	expectToThrowWithMessage: async (fn: () => any | Promise<any>, message: string | RegExp): Promise<void> => {
		const error = await errors.expectToThrow(fn);

		if (typeof message === 'string') {
			if (!error.message.includes(message)) {
				throw new Error(`Expected error message to include "${message}", got "${error.message}"`);
			}
		} else {
			if (!message.test(error.message)) {
				throw new Error(`Expected error message to match ${message}, got "${error.message}"`);
			}
		}
	}
};
