import { escapeHTML } from './common.mjs';

export const MARKED_ABBR = () => {
	// note: due to the use of global state, this is not safe to use concurrently with async parsing.
	// make a new instance for each parser if async processing is used.

	let abbreviations;
	let search;
	let anchoredSearch;

	const getSearchPattern = () =>
		[...abbreviations.keys()].map((term) => RegExp.escape(term)).join('|');

	const getSearch = () =>
		(search ??= new RegExp(`\\b(${getSearchPattern()})\\b`));

	const getAnchoredSearch = () =>
		(anchoredSearch ??= new RegExp(`^(${getSearchPattern()})\\b`));

	return {
		extensions: [
			{
				name: 'abbr-definition',
				level: 'block',
				tokenizer(src) {
					abbreviations ??= new Map();

					const match =
						/^\*\[([^\]\n]+)\]:([ \t][^\n]*|(?:\n+(?: {4}|\t)[^\n]*)*)/.exec(
							src,
						);
					if (!match) {
						return undefined;
					}

					const [raw, term, definition] = match;

					abbreviations.set(term, definition.trim());
					return { type: 'abbr-definition', raw };
				},
				renderer: () => '',
			},
			{
				name: 'abbr-term',
				level: 'inline',
				start: (src) => getSearch().exec(src)?.index,
				tokenizer(src) {
					const match = getAnchoredSearch().exec(src);
					if (!match) {
						return undefined;
					}

					const [raw] = match;
					const definition = abbreviations.get(raw);
					if (!definition) {
						return undefined;
					}

					return {
						type: 'abbr-term',
						raw,
						tokens: [{ type: 'text', raw, text: raw }],
						definition,
					};
				},
				renderer({ tokens, definition }) {
					return `<abbr title="${escapeHTML(definition)}">${this.parser.parseInline(tokens)}</abbr>`;
				},
			},
		],
		walkTokens() {
			abbreviations = null;
			search = null;
			anchoredSearch = null;
		},
	};
};
