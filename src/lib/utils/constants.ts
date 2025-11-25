import type { JSONValue } from '$lib/types';

export const EDITOR_CONSTANTS = Object.freeze({
	DEFAULT_COL_WIDTH: 200,
	MIN_COL_WIDTH: 60,
	MAX_COL_WIDTH: 1200,
	MAX_CELL_HEIGHT: 400,
	MAX_EDIT_HEIGHT: 400,
	MAX_UNDO_STACK: 50,
	MAX_SEARCH_RESULTS: 100,
	DEFAULT_INDENT_SIZE: 2,
	MIN_INDENT_SIZE: 1,
	MAX_INDENT_SIZE: 8
} as const);

export const TAILWIND_CLASSES = Object.freeze({
	buttons: Object.freeze({
		primary:
			'inline-flex items-center justify-center rounded-lg border border-transparent bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-red-700 hover:to-red-800 hover:shadow-md focus:ring-2 focus:ring-red-500/20 focus:ring-offset-2 focus:outline-none',
		secondary:
			'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow focus:ring-2 focus:ring-gray-500/20 focus:ring-offset-2 focus:outline-none',
		danger:
			'rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-red-700 hover:to-red-800 hover:shadow-md focus:ring-2 focus:ring-red-500/20 focus:ring-offset-2 focus:outline-none',
		success:
			'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-red-700 hover:shadow-md focus:ring-2 focus:ring-red-500/20 focus:ring-offset-2 focus:outline-none',
		small: 'rounded-md px-2 py-1 text-xs font-medium transition-all duration-200'
	}),
	inputs: Object.freeze({
		text: 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none',
		textarea:
			'w-full resize-none overflow-auto rounded-md border border-red-500 bg-white px-2 py-1 transition-all duration-200 focus:ring-2 focus:ring-red-500/20 focus:outline-none'
	}),
	modals: Object.freeze({
		overlay: 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm',
		container:
			'animate-in fade-in zoom-in-95 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-gray-200 duration-200'
	}),
	animations: Object.freeze({
		fadeIn: 'animate-in fade-in slide-in-from-top-2 duration-200',
		fadeInSlow: 'animate-in fade-in slide-in-from-bottom-2 duration-300'
	})
});

export const FILE_TYPES = Object.freeze({
	json: Object.freeze({ mime: 'application/json', extension: '.json' }),
	csv: Object.freeze({ mime: 'text/csv', extension: '.csv' }),
	xlsx: Object.freeze({
		mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		extension: '.xlsx'
	})
} as const);

export const sampleData: JSONValue = {
	users: [
		{
			id: 1,
			name: 'David Smith',
			email: 'david@example.com',
			role: 'admin',
			active: true
		},
		{
			id: 2,
			name: 'Sarah Johnson',
			email: 'sarah@example.com',
			role: 'user',
			active: true
		},
		{
			id: 3,
			name: 'Mike Davis',
			email: 'mike@example.com',
			role: 'user',
			active: false
		}
	],
	settings: {
		theme: 'dark',
		notifications: true,
		autoSave: false
	},
	metadata: {
		version: '1.0.0',
		created: '2024-01-01T00:00:00Z',
		lastModified: '2024-01-15T10:30:00Z'
	}
};
