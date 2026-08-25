import highlightjs from 'highlight.js';
import { marked, Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import markedFootnote from 'marked-footnote';

highlightjs.configure({ classPrefix: '' });

highlightjs.registerLanguage('sandbox-exec-policy', (hljs) => ({
	keywords: {
		keyword: ['version', 'allow', 'deny', 'with', 'require-all', 'require-any'],
		$pattern: /\w[\w\-]*/,
		relevance: 10,
		literal: [
			'literal',
			'path-literal',
			'global-name',
			'subpath',
			'file-mode',
			'regex',
			'preference-domain',
			'target',
			'local',
			'remote',
			'socket-domain',
			'socket-protocol',
		],
	},
	contains: [
		{ scope: 'comment', begin: /;/, end: /$/ },
		{ scope: 'operator', match: /[()]/ },
		{ scope: 'string', begin: '"', end: '"', illegal: '\\n', relevance: 0 },
		{ scope: 'number', begin: /(-|#o)?\d+/ },
	],
}));

highlightjs.registerLanguage('text', (hljs) => ({
	contains: [{ scope: 'comment', begin: /\[\.\.\./, end: /\]/ }],
}));

const CODE = markedHighlight({
	emptyLangClass: 'highlight',
	langPrefix: 'highlight lang-',
	highlight(code, lang) {
		const language = highlightjs.getLanguage(lang) ? lang : 'plaintext';
		return highlightjs.highlight(code, { language }).value;
	},
});

const EXTERNAL_LINK = {
	renderer: {
		link(node) {
			const link = marked.Renderer.prototype.link.call(this, node);
			if (node.href.startsWith('#')) {
				return link;
			}
			return link.replace(/^<a/, '<a target="_blank" rel="noopener"');
		},
	},
};

const FOOTNOTE = markedFootnote();

const SMART_QUOTES = {
	tokenizer: {
		inlineText(src) {
			const cap = this.rules.inline.text.exec(src);
			if (!cap) {
				throw new Error('rules.inline.text.exec failed');
			}

			// based on https://github.com/calculuschild/marked-smartypants-lite/blob/main/src/index.js
			const text = cap[0]
				.replaceAll(/(?<!-)---(?!-)/g, '\u2014') // em-dash
				.replaceAll(/(?<!-)--(?!-)/g, '\u2013') // en-dash
				.replaceAll(/(?<=^|[-\u2014/(\[{"\s])'/g, '\u2018') // opening single
				.replaceAll(/'/g, '\u2019') // closing single / apostrophe
				.replaceAll(/(?<=^|[-\u2014/(\[{\u2018\s])"/g, '\u201c') // opening double
				.replaceAll(/"/g, '\u201d') // closing double
				.replaceAll(/(?<!\.)\.\.\.(?!\.)/g, '\u2026'); // ellipsis

			return { type: 'text', raw: cap[0], text };
		},
	},
};

const HEADING_IDS = {
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

const SUP = {
	extensions: [
		{
			name: 'sup',
			level: 'inline',
			start: (src) => src.indexOf('^'),
			tokenizer(src) {
				const match = /^\^\^([^\n]+?)\^\^/.exec(src);
				if (match) {
					return {
						type: 'sup',
						raw: match[0],
						tokens: this.lexer.inlineTokens(match[1]),
					};
				}
				return undefined;
			},
			renderer({ tokens }) {
				return `<sup>${this.parser.parseInline(tokens)}</sup>`;
			},
		},
	],
};

const ABSOLUTE_PATHS = (baseURL) => ({
	walkTokens: (token) => {
		if (token.href) {
			token.href = URL.parse(token.href, baseURL).toString();
		}
	},
});

let baseRenderer = null;

export function makeMarkdownRenderer({ absolutePathsBase = null } = {}) {
	const isBase = !absolutePathsBase;
	if (isBase && baseRenderer) {
		return baseRenderer;
	}
	const renderer = new Marked(
		CODE,
		EXTERNAL_LINK,
		FOOTNOTE,
		SMART_QUOTES,
		HEADING_IDS,
		SUP,
		absolutePathsBase ? ABSOLUTE_PATHS(absolutePathsBase) : {},
	);
	if (isBase) {
		baseRenderer = renderer;
	}
	return renderer;
}

const escapeHTML = (c) =>
	c
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
