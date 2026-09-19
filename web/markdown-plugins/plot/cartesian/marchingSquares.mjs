export function marchingSquares({ x0, x1, y0, y1 }, rx, ry, tuning, fn) {
	const paths = [];
	const mx = (x1 - x0) / (rx - 1);
	const my = (y1 - y0) / (ry - 1);
	const vts = [];
	for (let ix = 0; ix < rx; ++ix) {
		vts.push(false);
	}
	const pathTs = [];
	for (let iy = 0; iy < ry; ++iy) {
		const y = iy * my + y0;
		let vl = false;
		let vtl = false;
		let pathL = null;
		for (let ix = 0; ix < rx; ++ix) {
			const x = ix * mx + x0;
			const v = fn(x, y) >= 0;
			const vt = iy ? vts[ix] : v;
			if (!ix) {
				vl = v;
				vtl = vt;
			}
			let pb = null;
			let pr = null;
			if (v !== vl) {
				let d = -0.5 * mx;
				for (let n = 0, s = 0.25 * mx; n < tuning; ++n, s *= 0.5) {
					d += s * (fn(x + d, y) >= 0 === vl ? 1 : -1);
				}
				pb = { x: x + d, y };
			}
			if (v !== vt) {
				let d = -0.5 * my;
				for (let n = 0, s = 0.25 * my; n < tuning; ++n, s *= 0.5) {
					d += s * (fn(x, y + d) >= 0 === vt ? 1 : -1);
				}
				pr = { x, y: y + d };
			}
			if (!ix) {
				if (pr) {
					const edge = 1 - (iy + 1) / ry; // [0, 1)
					const path = {
						p: [pr],
						e: v ? -1 : -2,
						closed: false,
						in: edge,
						out: edge,
					};
					pathL = path;
					v && paths.push(path);
				}
			} else if (!iy) {
				if (pb) {
					const edge = 1 + ix / rx; // [1, 2)
					const path = {
						p: [pb],
						e: vl ? ix : -2,
						closed: false,
						in: edge,
						out: edge,
					};
					pathTs[ix] = path;
					vl && paths.push(path);
				}
			} else {
				const shape = SQUARES_LOOKUP[(vtl << 3) | (vt << 2) | (vl << 1) | v];
				if (shape) {
					let nextL = null;
					let nextT = null;
					for (const seg of shape.p ??
						shape.s[fn(x - mx * 0.5, y - my * 0.5) >= 0 ? 1 : 0]) {
						let path;
						switch (seg[0]) {
							case 't':
								path = pathTs[ix];
								break;
							case 'l':
								path = pathL;
								break;
							case 'r':
								nextL = path = {
									p: [pr],
									e: -2,
									closed: false,
									in: -1,
									out: -1,
								};
								break;
							case 'b':
								nextT = path = {
									p: [pb],
									e: -2,
									closed: false,
									in: -1,
									out: -1,
								};
								break;
						}
						path.e = -2;
						switch (seg[1]) {
							case 't':
							case 'l': {
								const path2 = seg[1] === 't' ? pathTs[ix] : pathL;
								if (path2 === path) {
									paths.push(path);
									path.closed = true;
								} else {
									path.p.push(...path2.p);
									path.e = path2.e;
									path.out = path2.out;
									if (path.e === -1) {
										pathL = path;
									} else if (path.e !== -2) {
										pathTs[path.e] = path;
									}
									if (nextL === path2) {
										nextL = path;
									}
									if (nextT === path2) {
										nextT = path;
									}
								}
								break;
							}
							case 'r':
								path.p.push(pr);
								nextL = path;
								path.e = -1;
								break;
							case 'b':
								path.p.push(pb);
								nextT = path;
								path.e = ix;
								break;
						}
					}
					pathTs[ix] = nextT;
					pathL = nextL;
				}
			}

			vl = v;
			vtl = vt;
			vts[ix] = v;
		}
		if (pathL) {
			const edge = 2 + iy / ry; // [2, 3)
			if (vtl) {
				pathL.in = edge;
				paths.push(pathL);
			} else {
				pathL.e = -2;
				pathL.out = edge;
			}
		}
	}
	for (let ix = 0; ix < rx; ++ix) {
		const path = pathTs[ix];
		if (path) {
			const edge = 4 - (ix + 1) / rx; // [3, 4)
			if (vts[ix]) {
				path.in = edge;
				paths.push(path);
			} else {
				path.e = -2;
				path.out = edge;
			}
		}
	}
	return {
		paths,
		edges: paths.every((path) => path.closed) ? vts[0] : false,
	};
}

const SQUARES_LOOKUP = [
	// tl, tr, bl, br
	null, // 0b0000
	{ p: ['br'] }, // 0b0001
	{ p: ['lb'] }, // 0b0010
	{ p: ['lr'] }, // 0b0011
	{ p: ['rt'] }, // 0b0100
	{ p: ['bt'] }, // 0b0101
	{
		s: [
			['rt', 'lb'],
			['lt', 'rb'],
		],
	}, // 0b0110
	{ p: ['lt'] }, // 0b0111
	{ p: ['tl'] }, // 0b1000
	{
		s: [
			['tl', 'br'],
			['tr', 'bl'],
		],
	}, // 0b1001
	{ p: ['tb'] }, // 0b1010
	{ p: ['tr'] }, // 0b1011
	{ p: ['rl'] }, // 0b1100
	{ p: ['bl'] }, // 0b1101
	{ p: ['rb'] }, // 0b1110
	null, // 0b1111
];
