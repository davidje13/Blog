import { marked } from 'marked';
import { escapeHTML } from './common.mjs';

export const MARKED_IMAGE_CLASS = {
	renderer: {
		image(node) {
			let img = marked.Renderer.prototype.image.call(this, node);
			if (!node.className) {
				const classNames = [];
				if (/\.noborder\.[^\/]+$/.test(node.href)) {
					classNames.push('noborder');
				}
				if (/\.small\.[^\/]+$/.test(node.href)) {
					classNames.push('small');
				} else if (/\.wide\.[^\/]+$/.test(node.href)) {
					classNames.push('wide');
				}
				node.className = classNames.join(' ');
			}
			if (node.className) {
				img = img.replace(
					/^<img/,
					`<img class="${escapeHTML(node.className)}"`,
				);
			}
			return img;
		},
	},
};
