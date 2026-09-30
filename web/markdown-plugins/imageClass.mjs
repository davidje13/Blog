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
			let attrs = '';
			//attrs += ' loading="lazy"'; - ideally set width+height if using this
			if (node.className) {
				attrs += ` class="${escapeHTML(node.className)}"`;
			}
			img = img.replace(/^<img/, () => '<img ' + attrs);
			return img;
		},
	},
};
