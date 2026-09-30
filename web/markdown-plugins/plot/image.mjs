import { PNG } from 'pngjs';

export function readImageDataSync(resource) {
	if (resource.mime !== null && resource.mime !== 'image/png') {
		throw new Error('Unsupported image format');
	}
	const raw = PNG.sync.read(resource.data, { skipRescale: true });
	return { width: raw.width, height: raw.height, rgba: raw.data };
}

export function readImageSizeSync(resource) {
	if (resource.mime !== null && !resource.mime.startsWith('image/')) {
		throw new Error('Not an image format');
	}

	if (matches(resource.data, PNG_MAGIC, 0)) {
		return {
			width: readUInt32be(resource.data, PNG_MAGIC.length + 8),
			height: readUInt32be(resource.data, PNG_MAGIC.length + 12),
		};
	}

	if (matches(resource.data, JPEG_MAGIC, 0)) {
		return null; // TODO
	}

	try {
		const content = new TextDecoder('utf-8').decode(resource.data);
		const svgMatch = /^\s*(?:<\?[^?]*\?>\s*)?<svg(\s[^>]*)>/.exec(content);
		if (svgMatch) {
			const w = /\swidth="([\d.]+)"/.exec(svgMatch[1]);
			const h = /\sheight="([\d.]+)"/.exec(svgMatch[1]);
			if (w && h) {
				return {
					width: Number.parseFloat(w[1]),
					height: Number.parseFloat(h[1]),
				};
			}
		}
	} catch {}

	return null;
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

function matches(buf, cmp, pos) {
	for (let i = 0; i < cmp.length; ++i) {
		if (buf[i + pos] !== cmp[i]) {
			return false;
		}
	}
	return true;
}

const readUInt32be = (buf, pos) =>
	(buf[pos] << 24) | (buf[pos + 1] << 16) | (buf[pos + 2] << 8) | buf[pos + 3];
