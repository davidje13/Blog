import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_DIR = dirname(fileURLToPath(import.meta.url));
const VALID_SLUG = /^[a-z0-9\-+]+$/;

export async function discoverAllPaths() {
	const allPaths = [
		{ path: ['index.html'], type: 'page' },
		{ path: ['robots.txt'], type: 'meta' },
		{ path: ['feed.rss'], type: 'meta' },
		{ path: ['sitemap.xml'], type: 'meta' },
	];

	for (const item of await readdir(join(SOURCE_DIR, 'posts'), {
		withFileTypes: true,
	})) {
		if (!item.isDirectory()) {
			console.warn(`unexpected file: ${item.name}`);
		} else if (!VALID_SLUG.test(item.name) || item.name === 'tagged') {
			console.warn(`invalid name: ${item.name}`);
		} else {
			allPaths.push({ path: [item.name, 'index.html'], type: 'post' });
		}
	}

	for (const item of await readdir(join(SOURCE_DIR, 'tags'), {
		withFileTypes: true,
	})) {
		if (!item.isDirectory()) {
			console.warn(`unexpected file: ${item.name}`);
		} else if (!VALID_SLUG.test(item.name)) {
			console.warn(`invalid name: ${item.name}`);
		} else {
			allPaths.push({ path: ['tagged', item.name, 'index.html'], type: 'tag' });
		}
	}
	return allPaths;
}
