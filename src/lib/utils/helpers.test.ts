import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	safeClone,
	pathToKey,
	getNestedValue,
	setNestedValue,
	deleteNestedValue,
	flattenObject,
	flattenObjectKeys,
	parseValue,
	downloadFile,
	isComplex,
	validateJson,
	adjustTextareaHeight,
	sortByKey,
	debounce,
	escapeRegex,
	getFileExtension,
	removeFileExtension
} from './helpers';

describe('safeClone', () => {
	it('should clone primitive values', () => {
		expect(safeClone(42)).toBe(42);
		expect(safeClone('test')).toBe('test');
		expect(safeClone(true)).toBe(true);
		expect(safeClone(null)).toBe(null);
	});

	it('should deep clone objects', () => {
		const obj = { a: 1, b: { c: 2 } };
		const cloned = safeClone(obj);
		expect(cloned).toEqual(obj);
		expect(cloned).not.toBe(obj);
		expect(cloned.b).not.toBe(obj.b);
	});

	it('should clone arrays', () => {
		const arr = [1, 2, [3, 4]];
		const cloned = safeClone(arr);
		expect(cloned).toEqual(arr);
		expect(cloned).not.toBe(arr);
	});

	it('should handle circular references with JSON fallback', () => {
		const obj: any = { a: 1 };
		obj.self = obj;
		expect(() => safeClone(obj)).not.toThrow();
	});
});

describe('pathToKey', () => {
	it('should convert empty path to root', () => {
		expect(pathToKey([])).toBe('root');
	});

	it('should convert path to dot notation', () => {
		expect(pathToKey(['users', 0, 'name'])).toBe('users.0.name');
	});

	it('should handle single element paths', () => {
		expect(pathToKey(['data'])).toBe('data');
	});

	it('should convert numbers to strings', () => {
		expect(pathToKey([0, 1, 2])).toBe('0.1.2');
	});
});

describe('getNestedValue', () => {
	const testObj = {
		user: {
			name: 'John',
			address: {
				city: 'NYC'
			}
		},
		items: [1, 2, 3]
	};

	it('should get nested values with string path', () => {
		expect(getNestedValue(testObj, 'user.name')).toBe('John');
		expect(getNestedValue(testObj, 'user.address.city')).toBe('NYC');
	});

	it('should get nested values with array path', () => {
		expect(getNestedValue(testObj, ['user', 'name'])).toBe('John');
		expect(getNestedValue(testObj, ['items', 0])).toBe(1);
	});

	it('should return undefined for non-existent paths', () => {
		expect(getNestedValue(testObj, 'nonexistent')).toBeUndefined();
		expect(getNestedValue(testObj, 'user.nonexistent')).toBeUndefined();
	});

	it('should handle null and undefined objects', () => {
		expect(getNestedValue(null, 'test')).toBeUndefined();
		expect(getNestedValue(undefined, 'test')).toBeUndefined();
	});

	it('should handle empty paths', () => {
		expect(getNestedValue(testObj, [])).toBe(testObj);
		expect(getNestedValue(testObj, '')).toBe(testObj);
	});
});

describe('setNestedValue', () => {
	it('should set nested values in objects', () => {
		const obj: any = { a: {} };
		setNestedValue(obj, ['a', 'b'], 42);
		expect(obj.a.b).toBe(42);
	});

	it('should create intermediate objects', () => {
		const obj: any = {};
		setNestedValue(obj, ['a', 'b', 'c'], 'value');
		expect(obj.a.b.c).toBe('value');
	});

	it('should create intermediate arrays when key is number', () => {
		const obj: any = {};
		setNestedValue(obj, ['items', 0], 'first');
		expect(Array.isArray(obj.items)).toBe(true);
		expect(obj.items[0]).toBe('first');
	});

	it('should handle empty paths gracefully', () => {
		const obj = { a: 1 };
		setNestedValue(obj, [], 'value');
		expect(obj).toEqual({ a: 1 });
	});

	it('should overwrite existing values', () => {
		const obj: any = { a: { b: 'old' } };
		setNestedValue(obj, ['a', 'b'], 'new');
		expect(obj.a.b).toBe('new');
	});
});

describe('deleteNestedValue', () => {
	it('should delete nested object properties', () => {
		const obj: any = { a: { b: { c: 1 } } };
		deleteNestedValue(obj, ['a', 'b', 'c']);
		expect(obj.a.b.c).toBeUndefined();
	});

	it('should splice array elements', () => {
		const obj: any = { items: [1, 2, 3] };
		deleteNestedValue(obj, ['items', 1]);
		expect(obj.items).toEqual([1, 3]);
	});

	it('should handle empty paths gracefully', () => {
		const obj = { a: 1 };
		deleteNestedValue(obj, []);
		expect(obj).toEqual({ a: 1 });
	});

	it('should handle non-existent paths', () => {
		const obj: any = { a: {} };
		expect(() => deleteNestedValue(obj, ['a', 'b', 'c'])).not.toThrow();
	});
});

describe('flattenObject', () => {
	it('should flatten nested objects', () => {
		const obj = {
			user: {
				name: 'John',
				age: 30
			}
		};
		expect(flattenObject(obj)).toEqual({
			'user.name': 'John',
			'user.age': 30
		});
	});

	it('should handle arrays', () => {
		const obj = { items: [1, 2, 3] };
		expect(flattenObject(obj)).toEqual({
			items: '[3 items]'
		});
	});

	it('should handle nested arrays and objects', () => {
		const obj = {
			data: {
				list: [1, 2],
				value: 'test'
			}
		};
		expect(flattenObject(obj)).toEqual({
			'data.list': '[2 items]',
			'data.value': 'test'
		});
	});

	it('should handle empty objects', () => {
		expect(flattenObject({})).toEqual({});
	});

	it('should use prefix when provided', () => {
		const obj = { a: 1 };
		expect(flattenObject(obj, 'prefix')).toEqual({
			'prefix.a': 1
		});
	});
});

describe('flattenObjectKeys', () => {
	it('should return all keys in dot notation', () => {
		const obj = {
			user: {
				name: 'John',
				address: {
					city: 'NYC'
				}
			}
		};
		expect(flattenObjectKeys(obj)).toEqual(['user.name', 'user.address.city']);
	});

	it('should handle arrays as single keys', () => {
		const obj = {
			items: [1, 2],
			value: 'test'
		};
		expect(flattenObjectKeys(obj)).toEqual(['items', 'value']);
	});

	it('should handle empty objects', () => {
		expect(flattenObjectKeys({})).toEqual([]);
	});
});

describe('parseValue', () => {
	it('should parse valid JSON', () => {
		expect(parseValue('123')).toBe(123);
		expect(parseValue('true')).toBe(true);
		expect(parseValue('null')).toBe(null);
		expect(parseValue('{"a":1}')).toEqual({ a: 1 });
		expect(parseValue('[1,2,3]')).toEqual([1, 2, 3]);
	});

	it('should return string for invalid JSON', () => {
		expect(parseValue('not json')).toBe('not json');
		expect(parseValue('hello world')).toBe('hello world');
	});

	it('should handle empty strings', () => {
		expect(parseValue('')).toBe('');
	});
});

describe('downloadFile', () => {
	let createElementSpy: any;
	let appendChildSpy: any;
	let removeChildSpy: any;

	beforeEach(() => {
		const mockElement = {
			href: '',
			download: '',
			click: vi.fn()
		};
		createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockElement as any);
		appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockElement as any);
		removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockElement as any);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should download string content', () => {
		downloadFile('test content', 'test.txt', 'text/plain');
		expect(createElementSpy).toHaveBeenCalledWith('a');
		expect(appendChildSpy).toHaveBeenCalled();
		expect(removeChildSpy).toHaveBeenCalled();
	});

	it('should download blob content', () => {
		const blob = new Blob(['test'], { type: 'text/plain' });
		downloadFile(blob, 'test.txt', 'text/plain');
		expect(createElementSpy).toHaveBeenCalledWith('a');
	});
});

describe('isComplex', () => {
	it('should identify complex values', () => {
		expect(isComplex('[3 items]')).toBe(true);
		expect(isComplex('[5 props]')).toBe(true);
	});

	it('should return false for simple values', () => {
		expect(isComplex('simple text')).toBe(false);
		expect(isComplex('123')).toBe(false);
		expect(isComplex('[not complex')).toBe(false);
	});

	it('should handle non-string values', () => {
		expect(isComplex(123 as any)).toBe(false);
		expect(isComplex(null as any)).toBe(false);
		expect(isComplex({} as any)).toBe(false);
	});
});

describe('validateJson', () => {
	it('should validate valid JSON', () => {
		expect(validateJson({ a: 1 })).toEqual({ valid: true });
		expect(validateJson([1, 2, 3])).toEqual({ valid: true });
		expect(validateJson('string')).toEqual({ valid: true });
	});

	it('should detect invalid JSON', () => {
		const circular: any = {};
		circular.self = circular;
		const result = validateJson(circular);
		expect(result.valid).toBe(false);
		if (result.valid === false) {
			expect(result.error).toBeDefined();
		}
	});

	it('should handle null and undefined', () => {
		expect(validateJson(null)).toEqual({ valid: true });
	});
});

describe('adjustTextareaHeight', () => {
	it('should adjust textarea height based on content', () => {
		const textarea = document.createElement('textarea');
		Object.defineProperty(textarea, 'scrollHeight', {
			value: 100,
			writable: true
		});
		adjustTextareaHeight(textarea, 200);
		expect(textarea.style.height).toBe('100px');
	});

	it('should respect max height', () => {
		const textarea = document.createElement('textarea');
		Object.defineProperty(textarea, 'scrollHeight', {
			value: 300,
			writable: true
		});
		adjustTextareaHeight(textarea, 200);
		expect(textarea.style.height).toBe('200px');
	});
});

describe('sortByKey', () => {
	it('should sort by string key ascending', () => {
		const items = [
			{ name: 'Charlie', age: 30 },
			{ name: 'Alice', age: 25 },
			{ name: 'Bob', age: 35 }
		];
		const sorted = sortByKey(items, 'name', 'asc');
		expect(sorted[0].name).toBe('Alice');
		expect(sorted[2].name).toBe('Charlie');
	});

	it('should sort by string key descending', () => {
		const items = [
			{ name: 'Alice', age: 25 },
			{ name: 'Bob', age: 35 }
		];
		const sorted = sortByKey(items, 'name', 'desc');
		expect(sorted[0].name).toBe('Bob');
	});

	it('should sort by numeric key', () => {
		const items = [
			{ name: 'Alice', age: 35 },
			{ name: 'Bob', age: 25 }
		];
		const sorted = sortByKey(items, 'age', 'asc');
		expect(sorted[0].age).toBe(25);
	});

	it('should handle array index notation', () => {
		const items = [
			{ key: '[2]', value: 'c' },
			{ key: '[0]', value: 'a' },
			{ key: '[1]', value: 'b' }
		];
		const sorted = sortByKey(items, 'key', 'asc');
		expect(sorted[0].key).toBe('[0]');
		expect(sorted[2].key).toBe('[2]');
	});

	it('should handle missing values', () => {
		const items = [{ name: 'Alice' }, { name: 'Bob', age: 25 }, { name: 'Charlie' }];
		const sorted = sortByKey(items, 'age', 'asc');
		expect(sorted[0].name).toBe('Bob');
	});

	it('should not mutate original array', () => {
		const items = [{ name: 'Bob' }, { name: 'Alice' }];
		const sorted = sortByKey(items, 'name', 'asc');
		expect(items[0].name).toBe('Bob');
		expect(sorted).not.toBe(items);
	});
});

describe('debounce', () => {
	it('should debounce function calls', async () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced();
		debounced();
		debounced();

		expect(fn).not.toHaveBeenCalled();

		await new Promise((resolve) => setTimeout(resolve, 150));
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should pass arguments to debounced function', async () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 50);

		debounced('arg1', 'arg2');

		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
	});
});

describe('escapeRegex', () => {
	it('should escape special regex characters', () => {
		expect(escapeRegex('.')).toBe('\\.');
		expect(escapeRegex('*')).toBe('\\*');
		expect(escapeRegex('+')).toBe('\\+');
		expect(escapeRegex('?')).toBe('\\?');
		expect(escapeRegex('^${}()|[]\\/')).toBe('\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\\\/');
	});

	it('should handle normal strings', () => {
		expect(escapeRegex('hello')).toBe('hello');
	});
});

describe('getFileExtension', () => {
	it('should extract file extensions', () => {
		expect(getFileExtension('file.json')).toBe('.json');
		expect(getFileExtension('document.pdf')).toBe('.pdf');
		expect(getFileExtension('archive.tar.gz')).toBe('.gz');
	});

	it('should return lowercase extensions', () => {
		expect(getFileExtension('file.JSON')).toBe('.json');
		expect(getFileExtension('file.TXT')).toBe('.txt');
	});

	it('should handle files without extensions', () => {
		expect(getFileExtension('README')).toBe('');
	});
});

describe('removeFileExtension', () => {
	it('should remove file extensions', () => {
		expect(removeFileExtension('file.json')).toBe('file');
		expect(removeFileExtension('document.pdf')).toBe('document');
	});

	it('should handle multiple dots', () => {
		expect(removeFileExtension('archive.tar.gz')).toBe('archive.tar');
	});

	it('should handle files without extensions', () => {
		expect(removeFileExtension('README')).toBe('README');
	});

	it('should handle dot at start', () => {
		expect(removeFileExtension('.gitignore')).toBe('');
	});
});
