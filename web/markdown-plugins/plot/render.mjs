import { escapeHTML } from '../common.mjs';
import { renderCartesian } from './cartesian.mjs';
import { printText } from './text.mjs';

const PLOT_RENDERERS = new Map([
	['cartesian', renderCartesian],
	['layout', renderLayout],
]);

export function drawPlot(definition, id = 'plot') {
	let defID = 0;
	const context = { nextID: () => `${id}-${defID++}` };

	return `<section id="${escapeHTML(id)}" class="plot wide">${renderSubplot(context, definition)}</section>`;
}

function renderSubplot(context, d, headerID) {
	const renderer = PLOT_RENDERERS.get(d.type);
	if (!renderer) {
		throw new Error(`unknown plot type: ${d.type}`);
	}
	return renderer(context, d, headerID);
}

function renderLayout(context, { direction, parts }) {
	return `<div class="layout ${direction === 'vertical' ? 'v' : 'h'}"><div>${parts
		.map((part) => {
			let subHeaderID = null;
			if (part.title) {
				subHeaderID = context.nextID();
			}
			return `<section>${part.title ? `<header id="${subHeaderID}">${printText(part.title)}</header>` : ''}${renderSubplot(context, part, subHeaderID)}</section>`;
		})
		.join('')}</div></div>`;
}
