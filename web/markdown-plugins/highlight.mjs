import highlightjs from 'highlight.js';
import { markedHighlight } from 'marked-highlight';

highlightjs.configure({ classPrefix: '' });

highlightjs.registerLanguage('sandbox-exec-policy', () => ({
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

highlightjs.registerLanguage('text', () => ({
	contains: [{ scope: 'comment', begin: /\[\.\.\./, end: /\]/ }],
}));

highlightjs.registerLanguage('bash', (hljs) => {
	// adapted from https://github.com/highlightjs/highlight.js/blob/main/src/languages/bash.js

	const regex = hljs.regex;
	const VAR = {};
	const BRACED_VAR = {
		begin: /\$\{/,
		end: /\}/,
		contains: [
			'self',
			{
				begin: /:-/,
				contains: [VAR],
			}, // default values
		],
	};
	Object.assign(VAR, {
		className: 'variable',
		variants: [
			{
				begin: regex.concat(
					/\$[\w\d#@][\w\d_]*/,
					// negative look-ahead tries to avoid matching patterns that are not
					// Perl at all like $ident$, @ident@, etc.
					`(?![\\w\\d])(?![$])`,
				),
			},
			BRACED_VAR,
		],
	});

	const SUBST = {
		className: 'subst',
		begin: /\$\(/,
		end: /\)/,
		contains: [hljs.BACKSLASH_ESCAPE],
	};
	const COMMENT = hljs.inherit(hljs.COMMENT(), {
		match: [/(^|\s)/, /#.*$/],
		scope: {
			2: 'comment',
		},
	});
	const HERE_DOC = {
		begin: /<<-?\s*(?=\w+)/,
		starts: {
			contains: [
				hljs.END_SAME_AS_BEGIN({
					begin: /(\w+)/,
					end: /(\w+)/,
					className: 'string',
					contains: [VAR, SUBST],
				}),
			],
		},
	};
	const QUOTED_HERE_DOC = {
		begin: /<<-?\s*(?="\w+")/,
		starts: {
			contains: [
				hljs.END_SAME_AS_BEGIN({
					begin: /"(\w+)"/,
					end: /(\w+)/,
					className: 'string',
				}),
			],
		},
	};
	const QUOTE_STRING = {
		className: 'string',
		begin: /"/,
		end: /"/,
		contains: [hljs.BACKSLASH_ESCAPE, VAR, SUBST],
	};
	SUBST.contains.push(QUOTE_STRING);
	const ESCAPED_QUOTE = {
		match: /\\"/,
	};
	const APOS_STRING = {
		className: 'string',
		begin: /'/,
		end: /'/,
	};
	const ESCAPED_APOS = {
		match: /\\'/,
	};
	const ARITHMETIC = {
		begin: /\$?\(\(/,
		end: /\)\)/,
		contains: [
			{
				begin: /\d+#[0-9a-f]+/,
				className: 'number',
			},
			hljs.NUMBER_MODE,
			VAR,
		],
	};
	const SH_LIKE_SHELLS = [
		'fish',
		'bash',
		'zsh',
		'sh',
		'csh',
		'ksh',
		'tcsh',
		'dash',
		'scsh',
	];
	const KNOWN_SHEBANG = hljs.SHEBANG({
		binary: `(${SH_LIKE_SHELLS.join('|')})`,
		relevance: 10,
	});
	const FUNCTION = {
		className: 'function',
		begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
		returnBegin: true,
		contains: [hljs.inherit(hljs.TITLE_MODE, { begin: /\w[\w\d_]*/ })],
		relevance: 0,
	};

	const BASH_ARGUMENTS = {
		match: [/\s+/, /-{1,2}[\w-]+/],
		scope: { 2: 'attr' },
	};

	const KEYWORDS = [
		'if',
		'then',
		'else',
		'elif',
		'fi',
		'time',
		'for',
		'while',
		'until',
		'in',
		'do',
		'done',
		'case',
		'esac',
		'coproc',
		'function',
		'select',
	];

	const LITERALS = ['true', 'false'];

	// to consume paths to prevent keyword matches inside them
	const PATH_MODE = { match: /(\/[a-z._-]+)+/ };

	// http://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
	const SHELL_BUILT_INS = [
		'break',
		'cd',
		'continue',
		'eval',
		'exec',
		'exit',
		'export',
		'getopts',
		'hash',
		'pwd',
		'readonly',
		'return',
		'shift',
		'test',
		'times',
		'trap',
		'umask',
		'unset',
	];

	const BASH_BUILT_INS = [
		'alias',
		'bind',
		'builtin',
		'caller',
		'command',
		'declare',
		'echo',
		'enable',
		'help',
		'let',
		'local',
		'logout',
		'mapfile',
		'printf',
		'read',
		'readarray',
		'source',
		'sudo',
		'type',
		'typeset',
		'ulimit',
		'unalias',
	];

	const ZSH_BUILT_INS = [
		'autoload',
		'bg',
		'bindkey',
		'bye',
		'cap',
		'chdir',
		'clone',
		'comparguments',
		'compcall',
		'compctl',
		'compdescribe',
		'compfiles',
		'compgroups',
		'compquote',
		'comptags',
		'comptry',
		'compvalues',
		'dirs',
		'disable',
		'disown',
		'echotc',
		'echoti',
		'emulate',
		'fc',
		'fg',
		'float',
		'functions',
		'getcap',
		'getln',
		'history',
		'integer',
		'jobs',
		'kill',
		'limit',
		'log',
		'noglob',
		'popd',
		'print',
		'pushd',
		'pushln',
		'rehash',
		'sched',
		'setcap',
		'setopt',
		'stat',
		'suspend',
		'ttyctl',
		'unfunction',
		'unhash',
		'unlimit',
		'unsetopt',
		'vared',
		'wait',
		'whence',
		'where',
		'which',
		'zcompile',
		'zformat',
		'zftp',
		'zle',
		'zmodload',
		'zparseopts',
		'zprof',
		'zpty',
		'zregexparse',
		'zsocket',
		'zstyle',
		'ztcp',
	];

	const GNU_CORE_UTILS = [
		'chcon',
		'chgrp',
		'chown',
		'chmod',
		'cp',
		'dd',
		'df',
		'dir',
		'dircolors',
		'ln',
		'ls',
		'mkdir',
		'mkfifo',
		'mknod',
		'mktemp',
		'mv',
		'realpath',
		'rm',
		'rmdir',
		'shred',
		'sync',
		'touch',
		'truncate',
		'vdir',
		'b2sum',
		'base32',
		'base64',
		'cat',
		'cksum',
		'comm',
		'csplit',
		'cut',
		'expand',
		'fmt',
		'fold',
		'head',
		'join',
		'md5sum',
		'nl',
		'numfmt',
		'od',
		'paste',
		'ptx',
		'pr',
		'sha1sum',
		'sha224sum',
		'sha256sum',
		'sha384sum',
		'sha512sum',
		'shuf',
		'sort',
		'split',
		'sum',
		'tac',
		'tail',
		'tr',
		'tsort',
		'unexpand',
		'uniq',
		'wc',
		'arch',
		'basename',
		'chroot',
		'date',
		'dirname',
		'du',
		'echo',
		'env',
		'expr',
		'factor',
		// "false", // keyword literal already
		'groups',
		'hostid',
		'id',
		'link',
		'logname',
		'nice',
		'nohup',
		'nproc',
		'pathchk',
		'pinky',
		'printenv',
		'printf',
		'pwd',
		'readlink',
		'runcon',
		'seq',
		'sleep',
		'stat',
		'stdbuf',
		'stty',
		'tee',
		'test',
		'timeout',
		// "true", // keyword literal already
		'tty',
		'uname',
		'unlink',
		'uptime',
		'users',
		'who',
		'whoami',
		'yes',
	];

	return {
		name: 'Bash',
		aliases: ['sh', 'zsh'],
		keywords: {
			$pattern: /\b[a-z][a-z0-9._-]+\b/,
			keyword: KEYWORDS,
			literal: LITERALS,
			built_in: [
				...SHELL_BUILT_INS,
				...BASH_BUILT_INS,
				// Shell modifiers
				'set',
				'shopt',
				...ZSH_BUILT_INS,
				...GNU_CORE_UTILS,
			],
		},
		contains: [
			KNOWN_SHEBANG, // to catch known shells and boost relevancy
			hljs.SHEBANG(), // to catch unknown shells but still highlight the shebang
			FUNCTION,
			ARITHMETIC,
			COMMENT,
			BASH_ARGUMENTS,
			HERE_DOC,
			QUOTED_HERE_DOC,
			PATH_MODE,
			QUOTE_STRING,
			ESCAPED_QUOTE,
			APOS_STRING,
			ESCAPED_APOS,
			VAR,

			{
				scope: 'function',
				match: /(?<=(^|;)[ \t]*)[a-zA-Z_][a-zA-Z0-9_\-]*(?=[ \t]*\()/,
			},
			{
				scope: 'variable',
				match:
					/(?<=(^|[;|])[ \t]*(local[ \t]+)?([a-zA-Z_][a-zA-Z0-9_]*=([^ "'\\\n]|\\.|"([^"$`\\\n]|\\.|\$[^"(\n])*")*[ \t]+)*)[a-zA-Z_][a-zA-Z0-9_]*(?==)/,
			},
			{
				scope: 'string',
				match:
					/(?<=(^|[;|])[ \t]*(local[ \t]+)?([a-zA-Z_][a-zA-Z0-9_]*=([^ "'\\\n]|\\.|"([^"$`\\\n]|\\.|\$[^"(\n])*")*[ \t]+)*[a-zA-Z_][a-zA-Z0-9_]*=)([^\\ "'$`\n]|\\.)*/,
			},
			{
				scope: 'title',
				match:
					/(?<=(^|[;|])[ \t]*([a-zA-Z_][a-zA-Z0-9_]*=([^ "'\\\n]|\\.|"([^"$`\\\n]|\\.|\$[^"(\n])*")*[ \t]+)*)(sudo[ \t]+)?(?!(while|until|for|do|done|if|elif|else|fi|case|esac|select|break|continue|local)\b)[a-zA-Z_][a-zA-Z0-9_\-]*(?=\s|$)/,
			},
			{
				// prevent arguments being considered as keywords
				match: /(?<=(^|[;|])[ \t]*[a-zA-Z0-9_]+[ \t]+[^\n;|]*)[\w]+/,
			},
		],
	};
});

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
