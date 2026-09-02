import {
	CONTINUE,
	getMime,
	getRemainingPathComponents,
	requestHandler,
	sendEncoded,
} from 'web-listener';
import { renderPage } from './render.mjs';

export default requestHandler(async (req, res) => {
	const path = getRemainingPathComponents(req, {
		rejectPotentiallyUnsafe: false,
	});
	if (path.length && !path.at(-1)) {
		path.pop();
	}
	if (!path.length || !path.at(-1).includes('.')) {
		path.push('index.html');
	}
	const content = await renderPage(
		{ host: `http://${req.headers['host']}`, publish: false },
		path,
	);
	if (!content) {
		return CONTINUE;
	}
	const ext = path.at(-1).split('.')[1] ?? '';
	res.setHeader('content-type', getMime(ext, 'utf-8'));
	return sendEncoded(req, res, content, {
		encodings: ['gzip'],
		encoding: 'utf-8',
	});
});
