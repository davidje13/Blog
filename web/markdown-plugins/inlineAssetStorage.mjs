export const MARKED_INLINE_ASSET_STORAGE = (storage) => ({
	walkTokens: (token) => {
		if (token.href?.startsWith('data:')) {
			token.rawHref = token.href;
			token.href = storage(token.href);
		}
	},
});
