import { ptMid } from 'curve-ops';
import { escapeHTML } from '../../common.mjs';
import { ptSVGFloating } from '../svg.mjs';
import { printText, printTSpan } from '../text.mjs';

export function addMeasurement(
	target,
	framebounds,
	{
		text,
		position: {
			p1,
			p2,
			direction = 'direct',
			position = 'above',
			separation = 0,
		},
	},
) {
	const mx = 1 / (framebounds.x1 - framebounds.x0);
	const my = 1 / (framebounds.y1 - framebounds.y0);
	let dir;
	let vars;

	if (direction === 'direct') {
		const markerID = target.context.nextID();
		const pathID = target.context.nextID();
		const pp1 = {
			x: (p1[0] - framebounds.x0) * target.scaleX,
			y: target.baseHeight + (p1[1] - framebounds.y0) * target.scaleY,
		};
		const pp2 = {
			x: (p2[0] - framebounds.x0) * target.scaleX,
			y: target.baseHeight + (p2[1] - framebounds.y0) * target.scaleY,
		};
		const ppM = ptMid(pp1, pp2);
		target.layers.push({
			html: [
				`<svg ${target.svgCommon} class="measurement">`,
				'<defs>',
				`<marker id="${escapeHTML(markerID)}" viewBox="0 -2 5 4" refX="5.5" markerWidth="5" markerHeight="4" orient="auto-start-reverse" vector-effect="non-scaling-size">`,
				'<path d="M0 2V-2L5 0Z" fill="currentColor" />',
				'</marker>',
				`<path id="${escapeHTML(pathID)}" d="M${ptSVGFloating(pp1)}L${ptSVGFloating(pp2)}" />`,
				'</defs>',
				'<g stroke-linecap="round" stroke-dashoffset="-4" stroke-dasharray="99999 5">',
				`<path class="line" d="M${ptSVGFloating(pp1)}L${ptSVGFloating(ppM)}" marker-start="url(#${escapeHTML(markerID)})" />`,
				`<path class="line" d="M${ptSVGFloating(pp2)}L${ptSVGFloating(ppM)}" marker-start="url(#${escapeHTML(markerID)})" />`,
				'</g>',
				`<text><textPath href="#${escapeHTML(pathID)}" startOffset="50%" text-anchor="middle"><tspan dy="-2">${printTSpan(target.context, text)}</tspan></textPath></text>`,
				'</svg>',
			].join(''),
			order: Number.POSITIVE_INFINITY,
		});
		return;
	} else if (direction === 'y') {
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
	} else if (direction === 'x') {
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
	} else {
		throw new Error('unknown measurement direction');
	}
	target.layers.push({
		html: `<div class="measurement ${dir}" ${cssVars(vars)}><div class="line"></div>${printText(target.context, text)}</div>`,
		order: Number.POSITIVE_INFINITY,
	});
}

const cssVars = (o) =>
	`style="${escapeHTML(
		Object.entries(o)
			.map(([k, v]) => `--${k}:${v.toFixed(4)}`)
			.join(';'),
	)}"`;
