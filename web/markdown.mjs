import { Marked } from 'marked';
import { MARKED_HIGHLIGHT } from './markdown-plugins/highlight.mjs';
import { MARKED_EXTERNAL_LINK } from './markdown-plugins/externalLink.mjs';
import { MARKED_FOOTNOTE } from './markdown-plugins/footnote.mjs';
import { MARKED_SMART_QUOTES } from './markdown-plugins/smartQuotes.mjs';
import { MARKED_HEADING_IDS } from './markdown-plugins/headingIds.mjs';
import { MARKED_SUP } from './markdown-plugins/sup.mjs';
import { MARKED_ABSOLUTE_PATHS } from './markdown-plugins/absolutePaths.mjs';
import { MARKED_ABBR } from './markdown-plugins/abbr.mjs';

export const makeMarkdownRenderer = ({ absolutePathsBase = null } = {}) =>
	new Marked(
		MARKED_HIGHLIGHT,
		MARKED_EXTERNAL_LINK,
		MARKED_FOOTNOTE(absolutePathsBase),
		MARKED_ABBR(),
		MARKED_SMART_QUOTES,
		MARKED_HEADING_IDS,
		MARKED_SUP,
		absolutePathsBase ? MARKED_ABSOLUTE_PATHS(absolutePathsBase) : {},
	);
