import { marked } from 'marked';

export const MARKED_FIGURE = {
	renderer: {
		paragraph(node) {
			if (node.tokens[0]?.type === 'image') {
				const [image, ...caption] = node.tokens;
				if (!caption.length && image.title) {
					caption.push({ type: 'text', text: image.title });
					image.title = undefined;
				}
				let r = `<figure>${this.parser.parseInline([image])}`;
				if (caption.length) {
					r += `<figcaption>${this.parser.parseInline(caption)}</figcaption>`;
				}
				r += '</figure>';
				return r;
			}
			return marked.Renderer.prototype.paragraph.call(this, node);
		},
		table(node) {
			const base = marked.Renderer.prototype.table.call(this, node);
			return `<div class="table-scroll"><div class="table-outline">${base}</div></div>`;
		},
	},
};
