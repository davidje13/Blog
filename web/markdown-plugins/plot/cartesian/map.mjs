import { escapeHTML } from '../../common.mjs';
import { plainText } from '../text.mjs';

export function addMap(
	target,
	framebounds,
	elementNum,
	{
		label,
		description,
		image,
		range: [
			[x0 = framebounds.x0, x1 = framebounds.x1] = [],
			[y0 = framebounds.y0, y1 = framebounds.y1] = [],
		] = [],
	},
) {
	target.elementDescriptions.push(
		description ?? `a 2D map ${label ? `for ${plainText(label)}` : ''}`,
	);
	// TODO: embed image as data URI, or use absolute paths if needed
	target.layers += [
		`<svg ${target.svgCommon} class="map n${elementNum + 1}">`,
		`<image transform="${escapeHTML(`translate(${(x0 - framebounds.x0) * target.scaleX} ${target.baseHeight + (y0 - framebounds.y0) * target.scaleY}) scale(${(x1 - x0) * target.scaleX} ${(y1 - y0) * target.scaleY})`)}" width="1" height="1" href="${escapeHTML(image)}" preserveAspectRatio="none" />`,
		'</svg>',
	].join('');
}
