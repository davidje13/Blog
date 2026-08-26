export const MARKED_HEADING_IDS = {
	renderer: {
		heading({ tokens, depth }) {
			const content = this.parser.parseInline(tokens);
			const slug = content
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-');
			return `<h${depth} id="${escapeHTML(slug)}">${content}</h${depth}>\n`;
		},
	},
};

const escapeHTML = (c) =>
	c
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
