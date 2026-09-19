export class Random {
	// xorshift+ 64-bit random generator
	// See: https://en.wikipedia.org/wiki/Xorshift

	constructor(s1, s2, s3, s4) {
		this.s = new Uint32Array(4);
		this.s.set([s1, s2, s3, s4]);
	}

	next(range = 0x100000000) {
		let [x0, x1, y0, y1] = this.s;
		this.s[0] = y0;
		this.s[1] = y1;
		x0 ^= (x0 << 23) | (x1 >>> 9);
		x1 ^= x1 << 23;
		this.s[2] = x0 ^ y0 ^ (x0 >>> 17) ^ (y0 >>> 26);
		this.s[3] =
			x1 ^ y1 ^ ((x0 << 15) | (x1 >>> 17)) ^ ((y0 << 6) | (y1 >>> 26));
		return ((this.s[3] + y1) >>> 0) % range;
	}

	nextFloat(range = 1) {
		return (this.next(0x100000000) / 0x100000000) * range;
	}
}
