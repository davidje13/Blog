import { escapeHTML } from '../../common.mjs';
import { printText } from '../text.mjs';

export function addMeasurement(
	target,
	framebounds,
	{
		text,
		position: { p1, p2, direction = 'x', position = 'above', separation = 0 },
	},
) {
	const mx = 1 / (framebounds.x1 - framebounds.x0);
	const my = 1 / (framebounds.y1 - framebounds.y0);
	let dir;
	let vars;

	if (direction === 'y') {
		let x;
		if (position === 'right') {
			dir = 'y r';
			x = Math.max(p1[0], p2[0]) + separation;
		} else {
			dir = 'y l';
			x = Math.min(p1[0], p2[0]) - separation;
		}
		vars = {
			y: 1 - (Math.max(p1[1], p2[1]) - framebounds.y0) * my,
			h: Math.abs(p2[1] - p1[1]) * my,
			x: (x - framebounds.x0) * mx,
		};
		if (p1[0] !== x) {
			target.layers.push({
				html: `<div class="spike x" ${cssVars({
					x: (Math.min(p1[0], x) - framebounds.x0) * mx,
					y: (framebounds.y1 - p1[1]) * my,
					w: Math.abs(p1[0] - x) * mx,
				})}></div>`,
				order: 3,
			});
		}
		if (p2[0] !== x) {
			target.layers.push({
				html: `<div class="spike x" ${cssVars({
					x: (Math.min(p2[0], x) - framebounds.x0) * mx,
					y: (framebounds.y1 - p2[1]) * my,
					w: Math.abs(p2[0] - x) * mx,
				})}></div>`,
				order: 3,
			});
		}
	} else {
		let y;
		if (position === 'below') {
			dir = 'x b';
			y = Math.min(p1[1], p2[1]) - separation;
		} else {
			dir = 'x t';
			y = Math.max(p1[1], p2[1]) + separation;
		}
		vars = {
			x: (Math.min(p1[0], p2[0]) - framebounds.x0) * mx,
			w: Math.abs(p2[0] - p1[0]) * mx,
			y: 1 - (y - framebounds.y0) * my,
		};
		if (p1[1] !== y) {
			target.layers.push({
				html: `<div class="spike y" ${cssVars({
					x: (p1[0] - framebounds.x0) * mx,
					y: (framebounds.y1 - Math.max(p1[1], y)) * my,
					h: Math.abs(p1[1] - y) * my,
				})}></div>`,
				order: 3,
			});
		}
		if (p2[1] !== y) {
			target.layers.push({
				html: `<div class="spike y" ${cssVars({
					x: (p2[0] - framebounds.x0) * mx,
					y: (framebounds.y1 - Math.max(p2[1], y)) * my,
					h: Math.abs(p2[1] - y) * my,
				})}></div>`,
				order: 3,
			});
		}
	}
	target.layers.push({
		html: `<div class="measurement ${dir}" ${cssVars(vars)}><div class="line"></div>${printText(text)}</div>`,
		order: Number.POSITIVE_INFINITY,
	});
}

const cssVars = (o) =>
	`style="${escapeHTML(
		Object.entries(o)
			.map(([k, v]) => `--${k}:${v.toFixed(4)}`)
			.join(';'),
	)}"`;
