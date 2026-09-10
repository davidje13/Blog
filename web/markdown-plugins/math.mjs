import renderMath from '@webc.site/math';

function wrappedMath(content, block) {
	const html = renderMath(content, block);
	return html
		.replaceAll(
			'<mtd style="text-align:left;padding-left:0"',
			'<mtd class="math-l"',
		)
		.replaceAll(
			'<mtd style="text-align:right;padding-right:0"',
			'<mtd class="math-r"',
		);
}

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
			renderer: (token) =>
				'<div class="hscroll">' + wrappedMath(token.text, true) + '</div>\n',
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
			renderer: (token) => wrappedMath(token.text, false),
		},
	],
};
