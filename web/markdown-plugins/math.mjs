import renderMath from '@webc.site/math';

export const MARKED_MATH = {
	extensions: [
		{
			name: 'math-block',
			level: 'block',
			tokenizer: (str) => {
				const match = /^\$\$\n((?:[^\\$]|\\.)+)\n\$\$(?:\n|$)/.exec(str);
				if (!match) {
					return undefined;
				}
				const [raw, content] = match;
				return {
					type: 'math-block',
					isBlock: true,
					raw: raw,
					text: content.trim(),
				};
			},
			renderer: (token) => renderMath(token.text, true) + '\n',
		},
		{
			name: 'math-inline',
			level: 'inline',
			start: (str) => str.indexOf('$'),
			tokenizer: (str) => {
				const match = /^\$(?!\$)((?:[^\\\n$]|\\[^\n])*)\$/.exec(str);
				if (!match) {
					return undefined;
				}
				const [raw, content] = match;
				return { type: 'math-inline', raw: raw, text: content.trim() };
			},
			renderer: (token) => renderMath(token.text, false),
		},
	],
};
