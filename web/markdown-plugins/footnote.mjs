/*
 * Adapted from https://github.com/bent10/marked-extensions/tree/main/packages/footnote
 * with extensive changes. Original license:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2023-2024 Stilearning (https://stilearning.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

export const MARKED_FOOTNOTE = (baseURL = null) => {
	// note: due to the use of global state, this is not safe to use concurrently with async parsing.
	// make a new instance for each parser if async processing is used.

	let globalState;

	return {
		extensions: [
			{
				name: 'footnote-def',
				level: 'block',
				childTokens: ['content'],
				tokenizer(src) {
					globalState ??= {
						unusedEntries: new Map(),
						orderedEntries: new Map(),
						tokens: this.lexer.tokens,
					};

					const match =
						/^\[\^([^\]\n]+)\]:(?:[ \t\n]*|$)([^\n]*(?:\n|$)(?:\n* {4}[^\n]*)*)/.exec(
							src,
						);
					if (!match) {
						return undefined;
					}

					const [raw, label, text = ''] = match;
					let content = text.replaceAll(/^ {4}|^\t/gm, '');

					// add lines after list, blockquote, codefence, and table
					if (/(^|\n)[ \t]*([>\-*] [^\n]*|`{3,}|\|[^\n]+\|)$/.test(content)) {
						content += '\n\n';
					}

					const token = {
						type: 'footnote-def',
						raw,
						name: null, // populated once we know the display order
						id: `footnote-def-${label}`,
						refs: [],
						content: this.lexer.blockTokens(content),
					};
					globalState.unusedEntries.set(label, token);
					return token;
				},
				renderer: () => '',
			},
			{
				name: 'footnote-ref',
				level: 'inline',
				tokenizer(src) {
					const match = /^\[\^([^\]\n]+)\]/.exec(src);
					if (!match) {
						return undefined;
					}

					const [raw, label] = match;
					let footnote = globalState.orderedEntries.get(label);
					if (!footnote) {
						footnote = globalState.unusedEntries.get(label);
						if (!footnote) {
							return;
						}
						footnote.name = String(globalState.orderedEntries.size + 1);
						globalState.unusedEntries.delete(label);
						globalState.orderedEntries.set(label, footnote);
					}

					const ref = {
						type: 'footnote-ref',
						raw,
						id: `footnote-ref-${label}${footnote.refs.length > 0 ? `-${footnote.refs.length + 1}` : ''}`,
						target: footnote,
					};
					footnote.refs.push(ref);
					return ref;
				},
				renderer({ id, target }) {
					let link = `#${encodeURIComponent(target.id)}`;
					if (baseURL) {
						link = URL.parse(link, baseURL).toString();
					}
					const title = `Go to footnote #${target.name}`;

					return `<sup><a id="${escapeHTML(id)}" title="${escapeHTML(title)}" href="${escapeHTML(link)}" aria-label="${escapeHTML(title)}">${escapeHTML(target.name)}</a></sup>`;
				},
			},
			{
				name: 'footnote-section',
				renderer({ entries }) {
					let html = `<section><h2>Footnotes</h2><ol>`;
					for (const { id, content, refs } of entries) {
						const parsedContent = this.parser.parse(content).trim();

						html += `<li id="${encodeURIComponent(id)}">`;
						if (baseURL) {
							html += parsedContent;
						} else {
							let returnLinks = '';
							for (let i = 0; i < refs.length; ++i) {
								let text = '\u21A9\uFE0E';
								let title = 'Back to reference';
								if (refs.length > 1) {
									text += `<sup>${i + 1}</sup>`;
									title += ` #${i + 1}`;
								}
								const link = `#${encodeURIComponent(refs[i].id)}`;
								returnLinks += ` <a href="${escapeHTML(link)}" title="${escapeHTML(title)}" aria-label="${escapeHTML(title)}">${text}</a>`;
							}

							html += parsedContent.replace(
								/(?=(?:<\/p>)?$)/i,
								() => returnLinks,
							);
						}
						html += '</li>';
					}
					html += '</ol></section>';
					return html;
				},
			},
		],
		walkTokens() {
			if (globalState) {
				if (globalState.orderedEntries.size) {
					globalState.tokens.push({
						type: 'footnote-section',
						raw: '',
						entries: [...globalState.orderedEntries.values()],
					});
				}
				globalState = null;
			}
		},
	};
};

const escapeHTML = (c) =>
	c
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
