import { escapeHTML } from '../../common.mjs';
import { readImageDataSync } from '../image.mjs';
import { loadResourceSync } from '../resource.mjs';
import { plainText } from '../text.mjs';

export function addMap(
	target,
	framebounds,
	{ label, description, image, position = {}, mode = 'or' },
) {
	let svgContent = '';
	if (position.radius !== undefined) {
		const { coord, f1, f2, radius } = position;

		const imageResource = loadResourceSync(
			image,
			target.context.fileRelativePath,
		);
		const imageData = readImageDataSync(imageResource);
		if (imageData.height !== 1) {
			// TODO
			// note: feDisplacementMap is buggy in Chrome on a display-p3 display
			// (see https://issues.chromium.org/issues/373410239#comment11);
			// probably need to pre-render the image rather than rely on frontend filters
			throw new Error('2-dimensional radial heat maps are not yet supported');
		}

		if (coord || (f1?.[0] === f2?.[0] && f1?.[1] === f2?.[1])) {
			const [cx, cy] = coord ?? f1;
			let rx;
			let ry;
			if (Array.isArray(radius)) {
				rx = radius[0];
				ry = radius[1];
			} else {
				rx = ry = radius;
			}

			target.elementDescriptions.push(
				description ??
					`a radial map ${label ? `for ${plainText(label)}` : ''} centred at ${cx}, ${cy}`,
			);
			svgContent = `<g transform="${escapeHTML(`translate(${(cx - framebounds.x0) * target.scaleX} ${target.baseHeight + (cy - framebounds.y0) * target.scaleY}) scale(${(rx / imageData.width) * target.scaleX} ${(ry / imageData.width) * target.scaleY})`)}">`;
			let prev = -1;
			for (let x = imageData.width; x-- > 0;) {
				const r = imageData.rgba[x * 4];
				const g = imageData.rgba[x * 4 + 1];
				const b = imageData.rgba[x * 4 + 2];
				const c = (r << 16) | (g << 8) | b;
				if (c !== prev) {
					svgContent += `<circle r="${x + 1}" fill="#${c.toString(16).padStart(6, '0')}" />`;
					prev = c;
				}
			}
			svgContent += '</g>';
		} else {
			const [cx1, cy1] = f1;
			const [cx2, cy2] = f2;
			const d = Math.sqrt(
				(cx1 - cx2) * (cx1 - cx2) + (cy1 - cy2) * (cy1 - cy2),
			);
			const mx = (cx1 + cx2) * 0.5;
			const my = (cy1 + cy2) * 0.5;
			target.elementDescriptions.push(
				description ??
					`an elliptic radial map ${label ? `for ${plainText(label)}` : ''} with foci at ${cx1}, ${cy1} and ${cx2}, ${cy2}`,
			);
			const s = radius / imageData.width;
			const rr0 = 0.25 * ((d * d) / (s * s));
			svgContent = `<g transform="${escapeHTML(`translate(${(mx - framebounds.x0) * target.scaleX} ${target.baseHeight + (my - framebounds.y0) * target.scaleY}) scale(${s * target.scaleX} ${s * target.scaleY}) rotate(${(Math.atan2(cy2 - cy1, cx2 - cx1) * 180) / Math.PI})`)}">`;
			let prev = -1;
			for (let x = imageData.width; x-- > 0;) {
				const r = imageData.rgba[x * 4];
				const g = imageData.rgba[x * 4 + 1];
				const b = imageData.rgba[x * 4 + 2];
				const c = (r << 16) | (g << 8) | b;
				if (c !== prev) {
					const r = x + 1;
					if (r * r <= rr0) {
						break;
					}
					const ry = Math.sqrt(r * r - rr0);
					if (ry > r * 0.9995) {
						svgContent += `<circle r="${r}" fill="#${c.toString(16).padStart(6, '0')}" />`;
					} else {
						svgContent += `<ellipse rx="${r}" ry="${ry.toFixed(3)}" fill="#${c.toString(16).padStart(6, '0')}" />`;
					}
					prev = c;
				}
			}
			svgContent += '</g>';
		}
	} else if (position.range) {
		const {
			range: [
				[x0 = framebounds.x0, x1 = framebounds.x1] = [],
				[y0 = framebounds.y0, y1 = framebounds.y1] = [],
			],
		} = position;

		target.elementDescriptions.push(
			description ?? `a 2D map ${label ? `for ${plainText(label)}` : ''}`,
		);
		// TODO: embed image as data URI, or use absolute paths if needed
		svgContent = `<image transform="${escapeHTML(`translate(${(x0 - framebounds.x0) * target.scaleX} ${target.baseHeight + (y0 - framebounds.y0) * target.scaleY}) scale(${(x1 - x0) * target.scaleX} ${(y1 - y0) * target.scaleY})`)}" width="1" height="1" href="${escapeHTML(image)}" preserveAspectRatio="none" />`;
	} else {
		throw new Error('unknown position for heat map');
	}

	if (mode === 'and') {
		svgContent = `<g class="and"><rect width="${target.baseWidth}" height="${target.baseHeight}" fill="#000000" />${svgContent}</g>`;
	}

	let maps = target.custom.get('map');
	if (!maps) {
		maps = [];
		target.layers.push({
			html: () => `<svg ${target.svgCommon} class="map">${maps.join('')}</svg>`,
			order: 1,
		});
		target.custom.set('map', maps);
	}
	maps.push(svgContent);
}
