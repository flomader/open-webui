import DOMPurify from 'dompurify';
import { Marked } from 'marked';

const markdown = new Marked({ breaks: true });

export const isMarkdownFile = (name = '', contentType = '') =>
	/\.(md|markdown|mdx)$/i.test(name) ||
	['text/markdown', 'text/x-markdown'].includes(contentType.split(';')[0].trim().toLowerCase());

export const getPreviewType = (language = '') => {
	switch (language.toLowerCase()) {
		case 'html':
			return 'iframe';
		case 'svg':
			return 'svg';
		case 'md':
		case 'markdown':
			return 'markdown';
		default:
			return null;
	}
};

export const renderMarkdownPreview = (content: string) =>
	DOMPurify.sanitize(markdown.parse(content, { async: false }) as string);

export const extractMarkdownArtifacts = (content: string) => {
	const artifacts: { type: string; content: string; raw: string }[] = [];
	markdown.walkTokens(markdown.lexer(content), (token) => {
		if (token.type === 'code' && getPreviewType(token.lang) === 'markdown') {
			artifacts.push({ type: 'markdown', content: token.text, raw: token.raw });
		}
	});
	return artifacts;
};

export const stripMarkdownArtifacts = (
	content: string,
	artifacts: ReturnType<typeof extractMarkdownArtifacts>
) =>
	artifacts.reduce((text, artifact) => {
		const pattern = artifact.raw
			.trimEnd()
			.split('\n')
			.map((line) => line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
			.join('\\r?\\n[ \\t>]*');
		return text.replace(new RegExp(pattern), '');
	}, content);
