export const MARKED_SUPSUB = {
	extensions: [
		{
			name: 'supsub',
			level: 'inline',
			childTokens: ['suptokens', 'subtokens'],
			start: (src) => /\^\^|~/.exec(src)?.index,
			tokenizer(src) {
				const match =
					/^\^\^((?:[^\n\\]|\\.)+?)\^\^(?:~(?!~)((?:[^\n\\]|\\.)+?)(?<!~)~(?!~))?|^~(?!~)((?:[^\n\\]|\\.)+?)(?<!~)~(?!~)(?:\^\^((?:[^\n\\]|\\.)+?)\^\^)?/.exec(
						src,
					);
				if (match) {
					const sup = match[1] ?? match[4];
					const sub = match[3] ?? match[2];
					return {
						type: 'supsub',
						raw: match[0],
						first: match[1] ? 'sup' : 'sub',
						suptokens: sup ? this.lexer.inlineTokens(sup) : [],
						subtokens: sub ? this.lexer.inlineTokens(sub) : [],
					};
				}
				return undefined;
			},
			renderer({ suptokens, subtokens, first }) {
				if (suptokens.length && subtokens.length) {
					if (first === 'sup') {
						return `<span class="supsub"><sup>${this.parser.parseInline(suptokens)}</sup><sub>${this.parser.parseInline(subtokens)}</sub></span>`;
					} else {
						return `<span class="supsub"><sub>${this.parser.parseInline(subtokens)}</sub><sup>${this.parser.parseInline(suptokens)}</sup></span>`;
					}
				} else if (suptokens.length) {
					return `<sup>${this.parser.parseInline(suptokens)}</sup>`;
				} else {
					return `<sub>${this.parser.parseInline(subtokens)}</sub>`;
				}
			},
		},
	],
};
