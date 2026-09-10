import { line2SVG, penTool } from 'curve-ops';
import { escapeHTML } from '../common.mjs';
import { compileEq } from './equation.mjs';
import { marchingSquares } from './marchingSquares.mjs';

export function renderCartesian(context, { axes: [xAxis, yAxis], elements }) {
	const svgTextH = (region, anchor, size, pad, content) => {
		const textL = content.length * size * 0.55;
		return `<svg viewBox="${textL * ({ right: -1, left: 0 }[anchor.x] ?? -0.5) - pad.x} ${(size * 0.5 + pad.y) * ({ bottom: 1, top: -1 }[anchor.y] ?? 0)} ${textL + pad.x * 2} ${size + pad.y * 2}" x="${region.x}" y="${region.y}" width="${region.w}" height="${100 * ((size + pad.y * 2) / context.fullH)}%" preserveAspectRatio="${{ right: 'xMax', left: 'xMin' }[anchor.x] ?? 'xMid'}YMin meet" overflow="visible"><text y="${size * 0.25}" fill="#000000" font-family="sans-serif" font-size="${size}" text-anchor="${{ right: 'end', left: 'start' }[anchor.x] ?? 'middle'}">${escapeHTML(content)}</text></svg>`;
	};

	const svgTextV = (region, anchor, size, pad, content) => {
		const textL = content.length * size * 0.55;
		return `<svg viewBox="${(size * 0.5 + pad.x) * ({ left: -1, right: 1 }[anchor.x] ?? 0)} ${textL * ({ top: 0, bottom: -1 }[anchor.y] ?? -0.5) - pad.y} ${size + pad.x * 2} ${textL + pad.y * 2}" x="${region.x}" y="${region.y}" width="${100 * ((size + pad.x * 2) / context.fullW)}%" height="${region.h}" preserveAspectRatio="xMin${{ bottom: 'YMax', top: 'YMin' }[anchor.y] ?? 'YMid'} meet" overflow="visible"><text y="${size * 0.25}" fill="#000000" font-family="sans-serif" font-size="${size}" text-anchor="${{ top: 'end', bottom: 'start' }[anchor.y] ?? 'middle'}" transform="rotate(-90)">${escapeHTML(content)}</text></svg>`;
	};

	let svg = '';
	const labelSize = 16;
	const labelPadBlock = 8;
	const labelPadInline = 12;
	svg += svgTextH(
		{ x: '0%', y: '100%', w: '100%' },
		{ x: 'right', y: 'bottom' },
		labelSize,
		{ x: labelPadInline, y: labelPadBlock },
		xAxis.label,
	);
	svg += svgTextV(
		{ x: '0%', y: '0%', h: '100%' },
		{ x: 'left', y: 'top' },
		labelSize,
		{ x: labelPadBlock, y: labelPadInline },
		yAxis.label,
	);

	// TODO: axis tick marks, value labels

	const x0 = labelSize + labelPadBlock * 2;
	const y0 = context.fullH - labelSize - labelPadBlock * 2;

	const rx0 = xAxis.range[0];
	const ry0 = yAxis.range[0];
	const rx1 = xAxis.range[1];
	const ry1 = yAxis.range[1];

	let grids = [];
	const drawGridlines = (i, l0, l1, masked, step, genLine) => {
		grids[i] ??= [];
		if (step <= 0 || (l1 - l0) / step > 1000) {
			return;
		}
		for (let p = Math.floor(l0 / step) * step; p <= l1; p += step) {
			if (
				masked.some(
					(v) => Math.abs(posmod(p / v + 0.5, 1) - 0.5) < step * 0.001,
				)
			) {
				continue;
			}
			const line = genLine(p);
			grids[i].push(line2SVG(line));
		}
	};
	xAxis.grid?.forEach((step, i) =>
		drawGridlines(i, rx0, rx1, xAxis.grid.slice(0, i), step, (v) => ({
			p0: { x: v, y: -ry0 },
			p1: { x: v, y: -ry1 },
		})),
	);
	yAxis.grid?.forEach((step, i) =>
		drawGridlines(i, ry0, ry1, yAxis.grid.slice(0, i), step, (v) => ({
			p0: { x: rx0, y: -v },
			p1: { x: rx1, y: -v },
		})),
	);

	let lines = '';
	let fills = '';

	for (let elementNum = 0; elementNum < elements.length; ++elementNum) {
		const element = elements[elementNum];
		switch (element.type) {
			case 'equation': {
				const {
					equation,
					range: [rangeX = [], rangeY = []] = [],
					resolution: [rx = 100, ry = 100] = [],
					parameters = {},
				} = element;
				const compiled = compileEq(equation);
				const p = new Map(Object.entries(parameters));
				const bounds = {
					x0: clamp(rangeX[0] ?? rx0, rx0, rx1),
					x1: clamp(rangeX[1] ?? rx1, rx0, rx1),
					y0: clamp(rangeY[0] ?? ry0, ry0, ry1),
					y1: clamp(rangeY[1] ?? ry1, ry0, ry1),
				};
				const shape = marchingSquares(bounds, rx, ry, 8, (x, y) => {
					p.set('x', x);
					p.set('y', y);
					return compiled.run(p);
				});
				const fillParts = [];
				const fillEdgeParts = [];
				const lineParts = [];
				const frame = [
					ptSVGFloating({ x: rx0, y: -ry0 }, 4),
					ptSVGFloating({ x: rx1, y: -ry0 }, 4),
					ptSVGFloating({ x: rx1, y: -ry1 }, 4),
					ptSVGFloating({ x: rx0, y: -ry1 }, 4),
				];
				if (compiled.ineq && shape.edges) {
					fillParts.push(`M${frame.join('L')}Z`);
				}
				const cellScale = Math.min(
					(bounds.x1 - bounds.x0) / rx,
					(bounds.y1 - bounds.y0) / ry,
				);
				for (const path of shape.paths) {
					for (const p of path.p) {
						p.y *= -1; // flip y to match SVG coordinates
					}
					let d = simplifiedSVGPath(path.p, cellScale * 0.005, 4);
					if (path.closed) {
						d += 'Z';
					}
					lineParts.push(d);

					if (compiled.ineq) {
						if (path.closed) {
							fillParts.push(d);
						} else {
							fillEdgeParts.push({
								in: path.in,
								out: path.out,
								d: d.substring(1),
							});
						}
					}
				}
				while (fillEdgeParts.length) {
					let d = '';
					let currentLine = fillEdgeParts[0];
					while (true) {
						d += d ? 'L' : 'M';
						d += currentLine.d;
						let nextDist = 5;
						let nextLineIndex = 0;
						for (let i = 0; i < fillEdgeParts.length; ++i) {
							const dist = posmod(fillEdgeParts[i].in - currentLine.out, 4);
							if (dist < nextDist) {
								nextLineIndex = i;
								nextDist = dist;
							}
						}
						for (
							let i = currentLine.out | 0, e = (currentLine.out + nextDist) | 0;
							i < e;
							++i
						) {
							d += `L${frame[i % 4]}`;
						}
						currentLine = fillEdgeParts.splice(nextLineIndex, 1)[0];
						if (nextLineIndex === 0) {
							break;
						}
					}
					fillParts.push(d + 'Z');
				}

				if (compiled.ineq && fillParts.length) {
					const patternSize = 10;
					const patternW = (patternSize * (rx1 - rx0)) / context.fullW;
					const patternH = (patternSize * (ry1 - ry0)) / context.fullH;
					const patternT = 0.2;
					const patternShift =
						[0, 0.5, 0.25, 0.75][elementNum] ?? elementNum * patternT;
					const patternID = context.nextID();
					fills += `<defs><pattern id="${patternID}" viewBox="0 0 1 1" preserveAspectRatio="none" width="${patternW}" height="${patternH}" patternUnits="userSpaceOnUse" class="area-pattern n${elementNum + 1}" x="${patternShift * patternW}"><path d="M0 ${patternT}V0H${patternT}ZM${patternT} 1H0L1 0V${patternT}Z" /></pattern></defs>`;
					fills += `<path d="${fillParts.join('')}" class="area n${elementNum + 1}" fill="url(#${patternID})" />`;
				}
				if (lineParts.length) {
					lines += `<path d="${lineParts.join('')}" class="edge n${elementNum + 1} ${compiled.eq ? 'inclusive' : 'exclusive'}" />`;
				}
				break;
			}
			default:
				throw new Error(`unknown element type: ${d.type}`);
		}
	}

	const arrowID = context.nextID();

	svg += `<svg viewBox="${rx0} ${-ry1} ${rx1 - rx0} ${ry1 - ry0}" x="${x0}" y="0" width="${100 * ((context.fullW - x0) / context.fullW)}%" height="${100 * (y0 / context.fullH)}%" preserveAspectRatio="none">${grids
		.map((g, l) => `<path d="${g.join('')}" class="grid l${l}" />`)
		.reverse()
		.join('')}${fills}${lines}</svg>`;
	svg += `<defs><marker id="${arrowID}" viewBox="-1 -1 2 2" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 0L-1 1V-1Z" fill="#000000" /></marker></defs>`;
	svg += `<line x1="${x0}" y1="${100 * (y0 / context.fullH)}%" x2="${x0}" y2="5" marker-end="url(#${arrowID})" stroke="#000000" stroke-width="2" stroke-linecap="square" />`;
	svg += `<line x1="${x0}" y1="${100 * (y0 / context.fullH)}%" x2="100%" y2="${100 * (y0 / context.fullH)}%" marker-end="url(#${arrowID})" stroke="#000000" stroke-width="2" stroke-linecap="square" />`;
	return svg;
}

const clamp = (v, l, h) => (v > l ? (v < h ? v : h) : l);
const posmod = (a, b) => ((a % b) + b) % b;

const toLimited = (v, sf) =>
	v.toPrecision(sf).replace(/\.0+($|e)|(?<=\.\d+?)0+($|e)/, '');

const ptSVGFloating = (pt, precision) =>
	`${toLimited(pt.x, precision)} ${toLimited(pt.y, precision)}`;

function simplifiedSVGPath(points, error, precision) {
	if (!error) {
		return `M${points.map((p) => ptSVGFloating(p, precision)).join('L')}`;
	}
	let d = '';
	const pen = penTool(
		(pt) => (d += `M${ptSVGFloating(pt, precision)}`),
		(seg) =>
			(d += `C${ptSVGFloating(seg.c1, precision)} ${ptSVGFloating(seg.c2, precision)} ${ptSVGFloating(seg.p3, precision)}`),
		() => {},
		() => {},
		() => {},
		0,
		100,
		error,
		error,
	);
	const trace = pen(points[0]);
	for (let i = 1; i < points.length - 1; ++i) {
		trace.move(points[i]);
	}
	trace.move(points.at(-1), true);
	return d;
}
