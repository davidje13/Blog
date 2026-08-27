import { generate } from 'lean-qr';
import { toSvgSource } from 'lean-qr/extras/svg';

export const MARKED_QR = {
	walkTokens: (token) => {
		if (token.type === 'image' && token.href?.startsWith('qr:')) {
			const content = token.href.substring(3);
			const qrLink = toSvgSource(generate(content), {
				xmlDeclaration: true,
				scale: 5,
				on: '#000000',
				off: '#ffffff',
			});
			token.href = `data:image/svg+xml;base64,${btoa(qrLink)}`;
			token.title ??= content;
		}
	},
};
