export const MARKED_ABSOLUTE_PATHS = (baseURL) => ({
	walkTokens: (token) => {
		if (token.href) {
			token.href = URL.parse(token.href, baseURL).toString();
		}
	},
});
