import { drawPlot } from './plot/render.mjs';

export const MARKED_PLOT = () => {
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
					return drawPlot(definition, `plot-${id}-`);
				},
			},
		],
	};
};
