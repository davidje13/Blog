import { marked } from 'marked';

export const MARKED_MACRO = () => {
	// note: due to the use of global state, this is not safe to use concurrently with async parsing.
	// make a new instance for each parser if async processing is used.

	let macros;
	let search;
	let anchoredSearch;

	const getSearchPattern = () =>
		[...macros.keys()].map((term) => RegExp.escape(term)).join('|');

	const getSearch = () => (search ??= new RegExp(getSearchPattern()));

	const getAnchoredSearch = () =>
		(anchoredSearch ??= new RegExp(`^(${getSearchPattern()})`));

	return {
		tokenizer: {
			fences(src) {
				macros ??= new Map();
				const code = marked.Tokenizer.prototype.fences.call(this, src);
				if (!code) {
					return undefined;
				}
				const macro = /^md (block|inline)-macro:(.*)$/.exec(code.lang ?? '');
				if (!macro) {
					return code;
				}
				const [, type, id] = macro;
				if (macros.has(id)) {
					throw new Error(`Duplicate macro: ${id}`);
				}
				macros.set(id, {
					tokenFn: () => {
						const tokens = [];
						if (type === 'block') {
							this.lexer.blockTokens(code.text, tokens);
						} else {
							this.lexer.inline(code.text, tokens);
						}
						return tokens;
					},
					block: type === 'block',
				});
				return { type: 'macro-definition', raw: code.raw };
			},
		},
		extensions: [
			{ name: 'macro-definition', level: 'block', renderer: () => '' },
			{
				name: 'macro-term',
				level: 'inline',
				start: (src) => getSearch().exec(src)?.index,
				tokenizer(src) {
					const match = getAnchoredSearch().exec(src);
					if (!match) {
						return undefined;
					}
					const [raw] = match;
					const def = macros.get(raw);
					if (!def) {
						return undefined;
					}
					return {
						type: 'macro-term',
						raw,
						tokens: def.tokenFn(),
						block: def.block,
					};
				},
				renderer({ tokens, block }) {
					return block
						? this.parser.parse(tokens)
						: this.parser.parseInline(tokens);
				},
			},
		],
		walkTokens() {
			macros = null;
			search = null;
			anchoredSearch = null;
		},
	};
};
