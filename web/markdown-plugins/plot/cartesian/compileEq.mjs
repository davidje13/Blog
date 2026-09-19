import { Random } from './random.mjs';

const OPERATORS = new Map([
	[
		'+',
		{
			t: 'o',
			p: 2,
			n: 2,
			fn: (a, b) => a + b,
			unary: { t: 'o', p: 11, n: 1, fn: (a) => a },
		},
	],
	[
		'-',
		{
			t: 'o',
			p: 2,
			n: 2,
			fn: (a, b) => a - b,
			unary: { t: 'o', p: 11, n: 1, fn: (a) => -a },
		},
	],
	['*', { t: 'o', p: 3, n: 2, fn: (a, b) => a * b }],
	['/', { t: 'o', p: 3, n: 2, fn: (a, b) => a / b }],
	['//', { t: 'o', p: 3, n: 2, fn: (a, b) => Math.floor(a / b) }],
	['%', { t: 'o', p: 3, n: 2, fn: (a, b) => a % b }],
	['**', { t: 'o', p: 4, rassoc: true, n: 2, fn: (a, b) => Math.pow(a, b) }],
	['^', { t: 'o', p: 4, rassoc: true, n: 2, fn: (a, b) => Math.pow(a, b) }],
	['=', { t: 'o', p: 0, n: 2, fn: (a, b) => a - b, mode: 1, simple: 1 }],
	['>', { t: 'o', p: 0, n: 2, fn: (a, b) => a - b, mode: 2, simple: 1 }],
	['<', { t: 'o', p: 0, n: 2, fn: (a, b) => b - a, mode: 2, simple: -1 }],
	['>=', { t: 'o', p: 0, n: 2, fn: (a, b) => a - b, mode: 3, simple: 1 }],
	['<=', { t: 'o', p: 0, n: 2, fn: (a, b) => b - a, mode: 3, simple: -1 }],
]);
const IMPLICIT_MULT = { t: 'o', p: 10, n: 2, fn: (a, b) => a * b };

const PAREN = {};

const CONSTANTS = new Map([
	['pi', { t: 'c', v: Math.PI }],
	['e', { t: 'c', v: Math.E }],
]);

const FUNCTIONS = new Map([
	['sin', Math.sin],
	['cos', Math.cos],
	['tan', Math.tan],
	['asin', Math.asin],
	['acos', Math.acos],
	['atan', Math.atan],
	['sinh', Math.sinh],
	['cosh', Math.cosh],
	['tanh', Math.tanh],
	['asinh', Math.asinh],
	['acosh', Math.acosh],
	['atanh', Math.atanh],
	['hypot', Math.hypot],
	['exp', Math.exp],
	['ln', Math.log],
	['log2', Math.log2],
	['log10', Math.log10],
	['sqrt', Math.sqrt],
	['cbrt', Math.cbrt],
	['min', Math.min],
	['max', Math.max],
	['abs', Math.abs],
	['round', (v, step = 1) => Math.round(v / step) * step],
	['floor', (v, step = 1) => Math.floor(v / step) * step],
	['ceil', (v, step = 1) => Math.ceil(v / step) * step],
	['trunc', (v, step = 1) => Math.trunc(v / step) * step],
	['fract', (v, step = 1) => v - Math.floor(v / step) * step],
	['sign', Math.sign],
	[
		'clamp',
		(v, b1, b2) =>
			b1 < b2 ? (v < b1 ? b1 : v < b2 ? v : b2) : v < b2 ? b2 : v < b1 ? v : b1,
	],
	['lerp', (v1, v2, p) => v1 * (1 - p) + v2 * p],
	['step', (edge, p) => (p >= edge ? 1 : 0)],
	[
		'smoothstep',
		(edge1, edge2, p) => {
			const t = Math.max(0, Math.min(1, (p - edge1) / (edge2 - edge1)));
			return t * t * (3 - 2 * t);
		},
	],
	[
		'noise',
		(v, m = 0.5, n = 4) => {
			let r = 0;
			for (let i = 0, s = 1, mt = m; i < n; ++i, s *= 2, mt *= m) {
				r += interpolate(PERLIN[i % PERLIN.length], v * s) * mt;
			}
			return r;
		},
	],
]);

const PERLIN = [];
const random = new Random(0x12345678, 0x67894321, 0x19283746, 0x11227654);
for (let i = 0; i < 8; ++i) {
	const noise = [];
	for (let i = 0; i < 512; ++i) {
		noise.push(random.nextFloat(2) - 1);
	}
	PERLIN.push(noise);
}

function interpolate(l, p) {
	const n = l.length;
	p = ((p % n) + n) % n;
	const i = p | 0;
	const v0 = l[i];
	const v1 = l[(i + 1) % n];
	const f = p - i;
	return v0 * (1 - f) + v1 * f;
}

const MATH_TERMS = new Map([
	['sin', ' sine-of '],
	['cos', ' cosine-of '],
	['tan', ' tangent-of '],
	['asin', ' arc-sine-of '],
	['acos', ' arc-cosine-of '],
	['atan', ' arc-tangent-of '],
	['sinh', ' hyperbolic-sine-of '],
	['cosh', ' hyperbolic-cosine-of '],
	['tanh', ' hyperbolic-tangent-of '],
	['asinh', ' arc-hyperbolic-sine-of '],
	['acosh', ' arc-hyperbolic-cosine-of '],
	['atanh', ' arc-hyperbolic-tangent-of '],
	['exp', ' exponentiation-of '],
	['ln', ' natural-logarithm-of '],
	['log2', ' base-2-logarithm-of '],
	['log10', ' base-10-logarithm-of '],
	['sqrt', ' square-root-of '],
	['cbrt', ' cube-root-of '],
	['min', ' minimum-of '],
	['max', ' maximum-of '],
	['abs', ' absolute-value-of '],
	['round', ' round '],
	['floor', ' floor-of '],
	['ceil', ' ceiling-of '],
	['trunc', ' truncation-of '],
	['fract', ' fractional-part-of '],
	['sign', ' sign-of '],
	['noise', ' random-noise-changing-with '],
	['>=', ' greater-or-equal '],
	['<=', ' less-or-equal '],
	['>', ' greater-than '],
	['<', ' less-than '],
	['=', ' equals '],
	['^2', ' squared '],
	['^3', ' cubed '],
	['^', ' to-the-power-of '],
	['**2', ' squared '],
	['**3', ' cubed '],
	['**', ' to-the-power-of '],
	['+', ' plus '],
	['-', ' minus '],
	['*', ' times '],
	['//', ' truncated-divide-by '],
	['/', ' over '],
	['%', ' modulo '],
]);

const MATH_TERM_SEARCH = new RegExp(
	[...MATH_TERMS.keys()].map(RegExp.escape).join('|'),
	'g',
);

export const labelEq = (eq) =>
	eq.replaceAll(MATH_TERM_SEARCH, (v) => MATH_TERMS.get(v) ?? v);

export function compileEq(eq, customFuncs) {
	const opStack = [];
	const normQueue = [];
	let implicitMultiply = false;
	let prevOperator = true;
	const tokeniser =
		/($)|(\s+)|((?:\d+(?:\.\d*)?|\.\d+)(?:e[+\-]?\d+)?)|((?<![a-zA-Z])(?:pi|e)(?![a-zA-Z]))|(\/\/|\*\*|[+\-*/%^]|[<>]=|[<>=])|([a-z]+(?=\())|(,)|(\()|(\))|([a-zA-Z])/gy;
	while (true) {
		const pos = tokeniser.lastIndex;
		const token = tokeniser.exec(eq);
		if (!token) {
			throw new Error(`${eq} at ${pos}: unknown token`);
		}
		const [
			,
			end,
			space,
			number,
			constant,
			operator,
			func,
			comma,
			open,
			close,
			variable,
		] = token;
		if (end !== undefined) {
			break;
		}
		if (space) {
			continue;
		}
		if (number) {
			if (implicitMultiply) {
				opStack.push(IMPLICIT_MULT);
			}
			normQueue.push({ t: 'c', v: Number.parseFloat(number) });
			implicitMultiply = true;
			prevOperator = false;
		} else if (constant) {
			const c = CONSTANTS.get(constant);
			if (c === undefined) {
				throw new Error(`${eq} at ${pos}: unknown constant "${constant}"`);
			}
			if (implicitMultiply) {
				opStack.push(IMPLICIT_MULT);
			}
			normQueue.push(c);
			implicitMultiply = true;
			prevOperator = false;
		} else if (operator) {
			let op = OPERATORS.get(operator);
			if (!op) {
				throw new Error(`${eq} at ${pos}: unknown operator "${operator}"`);
			}
			if (prevOperator) {
				op = op.unary;
				if (!op) {
					throw new Error(`${eq} at ${pos}: operator without argument`);
				}
			}
			while (opStack.length) {
				const prevOp = opStack[opStack.length - 1];
				if (
					prevOp.t !== 'o' ||
					prevOp.p < op.p ||
					(prevOp.p === op.p && op.rassoc)
				) {
					break;
				}
				normQueue.push(opStack.pop());
			}
			opStack.push(op);
			implicitMultiply = false;
			prevOperator = true;
		} else if (func) {
			const fn = FUNCTIONS.get(func) ?? customFuncs?.get(func);
			if (fn) {
				if (implicitMultiply) {
					opStack.push(IMPLICIT_MULT);
				}
				opStack.push({ t: 'f', fn, n: 1 });
				implicitMultiply = false;
			} else {
				for (const v of func) {
					if (implicitMultiply) {
						opStack.push(IMPLICIT_MULT);
					}
					normQueue.push({ t: 'v', v });
					implicitMultiply = true;
				}
			}
			prevOperator = false;
		} else if (comma) {
			while (opStack.length) {
				const prevOp = opStack[opStack.length - 1];
				if (prevOp === PAREN) {
					break;
				}
				normQueue.push(opStack.pop());
			}
			if (opStack[opStack.length - 2]?.t !== 'f') {
				throw new Error(
					`${eq} at ${pos}: comma can only be used in function calls`,
				);
			}
			++opStack[opStack.length - 2].n;
			implicitMultiply = false;
			prevOperator = true;
		} else if (open) {
			if (implicitMultiply) {
				opStack.push(IMPLICIT_MULT);
			}
			opStack.push(PAREN);
			implicitMultiply = false;
			prevOperator = true;
		} else if (close) {
			while (true) {
				const prevOp = opStack.pop();
				if (!prevOp) {
					throw new Error(`${eq} at ${pos}: mismatched parenthesis`);
				}
				if (prevOp === PAREN) {
					if (opStack[opStack.length - 1]?.t === 'f') {
						normQueue.push(opStack.pop());
					}
					break;
				}
				normQueue.push(prevOp);
			}
			implicitMultiply = true;
			prevOperator = false;
		} else if (variable) {
			if (implicitMultiply) {
				opStack.push(IMPLICIT_MULT);
			}
			normQueue.push({ t: 'v', v: variable });
			implicitMultiply = true;
			prevOperator = false;
		} else {
			throw new Error(`internal error: unknown token in ${eq} at ${pos}`);
		}
	}
	while (opStack.length) {
		const prevOp = opStack.pop();
		if (prevOp === PAREN) {
			throw new Error(`${eq}: unclosed parenthesis`);
		}
		normQueue.push(prevOp);
	}
	return normQueue;
}

export function toSimpleInequality(operations, variables) {
	const comparison = operations.at(-1);
	if (!comparison.simple) {
		return null;
	}
	if (operations.at(-2).t === 'v') {
		// fn(x)=y form
		const output = operations.at(-2).v;
		if (
			variables.includes(output) &&
			operations.filter((op) => op.t === 'v' && op.v === output).length === 1
		) {
			return {
				eq: Boolean(comparison.mode & 1),
				ineq: Boolean(comparison.mode & 2) ? -comparison.simple : 0,
				output,
				run: toFunction(operations.slice(0, operations.length - 2)),
			};
		}
	}
	// y=fn(x) form
	if (operations[0].t !== 'v') {
		return null;
	}
	const output = operations[0].v;
	if (!variables.includes(output)) {
		return null;
	}
	// confirm that variable on left is not modified before reaching the comparison
	let stack = 1;
	for (let i = 1; i < operations.length - 1; ++i) {
		const op = operations[i];
		switch (op.t) {
			case 'c':
				break;
			case 'v':
				if (op.v === output) {
					return null;
				}
				break;
			case 'o':
			case 'f':
				stack -= op.n;
				if (!stack) {
					return null;
				}
				break;
		}
		++stack;
	}
	return {
		eq: Boolean(comparison.mode & 1),
		ineq: Boolean(comparison.mode & 2) ? comparison.simple : 0,
		output,
		run: toFunction(operations.slice(1, operations.length - 1)),
	};
}

export function toArbitraryInequality(operations) {
	const comparisons = operations.filter((o) => o.mode);
	if (comparisons.length !== 1) {
		throw new Error('inequality must have exactly one comparison');
	}

	return {
		eq: Boolean(comparisons[0].mode & 1),
		ineq: Boolean(comparisons[0].mode & 2),
		run: toFunction(operations, true),
	};
}

export function toFunction(operations, allowInequality = false) {
	if (!allowInequality && operations.some((o) => o.mode)) {
		throw new Error('function cannot contain inequality');
	}
	return (parameters) => {
		const stack = [];
		for (const op of operations) {
			switch (op.t) {
				case 'c':
					stack.push(op.v);
					break;
				case 'v': {
					const value = parameters.get(op.v);
					if (value === undefined) {
						throw new Error(`unknown variable "${op.v}"`);
					}
					stack.push(value);
					break;
				}
				case 'o':
				case 'f': {
					const params = [];
					for (let i = 0; i < op.n; ++i) {
						params.push(stack.pop());
					}
					params.reverse();
					stack.push(op.fn(...params));
					break;
				}
				default:
					throw new Error(`internal error: unknown op "${op.t}"`);
			}
		}
		if (stack.length !== 1) {
			throw new Error('invalid equation');
		}
		return stack[0];
	};
}
