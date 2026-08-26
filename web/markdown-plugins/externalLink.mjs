import { marked } from 'marked';

export const MARKED_EXTERNAL_LINK = {
	renderer: {
		link(node) {
			const link = marked.Renderer.prototype.link.call(this, node);
			if (node.href.startsWith('#')) {
				return link;
			}
			return link.replace(/^<a/, '<a target="_blank" rel="external noopener"');
		},
	},
};
