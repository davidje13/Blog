import { escapeHTML } from '../common.mjs';
import { renderCartesian } from './cartesian.mjs';

const PLOT_RENDERERS = new Map([
	['cartesian', renderCartesian],
	['layout', renderLayout],
]);

export function drawPlot(definition, idPrefix = 'plot-') {
	let defID = 0;
	const context = { nextID: () => `${idPrefix}${defID++}` };

	return `<section class="plot">${renderSubplot(context, definition)}</section>`;
}

function renderSubplot(context, d) {
	const renderer = PLOT_RENDERERS.get(d.type);
	if (!renderer) {
		throw new Error(`unknown plot type: ${d.type}`);
	}
	return renderer(context, d);
}

function renderLayout(context, { direction, parts }) {
	return `<div class="subplot layout ${direction === 'vertical' ? 'v' : 'h'}"><div>${parts.map((part) => `<section>${part.title ? `<header>${escapeHTML(part.title)}</header>` : ''}${renderSubplot(context, part)}</section>`).join('')}</div></div>`;
}
