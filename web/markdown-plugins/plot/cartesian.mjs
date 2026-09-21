import { escapeHTML } from '../common.mjs';
import { addEquation } from './cartesian/equation.mjs';
import { addLabel } from './cartesian/label.mjs';
import { addLine } from './cartesian/line.mjs';
import { addMap } from './cartesian/map.mjs';
import { addMeasurement } from './cartesian/measurement.mjs';
import { plainText, printText } from './text.mjs';

export function renderCartesian(
	context,
	{ axes: [xAxis, yAxis], aspect, elements, variant = [] },
	headerID,
) {
	const framebounds = {
		x0: xAxis.range[0],
		y0: yAxis.range[0],
		x1: xAxis.range[1],
		y1: yAxis.range[1],
	};

	aspect ??= Math.abs(
		(framebounds.x1 - framebounds.x0) / (framebounds.y1 - framebounds.y0),
	);
	const baseWidth = 200;
	const baseHeight = baseWidth / aspect;

	const svgCommon = `xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${baseWidth} ${baseHeight}" preserveAspectRatio="none"`;
	const scaleX = baseWidth / (framebounds.x1 - framebounds.x0);
	const scaleY = -baseHeight / (framebounds.y1 - framebounds.y0);
	const transformCommon = `translate(${-framebounds.x0 * scaleX} ${baseHeight - framebounds.y0 * scaleY}) scale(${scaleX} ${scaleY})`;

	if (xAxis.grid?.length > 3) {
		throw new Error('only 3 levels of grid supported');
	}
	if (yAxis.grid?.length > 3) {
		throw new Error('only 3 levels of grid supported');
	}

	let grids = [];
	xAxis.grid?.forEach((step, i) => {
		const dp = countDP(step);
		grids[i] ??= [];
		for (const v of identifyGridlines(
			framebounds.x0,
			framebounds.x1,
			xAxis.grid.slice(0, i),
			step,
		)) {
			grids[i].push({
				line: `M${ptSVGFloating({ x: v, y: framebounds.y0 }, 4)}V${toLimited(framebounds.y1, 4)}`,
				pos: (v - framebounds.x0) / (framebounds.x1 - framebounds.x0),
				axis: 'x',
				label: v.toFixed(dp),
			});
		}
	});
	yAxis.grid?.forEach((step, i) => {
		const dp = countDP(step);
		grids[i] ??= [];
		for (const v of identifyGridlines(
			framebounds.y0,
			framebounds.y1,
			yAxis.grid.slice(0, i),
			step,
		)) {
			grids[i].push({
				line: `M${ptSVGFloating({ x: framebounds.x0, y: v }, 4)}H${toLimited(framebounds.x1, 4)}`,
				pos: (v - framebounds.y0) / (framebounds.y1 - framebounds.y0),
				axis: 'y',
				label: v.toFixed(dp),
			});
		}
	});

	const target = {
		context,
		svgCommon,
		baseWidth,
		baseHeight,
		scaleX,
		scaleY,
		transformCommon,

		lines: '',
		lineHoverRegions: '',
		layers: [],
		keyItems: new Map(),
		elementDescriptions: [],
		elementNum: 0,
	};

	for (const element of elements) {
		const fn = ELEMENT_TYPES.get(element.type);
		if (!fn) {
			throw new Error(`unknown element type: ${element.type}`);
		}
		fn(target, framebounds, element);
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
	for (let i = 0; i < target.elementDescriptions.length - 1; ++i) {
		description += target.elementDescriptions[i] + '; ';
	}
	if (target.elementDescriptions.length > 1) {
		description += 'and ';
	}
	description += target.elementDescriptions.at(-1);

	description += '. With ';
	if (xAxis.label) {
		description += `horizontal axis representing ${plainText(xAxis.label)}`;
	} else {
		description += 'unlabelled horizontal axis';
	}
	if (xLabels.length) {
		description += ` from ${framebounds.x0} to ${framebounds.x1}`;
	}

	description += ', and ';
	if (yAxis.label) {
		description += `vertical axis representing ${plainText(yAxis.label)}`;
	} else {
		description += 'unlabelled vertical axis';
	}
	if (yLabels.length) {
		description += ` from ${framebounds.y0} to ${framebounds.y1}`;
	}
	const descriptionID = context.nextID();
	const labelledKeyItems = [...target.keyItems.values()].filter((k) => k.label);

	target.layers.push({
		html: [
			`<svg ${svgCommon} fill="none" class="grid">`,
			`<g transform="${escapeHTML(transformCommon)}">`,
			...grids
				.map(
					(g, l) =>
						`<path d="${g.map((o) => o.line).join('')}" class="l${l}" />`,
				)
				.reverse(),
			'</g>',
			'</svg>',
		].join(''),
		order: 0,
	});
	if (target.lineHoverRegions || target.lines) {
		target.layers.push({
			html: `<svg ${svgCommon} fill="none" class="lines"><g transform="${escapeHTML(transformCommon)}">${target.lineHoverRegions}${target.lines}</g></svg>`,
			order: 100,
		});
	}
	target.layers.sort((a, b) => a.order - b.order);

	return [
		`<div class="subplot cartesian${escapeHTML((typeof variant === 'string' ? [variant] : variant).map((v) => ` chart-var-${v}`).join(' '))}${target.keyItems.size > 1 ? ' multi' : ''}" role="img"${headerID ? ` aria-labelledby="${escapeHTML(headerID)}"` : ''} aria-describedby="${escapeHTML(descriptionID)}">`,
		`<div id="${escapeHTML(descriptionID)}" hidden>${escapeHTML(description)}</div>`,
		`<div class="view">`,
		...target.layers.map((l) => l.html),
		'</div>',
		`<div class="axis x">`,
		xAxis.line !== false ? '<div class="line"></div>' : '',
		xAxis.label ? `<div class="label">${printText(xAxis.label)}</div>` : '',
		xLabels.length || xAxis.labels?.length
			? `<div class="values${xAxis.notches === false ? '' : ' notch'}" style="${(xAxis.grid ?? []).map((v, i) => `--n${i}:${(framebounds.x1 - framebounds.x0) / v}`).join(';')}">${xLabels.map((l) => l.html).join('')}${axisLabels(xAxis.labels, framebounds.x0, framebounds.x1)}</div>`
			: '',
		'</div>',
		`<div class="axis y">`,
		yAxis.line !== false ? '<div class="line"></div>' : '',
		yAxis.label ? `<div class="label">${printText(yAxis.label)}</div>` : '',
		yLabels.length || yAxis.labels?.length
			? `<div class="values${yAxis.notches === false ? '' : ' notch'}" style="${(yAxis.grid ?? []).map((v, i) => `--n${i}:${(framebounds.y1 - framebounds.y0) / v}`).join(';')}">${yLabels.map((l) => l.html).join('')}${axisLabels(yAxis.labels, framebounds.y0, framebounds.y1)}</div>`
			: '',
		'</div>',
		labelledKeyItems.length > 0
			? `<ul class="key">${labelledKeyItems.map(({ n, label, line, area }) => `<li class="hover n${n}${line ? ' line' : ''} ${area ? ' area' : ''}">${printText(label)}</li>`).join('')}</ul>`
			: '',
		'</div>',
	].join('');
}

const ELEMENT_TYPES = new Map([
	['equation', addEquation],
	['line', addLine],
	['map', addMap],
	['label', addLabel],
	['measurement', addMeasurement],
]);

function* identifyGridlines(l0, l1, masked, step) {
	if (step <= 0 || (l1 - l0) / step > 1000) {
		return;
	}
	for (let p = Math.ceil(l0 / step) * step; p <= l1; p += step) {
		if (!masked.some((v) => Math.abs(posmod(p / v + 0.5, 1) - 0.5) < 0.001)) {
			yield p;
		}
	}
}

function axisLabels(labels, v0, v1) {
	if (!labels) {
		return '';
	}
	return labels
		.map(
			([v, { label }]) =>
				`<div class="lSpc" style="--pos:${(v - v0) / (v1 - v0)}"><span>${printText(label)}</span></div>`,
		)
		.join('');
}

const posmod = (a, b) => ((a % b) + b) % b;

const toLimited = (v, sf) =>
	v
		.toPrecision(sf)
		.replace(/\.0+(?=$|e)|(?<=\.\d+?)0+(?=$|e)/, '')
		.replace(/e\+/, 'e');

const ptSVGFloating = (pt, precision) =>
	`${toLimited(pt.x, precision)} ${toLimited(pt.y, precision)}`;

const countDP = (v) =>
	v.toFixed(10).split('.')[1]?.replace(/0*$/, '').length ?? 0;
