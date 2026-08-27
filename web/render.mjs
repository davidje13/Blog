import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from 'lean-qr';
import { toSvgSource } from 'lean-qr/extras/svg';
import { parse as parseYAML } from 'yaml';
import { discoverAllPaths } from './discover.mjs';
import { metadata } from './metadata.mjs';
import { makeMarkdownRenderer } from './markdown.mjs';

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
	year: 'numeric',
	month: 'long',
	day: 'numeric',
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
	weekday: 'long',
	year: 'numeric',
	month: 'long',
	day: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
});

export async function renderPage(env, path, allPaths = null) {
	if (path.length === 1) {
		switch (path[0]) {
			case 'index.html':
				return htmlFrame(
					await renderRoot(env, allPaths ?? (await discoverAllPaths())),
				);
			case 'robots.txt':
				return renderRobots(env);
			case 'feed.rss':
				return renderRSS(env, allPaths ?? (await discoverAllPaths()));
			case 'sitemap.xml':
				return renderSiteMap(env, allPaths ?? (await discoverAllPaths()));
		}
	}

	if (path.length === 2 && path[1] === 'index.html') {
		const page = await renderPost(env, path[0], allPaths, {
			header: true,
			footer: true,
		});
		if (page) {
			return htmlFrame(page);
		}
	}

	if (path.length === 3 && path[0] === 'tagged' && path[2] === 'index.html') {
		const page = await renderTag(
			env,
			path[1],
			allPaths ?? (await discoverAllPaths()),
		);
		if (page) {
			return htmlFrame(page);
		}
	}

	return null;
}

function renderRobots(env) {
	return `Sitemap: ${env.host}/sitemap.xml\n`;
}

async function renderSiteMap(env, allPaths) {
	let r =
		'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
	for (const p of allPaths) {
		if (p.type === 'meta') {
			continue;
		}
		const pathString = `${env.host}${toPath(p.path)}`;
		const priority =
			p.type === 'post' ? '1.0' : p.type === 'tag' ? '0.4' : '0.3';
		const parts = [
			`<loc>${escapeHTML(pathString)}</loc>`,
			`<priority>${escapeHTML(priority)}</priority>`,
		];
		await loadMetadata(p);
		if (p.metadata?.modified) {
			parts.push(
				`<lastmod>${escapeHTML(new Date(p.metadata.modified).toISOString())}</lastmod>`,
			);
		}
		r += `<url>${parts.join('')}</url>`;
	}
	r += '</urlset>';
	return r;
}

async function renderRSS(env, allPaths) {
	const posts = allPaths.filter((p) => p.type === 'post');
	for (const p of posts) {
		await loadMetadata(p);
	}
	posts.sort(postOrder);
	const latestChange = posts[0].metadata.modified;
	const now = new Date();
	let r = [
		'<?xml version="1.0" encoding="UTF-8" ?>',
		'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
		'<channel>',
		`<title>${escapeHTML(metadata.title)}</title>`,
		`<description>${escapeHTML(metadata.description)}</description>`,
		`<link>${escapeHTML(env.host)}</link>`,
		`<atom:link rel="self" href="${escapeHTML(`${env.host}/feed.rss`)}" type="application/rss+xml" />`,
		'<image>',
		`<url>${escapeHTML(`${env.host}/feed-icon.png`)}</url>`,
		`<title>${escapeHTML(metadata.title)}</title>`,
		`<link>${escapeHTML(env.host)}</link>`,
		'<width>64</width>',
		'<height>64</height>',
		'</image>',
		`<language>${escapeHTML(metadata.language)}</language>`,
		`<copyright>${escapeHTML(metadata.copyright)}</copyright>`,
		`<lastBuildDate>${escapeHTML(new Date(latestChange).toUTCString())}</lastBuildDate>`,
		`<pubDate>${escapeHTML(now.toUTCString())}</pubDate>`,
		'<ttl>86400</ttl>',
	].join('');
	for (const post of posts) {
		const pathString = `${env.host}${toPath(post.path)}`;
		const rendered = await renderPost(env, post.path[0], allPaths, {
			absolutePaths: true,
		});
		const tags = [...post.metadata.tags].sort();
		r += [
			'<item>',
			`<title>${escapeHTML(post.metadata.title)}</title>`,
			`<link>${escapeHTML(pathString)}</link>`,
			`<description>${escapeHTML(rendered.html)}</description>`,
			`<guid>${escapeHTML(pathString)}</guid>`,
			post.metadata.author
				? `<author>${escapeHTML(post.metadata.author)}</author>`
				: '',
			`<pubDate>${escapeHTML(new Date(post.metadata.created).toUTCString())}</pubDate>`,
			...tags.map((t) => `<category>${escapeHTML(t)}</category>`),
			'</item>',
		].join('');
		if (r.length > 16 * 1024 * 1024) {
			break;
		}
	}
	r += '</channel></rss>';
	return r;
}

function renderLinkItem(post, { skipTag = null } = {}) {
	const pathString = toPath(post.path);
	let tags = [...post.metadata.tags].sort();
	if (skipTag) {
		tags = tags.filter((t) => t !== skipTag);
	}
	return [
		'<li>',
		`<a href="${escapeHTML(pathString)}">`,
		printDate(post.metadata.created),
		' ',
		`<span class="post-title">${post.metadata.title}</span>`,
		'</a>',
		'<div class="tags">',
		...tags.map(
			(t) =>
				`<a class="tag" href="${escapeHTML(`/tagged/${encodeURIComponent(t)}`)}">${escapeHTML(t)}</a>`,
		),
		'</div>',
		'</li>',
	].join('');
}

async function renderRoot(env, allPaths) {
	const posts = allPaths.filter((p) => p.type === 'post');
	for (const p of posts) {
		await loadMetadata(p);
	}
	posts.sort(postOrder);
	let html = `<header><h1>${escapeHTML(metadata.title)}</h1></header><ul class="posts">`;
	for (const p of posts) {
		html += renderLinkItem(p);
	}
	html += '</ul>';
	html +=
		'<p><a href="/feed.rss" rel="alternate" target="_blank" class="feed">RSS Feed</a></p>';
	return {
		title: metadata.title,
		html,
		headContent: [
			`<meta property="og:title" content="${escapeHTML(metadata.title)}" />`,
			`<meta property="og:type" content="website" />`,
			`<meta property="og:image" content="${escapeHTML(`${env.host}/banner.png`)}" />`,
			`<meta property="og:url" content="${escapeHTML(env.host)}" />`,
			`<meta property="og:locale" content="${escapeHTML(metadata.language.replaceAll('-', '_'))}" />`,
			`<meta name="description" property="og:description" content="${escapeHTML(metadata.description)}" />`,
		],
	};
}

async function renderTag(env, name, allPaths) {
	const tag = allPaths?.find((p) => p.type === 'tag' && p.path[1] === name);
	if (!tag) {
		throw new Error(`unknown tag ${name}`);
	}
	await loadMetadata(tag);

	const posts = allPaths.filter((p) => p.type === 'post');
	for (const p of posts) {
		await loadMetadata(p);
	}
	const taggedPosts = posts.filter((p) => p.metadata.tags.has(name));
	posts.sort(postOrder);
	let html = `<header><h1>${escapeHTML(`Tagged: ${name}`)}</h1></header>`;
	html += await makeMarkdownRenderer().parse(
		(await getMarkdownContent(tag.metadata.fsPath)).md,
		{ async: true },
	);
	html += '<section><ul class="posts">';
	for (const p of taggedPosts) {
		html += renderLinkItem(p, { skipTag: name });
	}
	html += '</ul></section>';
	return {
		title: `Tagged: ${name} \u2014 ${metadata.title}`,
		html,
		headContent: [
			`<meta property="og:title" content="${escapeHTML(`Tagged ${name}`)}" />`,
			`<meta property="og:type" content="website" />`,
			`<meta property="og:image" content="${escapeHTML(`${env.host}/banner.png`)}" />`,
			`<meta property="og:url" content="${escapeHTML(`${env.host}/tagged/${encodeURIComponent(name)}/`)}" />`,
			`<meta property="og:locale" content="${escapeHTML(metadata.language.replaceAll('-', '_'))}" />`,
			`<meta name="description" property="og:description" content="${escapeHTML(`Posts tagged as: ${name}`)}" />`,
			`<meta property="og:site_name" content="${escapeHTML(metadata.title)}" />`,
		],
	};
}

async function renderPost(
	env,
	name,
	allPaths = null,
	{ absolutePaths = false, header = false, footer = false } = {},
) {
	const post = allPaths?.find(
		(p) => p.type === 'post' && p.path[0] === name,
	) ?? {
		path: [name, 'index.html'],
		type: 'post',
	};
	await loadMetadata(post);

	const pageURL = URL.parse(`/${encodeURIComponent(name)}/`, env.host);
	const renderer = makeMarkdownRenderer({
		absolutePathsBase: absolutePaths ? pageURL : null,
	});

	let html = await renderer.parse(
		(await getMarkdownContent(post.metadata.fsPath)).md,
		{ async: true },
	);

	let headerData = '';
	if (post.metadata.author) {
		headerData += `Written by ${escapeHTML(post.metadata.author)}, `;
	}
	headerData += `first published ${printDate(post.metadata.created)}`;
	if (post.metadata.modified > post.metadata.created) {
		headerData += ` (last updated ${printDate(post.metadata.modified)})`;
	}
	const tags = [...post.metadata.tags].sort();

	const title = /<h1([^>]*)>(.*?)<\/h1>/.exec(html);
	const h1HTML = title?.[2] ?? escapeHTML(post.metadata.title);
	let headerContent = '';
	if (header) {
		const qrLink = toSvgSource(generate(pageURL.toString()), {
			xmlDeclaration: true,
			scale: 5,
		});
		headerContent = [
			'<header>',
			`<h1${title?.[1] ?? ''}>${h1HTML}</h1>`,
			`<a href="${escapeHTML(pageURL.toString())}" rel="self" title="Link to this page" class="qr">`,
			`<img src="${escapeHTML(`data:image/svg+xml;base64,${btoa(qrLink)}`)}" alt="QR Code linking to this page" />`,
			'</a>',
			`<p>${headerData}</p>`,
			'<div class="tags">',
			...tags.map(
				(t) =>
					`<a class="tag" href="${escapeHTML(`/tagged/${encodeURIComponent(t)}`)}">${escapeHTML(t)}</a>`,
			),
			'<a class="tag" href="/">all posts</a>',
			'</div>',
			'</header>',
		].join('');
	}
	if (title) {
		html =
			html.substring(0, title.index) +
			headerContent +
			html.substring(title.index + title[0].length);
	} else {
		html = headerContent + html;
	}

	if (footer && post.metadata.author) {
		const range = yearRange(
			new Date(post.metadata.created).getUTCFullYear(),
			new Date(post.metadata.modified).getUTCFullYear(),
		);
		html += `<footer>Article and images &copy;${escapeHTML(`${range} ${post.metadata.author}`)}, all rights reserved.<br />Code samples available under the <a href="https://opensource.org/license/mit" target="_blank" rel="external noopener">MIT license</a>.</footer>`;
	}

	return {
		title: `${post.metadata.title} \u2014 ${metadata.title}`,
		html,
		headContent: [
			`<meta property="og:title" content="${escapeHTML(post.metadata.title)}" />`,
			`<meta property="og:type" content="article" />`,
			`<meta property="og:image" content="${escapeHTML(post.metadata.bannerImage ? `${pageURL}/${post.metadata.bannerImage}` : `${env.host}/banner.png`)}" />`,
			post.metadata.bannerDescription
				? `<meta property="og:image:alt" content="${escapeHTML(post.metadata.bannerDescription)}" />`
				: '',
			`<meta property="og:url" content="${escapeHTML(pageURL.toString())}" />`,
			`<meta property="og:locale" content="${escapeHTML(metadata.language.replaceAll('-', '_'))}" />`,
			post.metadata.description
				? `<meta name="description" property="og:description" content="${escapeHTML(post.metadata.description)}" />`
				: '',
			`<meta property="og:published_time" content="${escapeHTML(new Date(post.metadata.created).toISOString())}" />`,
			post.metadata.modified > post.metadata.created
				? `<meta property="og:modified_time" content="${escapeHTML(new Date(post.metadata.modified).toISOString())}" />`
				: '',
			post.metadata.author
				? `<meta name="author" property="og:author" content="${escapeHTML(post.metadata.author)}" />`
				: '',
			...tags.map(
				(t) => `<meta property="og:tag" content="${escapeHTML(t)}" />`,
			),
			`<meta property="og:site_name" content="${escapeHTML(metadata.title)}" />`,
		],
	};
}

function yearRange(a, b) {
	return a === b ? String(a) : `${a}\u2013${b}`;
}

const SOURCE_DIR = dirname(fileURLToPath(import.meta.url));

async function getMarkdownContent(path) {
	const content = await readFile(path, { encoding: 'utf-8' });
	const yamlFinder = /^(?:\s*\n)?---+\n(.*?\n)?---+(?:$|\n)/gs;
	const rawYaml = yamlFinder.exec(content);
	return rawYaml
		? {
				yaml: parseYAML(rawYaml[1] || '{}', { strict: true }),
				md: content.substring(yamlFinder.lastIndex),
			}
		: { yaml: {}, md: content };
}

async function loadMetadata(p) {
	if (p.metadata) {
		return true;
	}
	let fsPath;
	let name;
	if (p.type === 'post') {
		name = p.path[0];
		fsPath = join(SOURCE_DIR, 'posts', name, 'content.md');
	} else if (p.type === 'tag') {
		name = p.path[1];
		fsPath = join(SOURCE_DIR, 'tags', name, 'content.md');
	} else {
		return false;
	}
	p.metadata = {
		title: name,
		author: '',
		description: '',
		bannerImage: '',
		bannerDescription: '',
		created: 0,
		modified: 0,
		tags: new Set(),
		fsPath,
	};
	const { yaml } = await getMarkdownContent(fsPath);
	for (const prop of [
		'title',
		'author',
		'description',
		'bannerImage',
		'bannerDescription',
	]) {
		if (typeof yaml[prop] === 'string') {
			p.metadata[prop] = yaml[prop];
		}
	}
	if (typeof yaml.created === 'string') {
		p.metadata.created = parseDateFlexible(yaml.created);
	}
	if (typeof yaml.modified === 'string') {
		p.metadata.modified = parseDateFlexible(yaml.modified);
	} else {
		p.metadata.modified = p.metadata.created;
	}
	if (Array.isArray(yaml.tags)) {
		for (const tag of yaml.tags) {
			if (typeof tag === 'string') {
				p.metadata.tags.add(tag);
			}
		}
	}
	return true;
}

const postOrder = (a, b) =>
	b.metadata.modified - a.metadata.modified ||
	(a.metadata.title > b.metadata.title ? 1 : -1);

function printDate(timestamp) {
	const date = new Date(timestamp);
	return `<time datetime="${escapeHTML(date.toISOString().split('T')[0])}">${DATE_FORMATTER.format(date)}</time>`;
}

function printDatetime(timestamp) {
	const date = new Date(timestamp);
	return `<time datetime="${escapeHTML(date.toISOString())}">${DATETIME_FORMATTER.format(date)}</time>`;
}

function htmlFrame({ title, html, headContent }) {
	return [
		'<!DOCTYPE html>',
		'<html lang="en">',
		'<head prefix="og: https://ogp.me/ns#">',
		'<meta charset="utf-8" />',
		`<title>${escapeHTML(title)}</title>`,
		'<link rel="stylesheet" href="/style.css" />',
		'<link rel="icon" href="/favicon.ico" sizes="64x64 32x32 16x16" type="image/x-icon" />',
		'<link rel="icon" href="/feed-icon.png" sizes="64x64" type="image/png" />',
		'<link rel="alternate" type="application/rss+xml" href="/feed.rss" />',
		...headContent,
		'</head>',
		'<body>',
		'<main>',
		html,
		'</main>',
		'</body>',
		'</html>',
	].join('');
}

function parseDateFlexible(d) {
	if (d.includes('T')) {
		return Date.parse(d);
	}
	return Date.parse(d + 'T00:00:00Z');
}

const toPath = (p) =>
	p.at(-1) === 'index.html'
		? p.length === 1
			? '/'
			: '/' +
				p
					.slice(0, p.length - 1)
					.map(encodeURIComponent)
					.join('/') +
				'/'
		: '/' + p.map(encodeURIComponent).join('/');

const escapeHTML = (c) =>
	c
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
