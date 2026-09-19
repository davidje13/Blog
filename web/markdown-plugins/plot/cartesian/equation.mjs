import { penTool } from 'curve-ops';
import { escapeHTML } from '../../common.mjs';
import {
	compileEq,
	labelEq,
	toArbitraryInequality,
	toFunction,
	toSimpleInequality,
} from './compileEq.mjs';
import { marchingSquares } from './marchingSquares.mjs';
import { plainText } from '../text.mjs';

export function addEquation(
	target,
	framebounds,
	elementNum,
	{
		equation,
		label,
		description,
		palette = elementNum + 1,
		range: [rangeX = [], rangeY = []] = [],
		resolution = null,
		parameters = {},
		functions = {},
	},
) {
	let rx = null;
	let ry = null;
	if (Array.isArray(resolution)) {
		rx = resolution[0];
		ry = resolution[1];
	} else {
		rx = ry = resolution;
	}
	target.elementDescriptions.push(
		description ??
			`the equation ${label ? `for ${plainText(label)}: ` : ''}${labelEq(equation)}`,
	);
	const p = new Map(Object.entries(parameters));
	const bounds = {
		x0: clamp(rangeX[0] ?? framebounds.x0, framebounds.x0, framebounds.x1),
		x1: clamp(rangeX[1] ?? framebounds.x1, framebounds.x0, framebounds.x1),
		y0: clamp(rangeY[0] ?? framebounds.y0, framebounds.y0, framebounds.y1),
		y1: clamp(rangeY[1] ?? framebounds.y1, framebounds.y0, framebounds.y1),
	};
	const cellScale = Math.min(
		(bounds.x1 - bounds.x0) / (rx ?? 100),
		(bounds.y1 - bounds.y0) / (ry ?? 100),
	);
	const areaParts = [];
	const areaEdgeParts = [];
	const lineParts = [];
	const frame = [
		ptSVGFloating({ x: bounds.x0, y: bounds.y0 }, 4),
		ptSVGFloating({ x: bounds.x1, y: bounds.y0 }, 4),
		ptSVGFloating({ x: bounds.x1, y: bounds.y1 }, 4),
		ptSVGFloating({ x: bounds.x0, y: bounds.y1 }, 4),
	];

	const resolvedFunctions = new Map();
	const compiledFunctions = new Map();
	for (const [name, { parameters = [] }] of Object.entries(functions)) {
		const fnP = new Map(p);
		const compiled = { fn: null };
		let calling = false;
		compiledFunctions.set(name, compiled);
		resolvedFunctions.set(name, (...params) => {
			if (calling) {
				throw new Error('recursive function calls are not supported');
			}
			for (let i = 0; i < parameters.length; ++i) {
				fnP.set(parameters[i], params[i] ?? 0);
			}
			try {
				calling = true;
				return compiled.fn(fnP);
			} finally {
				calling = false;
			}
		});
	}
	for (const [name, fn] of Object.entries(functions)) {
		compiledFunctions.get(name).fn = toFunction(
			compileEq(fn.equation, resolvedFunctions),
		);
	}

	const compiled = compileEq(equation, resolvedFunctions);
	let inclusive = false;

	const simpleInequality = toSimpleInequality(compiled, ['x', 'y']);
	if (simpleInequality) {
		const outVar = simpleInequality.output;
		const inVar = outVar === 'x' ? 'y' : 'x';
		const [p0, p1, r] =
			inVar === 'x'
				? [bounds.x0, bounds.x1, rx ?? 500]
				: [bounds.y0, bounds.y1, ry ?? 500];
		const [v0, v1] =
			outVar === 'x' ? [bounds.x0, bounds.x1] : [bounds.y0, bounds.y1];
		const pm = (p1 - p0) / r;
		const paths = [];
		let path = [];
		let prev = Number.NaN;
		for (let i = 0; i <= r; ++i) {
			const pIn = p0 + i * pm;
			p.set(inVar, pIn);
			const v = simpleInequality.run(p);
			if (Number.isNaN(v)) {
				// TODO (?)
			} else if (v > v1) {
				if (prev < v0) {
					//paths.push([{}, {}]); // TODO
				} else if (prev < v1) {
					//path.push({}); // TODO
					paths.push(path);
					path = [];
				}
			} else if (v < v0) {
				if (prev > v1) {
					//paths.push([{}, {}]); // TODO
				} else if (prev > v0) {
					//path.push({}); // TODO
					paths.push(path);
					path = [];
				}
			} else {
				if (prev > v1) {
					//path.push({}); // TODO
				}
				if (prev < v0) {
					//path.push({}); // TODO
				}
				path.push({ [inVar]: pIn, [outVar]: v });
			}
			prev = v;
		}
		if (path.length) {
			paths.push(path);
		}
		for (const p of paths) {
			lineParts.push(simplifiedSVGPath(p, cellScale * 0.005, 4));
		}
		if (simpleInequality.ineq) {
			// TODO: areas
		}
		inclusive = simpleInequality.eq;
	} else {
		const arbitraryInequality = toArbitraryInequality(compiled);
		const shape = marchingSquares(bounds, rx ?? 100, ry ?? 100, 8, (x, y) => {
			p.set('x', x);
			p.set('y', y);
			return arbitraryInequality.run(p);
		});
		if (arbitraryInequality.ineq && shape.edges) {
			areaParts.push(`M${frame.join('L')}Z`);
		}
		for (const path of shape.paths) {
			let d = simplifiedSVGPath(path.p, cellScale * 0.005, 4);
			if (path.closed) {
				d += 'Z';
			}
			lineParts.push(d);

			if (arbitraryInequality.ineq) {
				if (path.closed) {
					areaParts.push(d);
				} else {
					areaEdgeParts.push({
						in: path.in,
						out: path.out,
						d: d.substring(1),
					});
				}
			}
		}
		while (areaEdgeParts.length) {
			let d = '';
			let currentLine = areaEdgeParts[0];
			while (true) {
				d += d ? 'L' : 'M';
				d += currentLine.d;
				let nextDist = 5;
				let nextLineIndex = 0;
				for (let i = 0; i < areaEdgeParts.length; ++i) {
					const dist = posmod(areaEdgeParts[i].in - currentLine.out, 4);
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
				currentLine = areaEdgeParts.splice(nextLineIndex, 1)[0];
				if (nextLineIndex === 0) {
					break;
				}
			}
			areaParts.push(d + 'Z');
		}
		inclusive = arbitraryInequality.eq;
	}

	if (areaParts.length) {
		target.layers += `<svg ${target.svgCommon} class="area n${Number(palette)}"><path transform="${escapeHTML(target.transformCommon)}" d="${areaParts.join('')}" /></svg>`;
	}
	if (lineParts.length) {
		const lineID = target.context.nextID();
		target.lineHoverRegions += `<use href="#${lineID}" class="hover n${Number(palette)} ext" />`;
		target.lines += `<path id="${lineID}" d="${lineParts.join('')}" class="hover n${Number(palette)} ${inclusive ? 'inclusive' : 'exclusive'}" vector-effect="non-scaling-stroke" />`;
	}
	target.keyItems.set(Number(palette), {
		n: Number(palette),
		label,
		line: lineParts.length > 0,
		area: areaParts.length > 0,
	});
}

const clamp = (v, l, h) => (v > l ? (v < h ? v : h) : l);
const posmod = (a, b) => ((a % b) + b) % b;

const toLimited = (v, sf) =>
	v
		.toPrecision(sf)
		.replace(/\.0+(?=$|e)|(?<=\.\d+?)0+(?=$|e)/, '')
		.replace(/e\+/, 'e');

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
