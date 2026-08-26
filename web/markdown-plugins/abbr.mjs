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

					abbreviations.set(term, definition);
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

					return { type: 'abbr-term', raw, definition };
				},
				renderer: ({ raw, definition }) =>
					`<abbr title="${escapeHTML(definition)}">${escapeHTML(raw)}</abbr>`,
			},
		],
		walkTokens() {
			abbreviations = null;
			search = null;
			anchoredSearch = null;
		},
	};
};

const escapeHTML = (c) =>
	c
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
