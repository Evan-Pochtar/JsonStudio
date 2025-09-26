import { json } from '@sveltejs/kit';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST({ request }) {
	try {
		const { data, fileName } = await request.json();
		const filePath = join(process.cwd(), 'saved_files', fileName);
		await writeFile(filePath, JSON.stringify(data, null, 2));

		return json({ success: true, message: 'File saved successfully' });
	} catch (error) {
		console.error('Save error:', error);
		return json({ success: false, error: 'Failed to save file' }, { status: 500 });
	}
}
