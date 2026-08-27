import highlightjs from 'highlight.js';
import { markedHighlight } from 'marked-highlight';

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

export const MARKED_HIGHLIGHT = markedHighlight({
	emptyLangClass: 'highlight',
	langPrefix: 'highlight lang-',
	highlight(code, lang) {
		if (lang === 'sequence-diagram') {
			return code;
		}
		const language = highlightjs.getLanguage(lang) ? lang : 'plaintext';
		return highlightjs.highlight(code, { language }).value;
	},
});
