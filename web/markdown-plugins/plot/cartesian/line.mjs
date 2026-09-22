import { penTool } from 'curve-ops';
import { plainText } from '../text.mjs';
import { escapeHTML } from '../../common.mjs';

export function addLine(
	target,
	_framebounds,
	{
		label,
		description,
		palette = null,
		samples: [xSamples, ySamples],
		style = 'solid',
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
	const lineParts = paths.map((p) =>
		simplifiedSVGPath(p, cellScale * 0.005, 4),
	);

	if (lineParts.length) {
		const className = style === 'dashed' ? 'dashed' : '';
		const lineID = target.context.nextID();
		target.lineHoverRegions += `<use href="#${lineID}" class="hover n${Number(palette)} ext" />`;
		target.lines += `<path id="${lineID}" d="${lineParts.join('')}" class="hover n${Number(palette)} ${escapeHTML(className)}" vector-effect="non-scaling-stroke" />`;
	}
	target.keyItems.set(Number(palette), {
		n: Number(palette),
		label,
		line: lineParts.length > 0,
		area: false,
	});
}

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
