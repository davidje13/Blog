import { escapeHTML } from '../../common.mjs';
import { printText } from '../text.mjs';

export function addLabel(
	target,
	framebounds,
	{
		text,
		position: {
			coord: [x = 0, y = 0] = [],
			anchor: [anchorX = 0.5, anchorY = 0.5] = [],
		} = {},
		align = 'center',
		width = null,
	},
) {
	const mx = 1 / (framebounds.x1 - framebounds.x0);
	const my = 1 / (framebounds.y1 - framebounds.y0);
	const classNames = [
		'label',
		align === 'left' ? 'l' : align === 'right' ? 'r' : 'c',
	];
	const vars = [
		`--x:${((x - framebounds.x0) * mx).toFixed(4)}`,
		`--y:${(1 - (y - framebounds.y0) * my).toFixed(4)}`,
		`--ax:${Number(anchorX).toFixed(4)}`,
		`--ay:${Number(anchorY).toFixed(4)}`,
	];
	if (width) {
		vars.push(`--w:${(width * mx).toFixed(4)}`);
		classNames.push('w');
	}
	target.layers.push({
		html: `<div class="${escapeHTML(classNames.join(' '))}" style="${escapeHTML(vars.join(';'))}">${printText(text)}</div>`,
		order: Number.POSITIVE_INFINITY,
	});
}
