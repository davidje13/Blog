import { marked } from 'marked';
import { escapeHTML } from './common.mjs';
import { readImageSizeSync } from './plot/image.mjs';
import { loadResourceSync } from './plot/resource.mjs';

export const MARKED_IMAGE_EXT = (fileRelativePath) => ({
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
			if (node.className) {
				attrs += ` class="${escapeHTML(node.className)}"`;
			}
			let imageSize = node.size;
			if (!imageSize) {
				try {
					const imageResource = loadResourceSync(
						node.rawHref ?? node.href,
						fileRelativePath,
					);
					imageSize = readImageSizeSync(imageResource);
				} catch {}
			}
			if (imageSize) {
				attrs += ` loading="lazy" width="${imageSize.width}" height="${imageSize.height}"`;
			}
			img = img.replace(/^<img/, () => '<img ' + attrs);
			return img;
		},
	},
});
