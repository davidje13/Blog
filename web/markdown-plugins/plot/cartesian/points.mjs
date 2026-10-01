import { plainText } from '../text.mjs';
import { escapeHTML } from '../../common.mjs';
import { simplifiedSVGPath } from '../svg.mjs';

export function addPoints(
	target,
	_framebounds,
	{
		label,
		description,
		palette = null,
		samples: [xSamples, ySamples],
		line = 'solid',
		symbol = false,
	},
) {
	if (description || label) {
		target.elementDescriptions.push(
			description ?? `a line for ${plainText(label)}`,
		);
	}
	if (palette === null) {
		palette = ++target.elementNum;
	}
	if (typeof symbol === 'string') {
		symbol = { type: symbol, solid: false, orientation: 0, scale: 1 };
	}
	const xData = readSamples(xSamples);
	const yData = readSamples(ySamples);
	const count = Math.max(xData.count, yData.count);
	let cellScale = Math.min(
		(xData.max - xData.min) / count,
		(yData.max - yData.min) / count,
	);

	const paths = [];
	let path = [];
	for (let i = 0; i < count; ++i) {
		const x = xData.get(i, count);
		const y = yData.get(i, count);
		if (x === null || y === null) {
			if (path.length) {
				paths.push(path);
				path = [];
			}
		} else {
			path.push({ x, y });
		}
	}
	if (path.length) {
		paths.push(path);
	}
	const allowModification = !symbol;
	const lineParts = paths.map((p) =>
		simplifiedSVGPath(p, allowModification ? cellScale * 0.005 : 0, 4),
	);

	if (lineParts.length) {
		const className = line === 'dashed' ? 'dashed' : line ? '' : 'noline';
		let symbolID = null;
		if (symbol) {
			// TODO: allow symbol to be an array for different symbols for each point
			// (also colours?)
			symbolID = target.context.nextID();
			const markerDef = MARKERS.get(symbol.type);
			if (!markerDef) {
				throw new Error('Unknown marker type');
			}
			const scale = symbol.scale ?? 1;
			target.lineDefs += `<marker id="${escapeHTML(symbolID)}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="${scale * 8}" markerHeight="${scale * 8}"${symbol.orientation ? ` orient="${-Number(symbol.orientation)}deg"` : ''} class="n${Number(palette)} ${symbol.solid ? ' solid' : ''}">${markerDef}</marker>`;
		}
		const lineID = target.context.nextID();
		// TODO: if line===false, make lineHoverRegions use no line, but use circular markers at each corner for correct hit-testing
		target.lineHoverRegions += `<path id="${lineID}" d="${lineParts.join('')}" class="hover n${Number(palette)} ext" vector-effect="non-scaling-stroke" />`;
		target.lines += `<use href="#${lineID}" class="hover n${Number(palette)} ${escapeHTML(className)}"${symbolID ? `marker-start="url(#${escapeHTML(symbolID)})" marker-mid="url(#${escapeHTML(symbolID)})" marker-end="url(#${escapeHTML(symbolID)})"` : ''} />`;
	}
	target.keyItems.set(Number(palette), {
		n: Number(palette),
		label,
		line: lineParts.length > 0,
		area: false,
	});
}

const MARKERS = new Map([
	['cross', '<path d="M2 2L8 8M2 8L8 2" />'],
	['plus', '<path d="M1 5H9M5 1V9" />'],
	['circle', '<circle cx="5" cy="5" r="4" />'],
	['square', '<path d="M1 1H9V9H1Z" />'],
	['triangle', '<path d="M1 2.5H9L5 9.5Z" />'],
	['diamond', '<path d="M5 1L9 5L5 9L1 5Z" />'],
	['rhombus', '<path d="M5 1L7 5L5 9L3 5Z" />'],
	[
		'star',
		'<path d="M5 9.12l.93-2.85h3l-2.43-1.76l.93-2.85l-2.43 1.76l-2.43-1.76l.93 2.85l-2.43 1.76h3Z" />',
	],
	['dot', '<circle cx="5" cy="5" r="1" class="solid" />'],
	[
		'target',
		'<circle cx="5" cy="5" r="3" /><path d="M1 5h2M5 1v2M7 5h2M5 7v2M5 5v.01" />',
	],
	[
		'locator',
		'<rect x="2" y="2" width="6" height="6" rx="1" /><path d="M1 5h2M5 1v2M7 5h2M5 7v2M5 5v.01" />',
	],
]);

function readSamples(samples) {
	if (samples.range) {
		const [l, h] = samples.range;
		return {
			count: 2,
			get: (i, count) => (i / count) * (h - l) + l,
			min: Math.min(l, h),
			max: Math.max(l, h),
		};
	}
	if (samples.values) {
		const scale = samples.scale ?? 1;
		let values;
		if (typeof samples.values === 'string') {
			values = samples.values
				.split(',')
				.map((v) => (v === 'null' ? null : Number.parseFloat(v) * scale));
		} else if (Array.isArray(samples.values)) {
			values = samples.values.map((v) => (v === null ? null : v * scale));
		} else {
			throw new Error('invalid sample values');
		}
		let min = Number.POSITIVE_INFINITY;
		let max = Number.NEGATIVE_INFINITY;
		for (const v of values) {
			if (v !== null) {
				if (v > max) {
					max = v;
				}
				if (v < min) {
					min = v;
				}
			}
		}
		return { count: values.length, get: (i) => values[i] ?? 0, min, max };
	}
	throw new Error('no sample data');
}
