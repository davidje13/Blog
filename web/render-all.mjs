#!/usr/bin/env -S node --disable-proto=throw --disallow-code-generation-from-strings --force-node-api-uncaught-exceptions-policy --no-addons --disable-sigusr1
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage } from './render.mjs';
import { discoverAllPaths } from './discover.mjs';

const SOURCE_DIR = dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = join(SOURCE_DIR, '..', 'build');
const env = { host: process.env['HOST'] };

const allPaths = await discoverAllPaths();
for (const { path } of allPaths) {
	const content = await renderPage(env, path, allPaths);
	if (!content) {
		console.warn(`no content at ${path.join('/')}`);
		continue;
	}

	const fullPath = [BUILD_DIR, 'static', ...path];
	await mkdir(join(...fullPath.slice(0, fullPath.length - 1)), {
		recursive: true,
	});
	await writeFile(join(...fullPath), content, { encoding: 'utf-8' });
}
