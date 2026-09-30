import { PNG } from 'pngjs';

export function readImageDataSync(resource) {
	if (resource.mime !== null && resource.mime !== 'image/png') {
		throw new Error('Unsupported image format');
	}
	const raw = PNG.sync.read(resource.data, { skipRescale: true });
	return { width: raw.width, height: raw.height, rgba: raw.data };
}
