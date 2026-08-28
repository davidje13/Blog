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

const originalBash = highlightjs.getLanguage('bash');
highlightjs.registerLanguage('bash', () => ({
	...originalBash,
	contains: [
		...originalBash.contains,
		{
			scope: 'function',
			match: /(?<=^[ \t]*)[a-zA-Z_][a-zA-Z0-9_\-]*(?=[ \t]*\()/,
		},
		{
			scope: 'variable',
			match:
				/(?<=^[ \t]*(local[ \t]+)?([a-zA-Z_][a-zA-Z0-9_]*=([^ "'\\\n]|\\.|"([^"$`\\\n]|\\.|\$[^"(\n])*")*[ \t]+)*)[a-zA-Z_][a-zA-Z0-9_]*(?==)/,
		},
		{
			scope: 'string',
			match:
				/(?<=^[ \t]*(local[ \t]+)?([a-zA-Z_][a-zA-Z0-9_]*=([^ "'\\\n]|\\.|"([^"$`\\\n]|\\.|\$[^"(\n])*")*[ \t]+)*[a-zA-Z_][a-zA-Z0-9_]*=)([^\\ "'$`\n]|\\.)*/,
		},
		{
			scope: 'title',
			match:
				/(?<=^[ \t]*([a-zA-Z_][a-zA-Z0-9_]*=([^ "'\\\n]|\\.|"([^"$`\\\n]|\\.|\$[^"(\n])*")*[ \t]+)*)(?!(while|for|if|elif|else|done|local)\b)[a-zA-Z_][a-zA-Z0-9_\-]*(?=\s|$)/,
		},
	],
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
