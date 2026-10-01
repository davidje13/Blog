import { penTool } from 'curve-ops';

export const toLimited = (v, sf) =>
	v
		.toPrecision(sf)
		.replace(/\.0+(?=$|e)|(?<=\.\d+?)0+(?=$|e)/, '')
		.replace(/e\+/, 'e');

export const ptSVGFloating = (pt, precision) =>
	`${toLimited(pt.x, precision)} ${toLimited(pt.y, precision)}`;

export function simplifiedSVGPath(points, error, precision) {
	if (!error) {
		return `M${points.map((p) => ptSVGFloating(p, precision)).join('L')}`;
	}
	let d = '';
	const pen = penTool(
		(pt) => (d += `M${ptSVGFloating(pt, precision)}`),
		(seg) =>
			(d += `C${ptSVGFloating(seg.c1, precision)} ${ptSVGFloating(seg.c2, precision)} ${ptSVGFloating(seg.p3, precision)}`),
		() => {},
		() => {},
		() => {},
		0,
		100,
		error,
		error,
	);
	const trace = pen(points[0]);
	for (let i = 1; i < points.length - 1; ++i) {
		trace.move(points[i]);
	}
	trace.move(points.at(-1), true);
	return d;
}
