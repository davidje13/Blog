export const MARKED_FANCY = {
	extensions: [
		{
			name: 'fancy',
			level: 'inline',
			start: (src) => src.indexOf('§'),
			tokenizer(src) {
				const match = /^§([^§]+?)§/.exec(src);
				if (match) {
					return {
						type: 'fancy',
						raw: match[0],
						tokens: this.lexer.inlineTokens(match[1]),
					};
				}
				return undefined;
			},
			renderer({ tokens }) {
				return `<span class="fancy">${this.parser.parseInline(tokens)}</span>`;
			},
		},
	],
};
