import DOMPurify from 'dompurify';
import { marked, type Tokens } from 'marked';

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
	DOMPurify.sanitize(marked.parse(content, { async: false }) as string);

export const extractMarkdownArtifacts = (content: string) =>
	marked
		.lexer(content)
		.filter(
			(token): token is Tokens.Code =>
				token.type === 'code' && getPreviewType(token.lang) === 'markdown'
		)
		.map((token) => ({ type: 'markdown', content: token.text, raw: token.raw }));
