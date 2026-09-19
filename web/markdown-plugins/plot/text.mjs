import { escapeHTML } from '../common.mjs';

export function printText(content) {
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
					r += `<strong>${printText(part.content)}</strong>`;
					break;
				case 'em':
					r += `<em>${printText(part.content)}</em>`;
					break;
				case 'del':
					r += `<del>${printText(part.content)}</del>`;
					break;
				case 'image':
					r += `<img class="inline" src="${escapeHTML(part.image)}" style="--h:${Number(part.height ?? 1)};--mt:${Number(part.margin?.[0] ?? 0)};--mr:${Number(part.margin?.[1] ?? 0)};--mb:${Number(part.margin?.[2] ?? 0)};--ml:${Number(part.margin?.[3] ?? 0)}" />`;
					break;
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
