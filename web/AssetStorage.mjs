import { createHash } from 'node:crypto';

export class AssetStorage {
	constructor(basePath) {
		this.basePath = basePath;
		this.assets = new Map();
	}

	add(dataURI) {
		const parts = /^data:([^,;]*)[^,]*?(;base64)?,(.*)$/.exec(dataURI ?? '');
		if (!parts) {
			return dataURI;
		}
		const [, mime, enc, raw] = parts;
		const data =
			enc === ';base64'
				? Buffer.from(raw, 'base64')
				: Buffer.from(decodeURIComponent(raw), 'utf-8');

		const hash = createHash('sha256').update(data).digest('base64url');
		const extension = KNOWN_MIMES.get(mime);
		if (!extension) {
			throw new Error(`unable to save unknown mime type: ${mime}`);
		}
		const filename = `${hash}.${extension}`;
		this.assets.set(hash, { filename, data });
		return `${this.basePath}/${encodeURIComponent(filename)}`;
	}

	isEmpty() {
		return !this.assets.size;
	}

	all() {
		return this.assets.values();
	}
}

const KNOWN_MIMES = new Map([['image/svg+xml', 'svg']]);
