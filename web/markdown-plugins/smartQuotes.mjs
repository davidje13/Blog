export const MARKED_SMART_QUOTES = {
	tokenizer: {
		inlineText(src) {
			const cap = this.rules.inline.text.exec(src);
			if (!cap) {
				throw new Error('rules.inline.text.exec failed');
			}

			// based on https://github.com/calculuschild/marked-smartypants-lite/blob/main/src/index.js
			const text = cap[0]
				.replaceAll(/(?<!-)---(?!-)/g, '\u2014') // em-dash
				.replaceAll(/(?<!-)--(?!-)/g, '\u2013') // en-dash
				.replaceAll(/(?<=^|[-\u2014/(\[{"\s])'/g, '\u2018') // opening single
				.replaceAll(/'/g, '\u2019') // closing single / apostrophe
				.replaceAll(/(?<=^|[-\u2014/(\[{\u2018\s])"/g, '\u201c') // opening double
				.replaceAll(/"/g, '\u201d') // closing double
				.replaceAll(/(?<!\.)\.\.\.(?!\.)/g, '\u2026'); // ellipsis

			return { type: 'text', raw: cap[0], text };
		},
	},
};
