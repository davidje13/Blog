import { VirtualSequenceDiagram } from 'svg-sequence-diagram';

export const MARKED_SEQUENCE_DIAGRAM = {
	walkTokens(token) {
		if (token.type === 'code' && token.lang === 'sequence-diagram') {
			Object.assign(token, {
				type: 'paragraph',
				tokens: [
					{
						type: 'image',
						href:
							'data:image/svg+xml;base64,' +
							btoa(VirtualSequenceDiagram.render(token.text)),
						text: token.text.trim().replaceAll(/\n+/g, '; '),
						className: 'sequence-diagram',
					},
				],
			});
		}
	},
};
