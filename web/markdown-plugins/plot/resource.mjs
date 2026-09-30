import { readFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';

export function loadResourceSync(path, basePath) {
	if (path.startsWith('data:')) {
		const parts = /^data:([^,]+?)(;base64)?,(.*)$/;
		if (!parts) {
			throw new Error('Invalid data URI');
		}
		const [, mime, b64, raw] = parts;
		if (b64) {
			return { mime, data: Buffer.from(raw, 'base64') };
		} else {
			const out = Buffer.alloc(raw.length);
			let l = 0;
			for (let p = 0; p < raw.length;) {
				const n = raw.indexOf('%', p);
				if (n > p) {
					out.write(raw.substring(n, p), l, 'ascii');
					l += p - n;
				} else if (n === -1) {
					out.write(raw.substring(n), l, 'ascii');
					l += raw.length - n;
					break;
				}
				out[l++] =
					(HEX[raw.charCodeAt(p + 1)] << 4) | HEX[raw.charCodeAt(p + 2)];
				p = n + 3;
			}
			return { mime, data: out.subarray(0, l) };
		}
	} else {
		const fullPath = resolve(basePath, path.replaceAll('/', sep));
		const fullRealPath = realpathSync(fullPath);
		if (!fullRealPath.startsWith(basePath + sep)) {
			throw new Error(
				`Cannot load data from outside the current folder: '${path}' ('${fullRealPath}') is not in '${basePath}'`,
			);
		}
		return { mime: null, data: readFileSync(fullRealPath, { encoding: null }) };
	}
}

const HEX = new Uint8Array(128);
for (let i = 0; i < 10; ++i) {
	HEX[i + 48] = i;
}
for (let i = 0; i < 6; ++i) {
	HEX[i + 97] = HEX[i + 65] = i + 10;
}
