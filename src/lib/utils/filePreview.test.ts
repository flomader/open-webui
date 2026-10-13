import { beforeEach, describe, expect, it, vi } from 'vitest';
import DOMPurify from 'dompurify';
import {
	extractMarkdownArtifacts,
	getPreviewType,
	isMarkdownFile,
	renderMarkdownPreview
} from './filePreview';

vi.mock('dompurify', () => ({
	default: { sanitize: vi.fn((html: string) => html) }
}));

beforeEach(() => {
	vi.mocked(DOMPurify.sanitize).mockReset();
	vi.mocked(DOMPurify.sanitize).mockImplementation((html) => String(html));
});

describe('Markdown file eligibility', () => {
	it.each([
		['readme.md', ''],
		['README.MD', 'text/plain'],
		['readme.md', 'application/octet-stream'],
		['document', 'text/markdown'],
		['document', 'Text/Markdown; charset=utf-8'],
		['document', 'text/x-markdown'],
		['readme.markdown', ''],
		['readme.mdx', '']
	])('recognizes %s with MIME type %s', (name, mime) => {
		expect(isMarkdownFile(name, mime)).toBe(true);
	});

	it.each([
		['notes.txt', 'text/plain'],
		['page.html', 'text/html'],
		['image.svg', 'image/svg+xml'],
		['readme.md.txt', 'text/plain'],
		['', '']
	])('does not treat %s with MIME type %s as Markdown', (name, mime) => {
		expect(isMarkdownFile(name, mime)).toBe(false);
	});
});

describe('Preview action eligibility', () => {
	it.each([
		['html', 'iframe'],
		['svg', 'svg'],
		['md', 'markdown'],
		['MD', 'markdown'],
		['markdown', 'markdown']
	])('previews %s as %s', (language, type) => {
		expect(getPreviewType(language)).toBe(type);
	});

	it.each(['text', 'txt', 'javascript', ''])('does not preview %s', (language) => {
		expect(getPreviewType(language)).toBeNull();
	});
});

describe('Markdown preview rendering', () => {
	it('renders headings, lists, links, fenced code, and tables', () => {
		const html = renderMarkdownPreview(
			[
				'# Heading',
				'',
				'- First',
				'- Second',
				'',
				'[Link](https://example.com)',
				'',
				'```js',
				'const value = 1;',
				'```',
				'',
				'| Name | Value |',
				'| --- | --- |',
				'| Item | 1 |'
			].join('\n')
		);
		expect(html).toContain('<h1>Heading</h1>');
		expect(html).toContain('<ul>');
		expect(html).toContain('<li>First</li>');
		expect(html).toContain('<a href="https://example.com">Link</a>');
		expect(html).toContain('<code class="language-js">');
		expect(html).toContain('<table>');
		expect(html).toContain('<td>Item</td>');
	});

	describe('Markdown artifact extraction', () => {
		it('keeps nested code fences intact and separate from HTML/SVG artifacts', () => {
			const markdown = '# Heading\n\n```js\nconst value = 1;\n```\n';
			const source = [
				'````MD',
				markdown + '````',
				'',
				'```html',
				'<h1>HTML</h1>',
				'```',
				'',
				'```svg',
				'<svg></svg>',
				'```'
			].join('\n');
			const artifacts = extractMarkdownArtifacts(source);
			expect(artifacts).toHaveLength(1);
			expect(artifacts[0]).toMatchObject({ type: 'markdown', content: markdown.trimEnd() });
			const remaining = source.replace(artifacts[0].raw, '');
			expect(remaining).toContain('```html\n<h1>HTML</h1>\n```');
			expect(remaining).toContain('```svg\n<svg></svg>\n```');
			expect(remaining).not.toContain('const value');
		});

		it('recognizes the markdown alias and multiple artifacts', () => {
			expect(
				extractMarkdownArtifacts('```md\n# One\n```\n\n```markdown\n# Two\n```')
			).toMatchObject([{ content: '# One' }, { content: '# Two' }]);
		});

		it('does not extract ordinary text or other code languages', () => {
			expect(extractMarkdownArtifacts('# Heading\n\n```text\n# Not Markdown\n```')).toEqual([]);
		});
	});

	it('returns only the sanitizer output for untrusted Markdown and embedded HTML', () => {
		vi.mocked(DOMPurify.sanitize).mockReturnValue('<p>Safe content</p>');
		const html = renderMarkdownPreview(
			'<script>alert(1)</script>\n\n[Link](javascript:alert(1))\n\n<img src=x onerror=alert(1)>'
		);
		expect(DOMPurify.sanitize).toHaveBeenCalledOnce();
		expect(DOMPurify.sanitize).toHaveBeenCalledWith(expect.stringContaining('<script>'));
		expect(DOMPurify.sanitize).toHaveBeenCalledWith(expect.stringContaining('javascript:'));
		expect(DOMPurify.sanitize).toHaveBeenCalledWith(expect.stringContaining('onerror='));
		expect(html).toBe('<p>Safe content</p>');
	});

	it('handles an empty Markdown file', () => {
		expect(renderMarkdownPreview('')).toBe('');
		expect(DOMPurify.sanitize).toHaveBeenCalledWith('');
	});
});
