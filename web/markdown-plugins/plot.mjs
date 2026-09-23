import { escapeHTML } from './common.mjs';
import { drawPlot } from './plot/render.mjs';

export const MARKED_PLOT = (asLink = null) => {
	let nextID = 0;
	return {
		walkTokens(token) {
			if (token.type === 'code' && token.lang === 'json plot') {
				const definition = JSON.parse(token.text);
				Object.assign(token, {
					type: 'paragraph',
					tokens: [
						{ type: 'plot', definition, id: nextID++, title: definition.title },
					],
				});
			}
		},
		extensions: [
			{
				name: 'plot',
				level: 'inline',
				renderer({ definition, id }) {
					nextID = 0;
					const plotID = `plot-${id + 1}`;
					if (asLink) {
						return `<p><a href="${escapeHTML(URL.parse('#' + encodeURIComponent(plotID), asLink).toString())}" target="_blank">Click here to see the diagram</a></p>`;
					} else {
						return drawPlot(definition, plotID);
					}
				},
			},
		],
	};
};
