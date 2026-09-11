import renderMath from '@webc.site/math';

function wrappedMath(content, block) {
	return renderMath(content, block)
		.replaceAll(/(<(mtd|mrow)\b[^>]*?) style="/g, '$1 class="msty')
		.replaceAll(/(?<=<[^>]+ class="msty[^"]*)text-align:left;?/g, ' l')
		.replaceAll(/(?<=<[^>]+ class="msty[^"]*)text-align:right;?/g, ' r')
		.replaceAll(/(?<=<[^>]+ class="msty[^"]*)padding-left:0;?/g, ' pl')
		.replaceAll(/(?<=<[^>]+ class="msty[^"]*)padding-right:0;?/g, ' pr')
		.replaceAll(
			/(?<=<[^>]+ class="msty[^"]*)display:inline-block;border:1px solid;padding:2px 3px/g,
			' boxed',
		)
		.replaceAll(
			/(?<=<[^>]+ class="msty[^"]*)display:inline-block;background:linear-gradient\(to top right,transparent 47%,currentColor 47%,currentColor 53%,transparent 53%\)/g,
			' cancel',
		)
		.replaceAll(
			/(?<=<[^>]+ class="msty[^"]*)display:inline-block;background:linear-gradient\(transparent 47%,currentColor 47%,currentColor 53%,transparent 53%\)/g,
			' strike',
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
