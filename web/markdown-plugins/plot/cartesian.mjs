import { penTool } from 'curve-ops';
import { escapeHTML } from '../common.mjs';
import { compileEq, labelEq } from './equation.mjs';
import { marchingSquares } from './marchingSquares.mjs';

export function renderCartesian(
	context,
	{ axes: [xAxis, yAxis], elements },
	headerID,
) {
	const rx0 = xAxis.range[0];
	const ry0 = yAxis.range[0];
	const rx1 = xAxis.range[1];
	const ry1 = yAxis.range[1];

	let grids = [];
	xAxis.grid?.forEach((step, i) => {
		const dp = countDP(step);
		grids[i] ??= [];
		for (const v of identifyGridlines(rx0, rx1, xAxis.grid.slice(0, i), step)) {
			grids[i].push({
				line: `M${ptSVGFloating({ x: v, y: -ry0 }, 4)}V${toLimited(-ry1, 4)}`,
				pos: (v - rx0) / (rx1 - rx0),
				axis: 'x',
				label: v.toFixed(dp),
			});
		}
	});
	yAxis.grid?.forEach((step, i) => {
		const dp = countDP(step);
		grids[i] ??= [];
		for (const v of identifyGridlines(ry0, ry1, yAxis.grid.slice(0, i), step)) {
			grids[i].push({
				line: `M${ptSVGFloating({ x: rx0, y: -v }, 4)}H${toLimited(rx1, 4)}`,
				pos: (v - ry0) / (ry1 - ry0),
				axis: 'y',
				label: v.toFixed(dp),
			});
		}
	});

	let lines = '';
	let fills = '';

	const elementDescriptions = [];
	for (let elementNum = 0; elementNum < elements.length; ++elementNum) {
		const element = elements[elementNum];
		switch (element.type) {
			case 'equation': {
				const {
					equation,
					description,
					range: [rangeX = [], rangeY = []] = [],
					resolution: [rx = 100, ry = 100] = [],
					parameters = {},
				} = element;
				elementDescriptions.push(
					description ?? `the equation ${labelEq(equation)}`,
				);
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
					// TODO: can we make these pattern sizes scale invariant? (i.e. define them in screen coordinates)
					const patternW = (patternSize * (rx1 - rx0)) / 400;
					const patternH = (patternSize * (rx1 - rx0)) / 400;
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

	// Safari does not currently support CSS' attr(data-* type(<number>)) syntax, so we have
	// to pass CSS variables in using inline style="--var:value".
	// This requires 'unsafe-inline' in the CSP's style-src, but is the only thing we do that needs it.
	// TODO: once Safari catches up, switch to usng data-* attributes and remove 'unsafe-inline'

	const xLabels = [];
	const yLabels = [];
	for (let i = 0; i < grids.length; ++i) {
		for (const { pos, axis, label } of grids[i]) {
			const target = axis === 'x' ? xLabels : yLabels;
			target.push({
				pos,
				html: `<div class="l${i}" style="--pos:${pos}"><span>${escapeHTML(label)}</span></div>`,
			});
		}
	}
	xLabels.sort((a, b) => a.pos - b.pos);
	yLabels.sort((a, b) => a.pos - b.pos);

	let description = `Graph showing: `;
	for (let i = 0; i < elementDescriptions.length - 1; ++i) {
		description += elementDescriptions[i] + '; ';
	}
	if (elementDescriptions.length > 1) {
		description += 'and ';
	}
	description += elementDescriptions.at(-1);

	description += '. With ';
	if (xAxis.label) {
		description += `horizontal axis representing ${xAxis.label}`;
	} else {
		description += 'unlabelled horizontal axis';
	}
	if (xLabels.length) {
		description += ` from ${rx0} to ${rx1}`;
	}

	description += ', and ';
	if (yAxis.label) {
		description += `vertical axis representing ${yAxis.label}`;
	} else {
		description += 'unlabelled vertical axis';
	}
	if (yLabels.length) {
		description += ` from ${ry0} to ${ry1}`;
	}
	const descriptionID = context.nextID();

	return [
		`<div class="subplot cartesian" role="img"${headerID ? ` aria-labelledby="${escapeHTML(headerID)}"` : ''} aria-describedby="${escapeHTML(descriptionID)}">`,
		`<div id="${escapeHTML(descriptionID)}" hidden>${escapeHTML(description)}</div>`,
		`<div class="axis x">`,
		'<div class="line"></div>',
		xAxis.label ? `<div class="label">${escapeHTML(xAxis.label)}</div>` : '',
		xLabels.length
			? `<div class="values" style="${xAxis.grid.map((v, i) => `--n${i}:${(rx1 - rx0) / v}`).join(';')}">${xLabels.map((l) => l.html).join('')}</div>`
			: '',
		'</div>',
		`<div class="axis y">`,
		'<div class="line"></div>',
		yAxis.label ? `<div class="label">${escapeHTML(yAxis.label)}</div>` : '',
		yLabels.length
			? `<div class="values" style="${yAxis.grid.map((v, i) => `--n${i}:${(ry1 - ry0) / v}`).join(';')}">${yLabels.map((l) => l.html).join('')}</div>`
			: '',
		'</div>',
		`<svg xmlns="http://www.w3.org/2000/svg" version="1.1" fill="none" viewBox="${rx0} ${-ry1} ${rx1 - rx0} ${ry1 - ry0}" width="100%" preserveAspectRatio="none" class="view">`,
		...grids
			.map(
				(g, l) =>
					`<path d="${g.map((o) => o.line).join('')}" class="grid l${l}" />`,
			)
			.reverse(),
		fills,
		lines,
		'</svg>',
		'</div>',
	].join('');
}

function* identifyGridlines(l0, l1, masked, step) {
	if (step <= 0 || (l1 - l0) / step > 1000) {
		return;
	}
	for (let p = Math.ceil(l0 / step) * step; p <= l1; p += step) {
		if (
			!masked.some((v) => Math.abs(posmod(p / v + 0.5, 1) - 0.5) < step * 0.001)
		) {
			yield p;
		}
	}
}

const clamp = (v, l, h) => (v > l ? (v < h ? v : h) : l);
const posmod = (a, b) => ((a % b) + b) % b;

const toLimited = (v, sf) =>
	v.toPrecision(sf).replace(/\.0+($|e)|(?<=\.\d+?)0+($|e)/, '');

const ptSVGFloating = (pt, precision) =>
	`${toLimited(pt.x, precision)} ${toLimited(pt.y, precision)}`;

const countDP = (v) =>
	v.toFixed(10).split('.')[1]?.replace(/0*$/, '').length ?? 0;

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
