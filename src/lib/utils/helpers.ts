export function safeClone<T>(value: T): T {
	try {
		return structuredClone(value) as T;
	} catch {
		return JSON.parse(JSON.stringify(value)) as T;
	}
}
