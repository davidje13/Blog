import dict from 'dictionary-en-gb';
import nspell from 'nspell';

const names = `
Berners
Diffie
Haar
Lempel
Lim
O'Reilly
Ziv
`.trim();

const brands = `
ARM64
bitmask
Brotli
Cloudflare
EC2
EEPROM
emscripten
GIFs
GitLab/GitHub
Gmail
Golang
gzip
gzipped
Hotmail
IEC
JSON
macOS
Macromedia
MD5
MDN
nginx
Node.js
Notepad
NPM
OpenSSL
PNG
PNGs
Reddit
Route53
SHA1
SHA256
SVG
UTF-16BE
UTF-16LE
UTF-32BE
UTF-32LE
UTF-8
Wayback
Wi-Fi/WiFi
win32
X11
x86
XP
ZIP64
zlib
Zstd
`.trim();

const protocols = `
DNS
HTTPS
IPv4
IPv6
SFTP
SSL
`.trim();

const extensions = `
.co
.com
.css
.gz
.htm
.html
.js
.json
.mjs
.uk
.zip
`.trim();

const personalAdd = `
animatable
anonymise
antialiased
APIs
AR
artifact/artefact
auth
Authorization
autocomplete
backend/participant
backport/port
balancer
beamforming
chamfer/round
chatbot/participant
CLI
config
CPUs
dæmon/demon
deconvolution/convolution
decrypt/encrypt
deduplicate/duplicate
detections
dev
e.g
echolocating
embedder
encodings
exfiltrate/escape
exfiltration
explainer
filesystem
flexbox
formatter/participant
frameset/participant
frontend/participant
GPUs
grayscale
hostname/filename
i.e
idempotency
iframe/participant
ing
injective
integrations
ish
keychain
laggy
latencies
linearise
lockdown/participant
logarithmically
manpage/participant
milli
minification
misconfiguration/configuration
mitigations
mockup/participant
monospace
naïve/naive
natively
opacities
pre
precompute/compute
preflight
preload
premultiplied
programmatically
prolate
proxying
quintillion
rebalancing
recompress/compress
reconnection/connection
recursing
rotationally
runtimes
sandbox/box
scrollbar
semitransparency
spectrogram/cryptogram
sRGB
subfolder/folder
TODO
tokeniser
UI
unassign
unblurred
unboundedly
uncomment
unencrypt/encrypt
unspoofable
untrusted
unvetted
uptime
useable/usable
useage/usage
UX
verifier
VR
whitepaper/newspaper
whitespace
zag
zig
`.trim();

const personalRemove = `
demon
naive
usable
usage
WiFi
`.trim();

export const MARKED_SPELLING = (fileRelativePath, performCheck) => {
	const checker = nspell(dict)
		.personal(names)
		.personal(brands)
		.personal(protocols)
		.personal(extensions)
		.personal(personalAdd);
	for (const word in personalRemove.split('\n')) {
		checker.remove(word);
	}
	const seen = new Set();

	function checkSpelling(
		token,
		content,
		matcher = /([\p{L}\p{M}\p{N}\p{Cs}\-.\u2019]+)/gu,
	) {
		if (!content) {
			return;
		}
		content = content
			.replaceAll(/https?:\/\/[^ ]+/g, ' ')
			.replaceAll(/&([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);/g, ' ');
		while (true) {
			const match = matcher.exec(content);
			if (!match) {
				break;
			}
			const word = match[1]
				.replace(/^[\-.]+/, '')
				.replaceAll(/\u2019/g, "'")
				.replace(/('s?)?[\-.]*$/, '');
			if (word.length < 2 || /^\d+|^0x/.test(word) || seen.has(word)) {
				continue;
			}
			seen.add(word);
			if (checker.correct(word)) {
				continue;
			}
			const parts = word.split(/(?<=[a-z])(?=[A-Z])|\-+|(?=\.)/g);
			if (parts.length > 1) {
				for (const part of parts) {
					if (!part || /^\.?\d+$/.test(part) || seen.has(part)) {
						continue;
					}
					seen.add(part);
					if (checker.correct(part)) {
						continue;
					}
					if (part[0] === '.' && checker.correct(part.substring(1))) {
						continue;
					}
					process.stderr.write(
						`${fileRelativePath}: unknown word part ${JSON.stringify(part)} in ${JSON.stringify(word)} (suggestions: ${checker.suggest(part).join(' / ') || '???'})\n  context: ...${esc(content.substring(match.index - 20, matcher.lastIndex + 20))}...\n`,
					);
				}
			} else {
				process.stderr.write(
					`${fileRelativePath}: unknown word ${JSON.stringify(word)} (suggestions: ${checker.suggest(word).join(' / ') || '???'})\n  context: ...${esc(content.substring(match.index - 20, matcher.lastIndex + 20))}...\n`,
				);
			}
		}
	}

	return {
		extensions: [
			{
				name: 'personal-dictionary',
				level: 'block',
				tokenizer(src) {
					const match = /^\+\[([^\]\n]+)\](\n|$)/.exec(src);
					if (!match) {
						return undefined;
					}

					const [raw, words] = match;
					if (performCheck) {
						for (const word of words.split(';')) {
							checker.personal(word.trim());
						}
					}
					return { type: 'personal-dictionary', raw };
				},
				renderer: () => {},
			},
		],
		walkTokens(token) {
			if (!performCheck) {
				return;
			}
			switch (token.type) {
				case 'text':
					if (!token.tokens && !token.abbr) {
						checkSpelling(token, token.text);
					}
					break;
				case 'image':
					if (!token.className?.includes('sequence-diagram')) {
						checkSpelling(token, token.text);
					}
					break;
				case 'link':
					checkSpelling(token, token.title);
					break;
				case 'abbr-term':
					checkSpelling(token, token.definition);
					break;
				case 'plot':
					checkSpelling(token, token.title);
					break;
				case 'math-block':
				case 'math-inline':
					checkSpelling(token, token.text, /\\\\text\{([^}]+)\}/g);
					break;
				case 'code':
				case 'fences':
				case 'codespan':
					// TODO: check variable names, strings
					break;
				case 'html':
					// TODO: check non-tag parts
					break;
			}
		},
	};
};

const esc = (s) => {
	const q = JSON.stringify(s);
	return q.substring(1, q.length - 1);
};
