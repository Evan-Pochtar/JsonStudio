export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export interface JSONObject {
	[key: string]: JSONValue;
}
export type JSONArray = JSONValue[];
export type JSONPath = Array<string | number>;

export type SearchMatch = {
	path: JSONPath;
	key: string;
	value: string | number;
	type: string;
};

export type TableRow = {
	key: string;
	path: JSONPath;
	value?: JSONValue;
	[k: string]: any;
};

export type FlatNode = {
	key: string | null;
	path: JSONPath;
	value: JSONValue;
	isObject: boolean;
	isArray: boolean;
	depth: number;
	hasChildren: boolean;
	childCount: number;
};

export type UndoEntry = { data: JSONValue; path: Array<string | number> };

export type ContextMenuPosition = { x: number; y: number };
export type ContextMenuData = {
	column?: string;
	row?: any;
	path?: JSONPath;
};
