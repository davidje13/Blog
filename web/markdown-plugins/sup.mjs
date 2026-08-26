export const MARKED_SUP = {
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
