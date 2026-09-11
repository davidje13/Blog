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
	['=', { t: 'o', p: 0, n: 2, fn: (a, b) => a - b, mode: 1 }],
	['>', { t: 'o', p: 0, n: 2, fn: (a, b) => a - b, mode: 2 }],
	['<', { t: 'o', p: 0, n: 2, fn: (a, b) => b - a, mode: 2 }],
	['>=', { t: 'o', p: 0, n: 2, fn: (a, b) => a - b, mode: 3 }],
	['<=', { t: 'o', p: 0, n: 2, fn: (a, b) => b - a, mode: 3 }],
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
	['exp', Math.exp],
	['ln', Math.log],
	['sqrt', Math.sqrt],
	['min', Math.min],
	['max', Math.max],
	['abs', Math.abs],
	['round', (v, step = 1) => Math.round(v / step) * step],
	['floor', (v, step = 1) => Math.floor(v / step) * step],
	['ceil', (v, step = 1) => Math.ceil(v / step) * step],
]);

const MATH_TERMS = new Map([
	['sin', ' sine-of '],
	['cos', ' cosine-of '],
	['tan', ' tangent-of '],
	['asin', ' arc-sine-of '],
	['acos', ' arc-cosine-of '],
	['atan', ' arc-tangent-of '],
	['exp', ' exponentiation-of '],
	['ln', ' natural-logarithm-of '],
	['sqrt', ' square-root-of '],
	['min', ' minimum-of '],
	['max', ' maximum-of '],
	['abs', ' absolute-value-of '],
	['round', ' round '],
	['floor', ' floor-of '],
	['ceil', ' ceiling-of '],
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

export function compileEq(eq) {
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
			const fn = FUNCTIONS.get(func);
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

	const comparisons = normQueue.filter((o) => o.mode);
	if (comparisons.length !== 1) {
		throw new Error(`${eq}: must have exactly one comparison`);
	}

	return {
		eq: Boolean(comparisons[0].mode & 1),
		ineq: Boolean(comparisons[0].mode & 2),
		run: (parameters) => {
			const stack = [];
			for (const op of normQueue) {
				switch (op.t) {
					case 'c':
						stack.push(op.v);
						break;
					case 'v': {
						const value = parameters.get(op.v);
						if (value === undefined) {
							throw new Error(`${eq}: unknown variable "${op.v}"`);
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
				throw new Error(`${eq}: invalid equation`);
			}
			return stack[0];
		},
	};
}
