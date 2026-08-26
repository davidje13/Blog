export const metadata = {
	title: 'David\u2019s Blog',
	description: 'Articles about various tech-related themes',
	copyright: `${yearRange(2026, new Date().getUTCFullYear())} David Evans`,
	language: 'en-GB',
};

function yearRange(a, b) {
	return a === b ? String(a) : `${a}\u2013${b}`;
}
