import { renderCartesian } from './cartesian.mjs';

export function drawPlot(definition, idPrefix = '') {
	// TODO: switch to regular DOM entities where possible & use CSS for better control over scaling
	const w = definition.width ?? 800;
	const h =
		definition.height ?? (definition.aspect ? w / definition.aspect : 600);
	let svg = `<svg class="plot" xmlns="http://www.w3.org/2000/svg" version="1.1" width="${w}" height="${h}" fill="none">`;
	let defID = 0;
	const context = { nextID: () => `${idPrefix}${defID++}`, fullW: w, fullH: h };

	const renderSubplot = (d) => {
		switch (d.type) {
			case 'cartesian': {
				svg += renderCartesian(context, d);
				break;
			}
			default:
				throw new Error(`unknown plot type: ${d.type}`);
		}
	};
	renderSubplot(definition);
	svg += `</svg>`;

	return svg;
}
