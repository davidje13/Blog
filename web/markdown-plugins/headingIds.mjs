import { escapeHTML } from './common.mjs';

export const MARKED_HEADING_IDS = (baseURL = null) => {
	let allHeadings = null;

	const process = (parser, headings) => {
		const seen = new Map();
		const accum = (id) => seen.set(id, (seen.get(id) ?? 0) + 1);
		const scope = [];
		if (headings[0].depth === 1) {
			const h = headings.shift();
			h.html = parser.parseInline(h.tokens);
		}
		for (const h of headings) {
			h.html = parser.parseInline(h.tokens);
			h.plain = h.html.replaceAll(/<[^>]*>/g, '');
			let slug =
				h.plain
					.toLowerCase()
					.normalize('NFKD')
					.replaceAll(/[\u0300-\u036f]/g, '')
					.replaceAll(/[^a-z0-9]+/g, '-')
					.replaceAll(/^-|-$/g, '') || 'section';
			scope[h.depth - 1] = slug;
			scope.length = h.depth;
			h.slugOptions = [slug];
			accum(slug);
			for (let p = h.depth - 1; p-- > 0;) {
				if (scope[p]) {
					slug = `${scope[p]}-${slug}`;
					h.slugOptions.push(slug);
					accum(slug);
				}
			}
		}
		for (const h of headings) {
			for (const slug of h.slugOptions) {
				if (seen.get(slug) < 2) {
					h.slug = slug;
					break;
				}
			}
			if (!h.slug) {
				let slug = h.slugOptions.at(-1);
				for (let n = 2; ; ++n) {
					const attempt = `${slug}-${n}`;
					if (!seen.has(attempt)) {
						h.slug = attempt;
						break;
					}
				}
			}
		}
	};

	return {
		walkTokens(token) {
			if (token.type === 'heading') {
				allHeadings ??= [];
				allHeadings.push(token);
			}
		},
		renderer: {
			heading(h) {
				if (allHeadings) {
					process(this.parser, allHeadings);
					allHeadings = null;
				}
				const { depth, slug, html, plain } = h;
				if (baseURL || !slug) {
					return `<h${depth}>${html}</h${depth}>\n`;
				}
				return `<h${depth} class="heading" id="${escapeHTML(slug)}" aria-label="${escapeHTML(plain)}"><span>${html}</span><a class="anchorlink" href="${escapeHTML(`#${encodeURIComponent(slug)}`)}" aria-label="Link to section: ${escapeHTML(plain)}"></a></h${depth}>\n`;
			},
		},
	};
};
