import { Marked } from 'marked';
import { MARKED_HIGHLIGHT } from './markdown-plugins/highlight.mjs';
import { MARKED_EXTERNAL_LINK } from './markdown-plugins/externalLink.mjs';
import { MARKED_FOOTNOTE } from './markdown-plugins/footnote.mjs';
import { MARKED_SMART_QUOTES } from './markdown-plugins/smartQuotes.mjs';
import { MARKED_HEADING_IDS } from './markdown-plugins/headingIds.mjs';
import { MARKED_SUP } from './markdown-plugins/sup.mjs';
import { MARKED_ABSOLUTE_PATHS } from './markdown-plugins/absolutePaths.mjs';
import { MARKED_ABBR } from './markdown-plugins/abbr.mjs';
import { MARKED_QR } from './markdown-plugins/qr.mjs';
import { MARKED_MATH } from './markdown-plugins/math.mjs';
import { MARKED_SEQUENCE_DIAGRAM } from './markdown-plugins/sequenceDiagram.mjs';
import { MARKED_IMAGE_CLASS } from './markdown-plugins/imageClass.mjs';

export const makeMarkdownRenderer = ({ absolutePathsBase = null } = {}) =>
	new Marked(
		MARKED_SEQUENCE_DIAGRAM,
		MARKED_HIGHLIGHT,
		MARKED_EXTERNAL_LINK,
		MARKED_MATH,
		MARKED_FOOTNOTE(absolutePathsBase),
		MARKED_ABBR(),
		MARKED_SMART_QUOTES,
		MARKED_HEADING_IDS,
		MARKED_SUP,
		MARKED_QR,
		MARKED_IMAGE_CLASS,
		absolutePathsBase ? MARKED_ABSOLUTE_PATHS(absolutePathsBase) : {},
	);
