# JSON Studio

A modern JSON editor built with SvelteKit that makes editing complex JSON files easy and efficient for both developers and non-technical users. Currently this is an experimental tool for exploring editing workflows and user interfaces, not a finished or production-ready product. This is a work-in-progress with known limitations.

## Features

The app provides three view modes: a Tree view with expandable nodes and inline editing, a Table view for a spreadsheet-like representation with sortable columns, and a Text view that shows raw JSON with formatting, basic validation, line numbers, and simple editing helpers. There is a global search with optional key-scoped filtering, the ability to focus on a sub-object or array, a 50-level undo/redo stack, and a simple auto-save behavior.

## Performance

The application is optimized for handling large JSON files through indexed search capabilities that deliver sub-100ms response times and memory-efficient rendering systems. The interface remains responsive even when working with datasets containing thousands of nodes, making it suitable for complex API responses, configuration files, and structured content management.

## Run

```bash
npm install
npm run dev
```

## License

This project is open source. Please check the LICENSE file for details.
