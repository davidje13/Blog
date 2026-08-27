import { VirtualSequenceDiagram } from 'svg-sequence-diagram';

export const MARKED_SEQUENCE_DIAGRAM = {
	walkTokens(token) {
		if (token.type === 'code' && token.lang === 'sequence-diagram') {
			Object.assign(token, {
				type: 'sequence-diagram',
				href:
					'data:image/svg+xml;base64,' +
					btoa(VirtualSequenceDiagram.render(token.text)),
				alt: token.text.trim().replaceAll(/\n+/g, '; '),
			});
		}
	},
	extensions: [
		{
			name: 'sequence-diagram',
			level: 'block',
			renderer: (token) =>
				`<p><img class="sequence-diagram" src="${escapeHTML(token.href)}" alt="${escapeHTML(token.alt)}" /></p>`,
		},
	],
};

const escapeHTML = (c) =>
	c
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
