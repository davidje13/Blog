import { marked } from 'marked';
import { escapeHTML } from './common.mjs';

export const MARKED_FILE_TREE = {
	walkTokens(token) {
		if (token.type === 'code' && token.lang === 'filetree') {
			const root = {
				type: 'list',
				className: 'filetree',
				ordered: false,
				items: [],
				fileIndent: null,
			};
			let cur = root;
			const stack = [];
			for (const ln of token.text.split('\n')) {
				const parts = /^([^\p{L}\p{N}\._]*)(.*?)(\/)?$/u.exec(ln);
				if (!parts?.[2]) {
					continue;
				}
				let [, pre, name, suf] = parts;
				const indent = pre.length;
				if (root.fileIndent === null) {
					root.fileIndent = indent;
				}
				while (stack.length > 0 && indent < cur.fileIndent) {
					cur = stack.pop();
				}
				if (indent > cur.fileIndent) {
					const nested = {
						type: 'list',
						ordered: false,
						items: [],
						fileIndent: indent,
					};
					cur.items[cur.items.length - 1].tokens.push(nested);
					stack.push(cur);
					cur = nested;
				}
				const p = name.lastIndexOf('.');
				const img =
					FILE_IMAGES.get(p === -1 ? name : name.substring(p)) ??
					(suf ? DIR : FILE);
				cur.items.push({
					type: 'list_item',
					tokens: [
						{
							type: 'paragraph',
							inline: true,
							tokens: [
								{ type: 'image', size: { width: '16', height: '16' }, ...img },
								{ type: 'text', text: name },
							],
						},
					],
				});
			}
			Object.assign(token, root);
		}
	},
	renderer: {
		list(node) {
			let html = marked.Renderer.prototype.list.call(this, node);
			if (node.className) {
				html = html.replace(
					/<(ol|ul)/,
					(m) => m + ` class="${escapeHTML(node.className)}"`,
				);
			}
			return html;
		},
	},
};

const FILE = { href: '/filelist/file.svg', text: 'File' };
const DIR = { href: '/filelist/dir.svg', text: 'Directory' };
const FILE_IMAGES = new Map([
	['.zip', { href: '/filelist/zip.svg', text: 'Zip' }],
	['.gz', { href: '/filelist/zip.svg', text: 'Gzip' }],
	['.htm', { href: '/filelist/html.svg', text: 'HTML' }],
	['.html', { href: '/filelist/html.svg', text: 'HTML' }],
	['.json', { href: '/filelist/json.svg', text: 'JSON' }],
	['.css', { href: '/filelist/css.svg', text: 'CSS' }],
	['.js', { href: '/filelist/js.svg', text: 'JavaScript' }],
	['.mjs', { href: '/filelist/js.svg', text: 'JavaScript' }],
]);
