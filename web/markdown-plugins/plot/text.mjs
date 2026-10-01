import { escapeHTML } from '../common.mjs';
import { readImageSizeSync } from './image.mjs';
import { loadResourceSync } from './resource.mjs';

export function printText(context, content) {
	if (!content?.length) {
		return '';
	}
	if (typeof content === 'string') {
		return escapeHTML(content);
	}
	if (!Array.isArray(content)) {
		throw new Error('unexpected text content');
	}
	let r = '';
	for (const part of content) {
		if (typeof part === 'string') {
			r += escapeHTML(part);
		} else {
			switch (part.type) {
				case 'strong':
					r += `<strong>${printText(context, part.content)}</strong>`;
					break;
				case 'em':
					r += `<em>${printText(context, part.content)}</em>`;
					break;
				case 'del':
					r += `<del>${printText(context, part.content)}</del>`;
					break;
				case 'image': {
					let attrs = '';
					try {
						const imageResource = loadResourceSync(
							part.image,
							context.fileRelativePath,
						);
						const imageSize = readImageSizeSync(imageResource);
						if (imageSize) {
							attrs += ` loading="lazy" width="${imageSize.width}" height="${imageSize.height}"`;
						}
					} catch {}
					r += `<img class="inline"${attrs} src="${escapeHTML(part.image)}" style="--h:${Number(part.height ?? 1)};--mt:${Number(part.margin?.[0] ?? 0)};--mr:${Number(part.margin?.[1] ?? 0)};--mb:${Number(part.margin?.[2] ?? 0)};--ml:${Number(part.margin?.[3] ?? 0)}"${part.alt ? ` alt="${escapeHTML(part.alt)}"` : ''} />`;
					break;
				}
			}
		}
	}
	return r;
}

export function printTSpan(context, content) {
	if (!content?.length) {
		return '';
	}
	if (typeof content === 'string') {
		return escapeHTML(content);
	}
	if (!Array.isArray(content)) {
		throw new Error('unexpected text content');
	}
	let r = '';
	for (const part of content) {
		if (typeof part === 'string') {
			r += escapeHTML(part);
		} else {
			switch (part.type) {
				case 'strong':
					r += `<tspan class="strong">${printTSpan(context, part.content)}</tspan>`;
					break;
				case 'em':
					r += `<tspan class="em">${printTSpan(context, part.content)}</tspan>`;
					break;
				case 'del':
					r += `<tspan class="del">${printTSpan(context, part.content)}</tspan>`;
					break;
				case 'image':
					throw new Error('cannot use images here');
			}
		}
	}
	return r;
}

export function plainText(content) {
	if (!content?.length) {
		return '';
	}
	if (typeof content === 'string') {
		return content;
	}
	if (!Array.isArray(content)) {
		throw new Error('unexpected text content');
	}
	let r = '';
	for (const part of content) {
		if (typeof part === 'string') {
			r += part;
		} else if (part.content) {
			r += plainText(part.content);
		} else if (part.alt) {
			r += plainText(part.alt);
		}
	}
	return r;
}
