export const MARKED_SMART_QUOTES = () => {
	let previous = '';

	return {
		walkTokens(token) {
			switch (token.type) {
				case 'text':
					// originally based on https://github.com/calculuschild/marked-smartypants-lite/blob/main/src/index.js
					if (/["']/.test(token.text)) {
						token.text = (previous + token.text)
							.replaceAll(/(?<=^|[-\u2014/(\[{"\s])'/g, '\u2018') // opening single
							.replaceAll(/'/g, '\u2019') // closing single / apostrophe
							.replaceAll(/(?<=^|[-\u2014/(\[{\u2018\s])"/g, '\u201c') // opening double
							.replaceAll(/"/g, '\u201d') // closing double
							.substring(previous.length);
					}
					if (token.text) {
						token.text = token.text
							.replaceAll(/(?<!-)---(?!-)/g, '\u2014') // em-dash
							.replaceAll(/(?<!-)--(?!-)/g, '\u2013') // en-dash
							.replaceAll(/(?<!\.)\.\.\.(?!\.)/g, '\u2026'); // ellipsis;
						previous = token.text[token.text.length - 1];
					}
					break;
				case 'heading':
				case 'lheading':
				case 'paragraph':
				case 'space':
				case 'code':
				case 'fences':
				case 'br':
				case 'hr':
				case 'blockquote':
				case 'list':
				case 'html':
				case 'def':
				case 'table':
					previous = '';
					break;
				case 'image':
				case 'codespan':
					previous = 'x';
					break;
				default:
					if (token.isBlock) {
						previous = 'x';
					}
			}
		},
	};
};
