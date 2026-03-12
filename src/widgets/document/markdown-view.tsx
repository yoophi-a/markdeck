import Link from 'next/link';
import type { Route } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { resolveAssetHref, isImageAsset } from '@/shared/lib/assets';
import { resolveMarkdownLink } from '@/shared/lib/content';
import { createSlugger, extractCodeText } from '@/shared/lib/markdown';
import { CodeBlock } from '@/shared/ui/code-block';
import { MarkdownImage } from '@/shared/ui/markdown-image';
import { MermaidBlock } from '@/shared/ui/mermaid-block';

interface MarkdownViewProps {
  content: string;
  currentRelativePath: string;
}

export function MarkdownView({ content, currentRelativePath }: MarkdownViewProps) {
  const createHeadingId = createSlugger();

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href = '', children }) => {
          if (href.startsWith('/docs/') || href.startsWith('/browse/')) {
            return <Link href={href as Route}>{children}</Link>;
          }

          const isSpecialHref = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#');
          const resolvedMarkdown = resolveMarkdownLink(currentRelativePath, href);

          if (!resolvedMarkdown || (resolvedMarkdown === href && isSpecialHref)) {
            return <a href={href}>{children}</a>;
          }

          if (href.startsWith('http://') || href.startsWith('https://')) {
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          }

          if (!href.endsWith('.md')) {
            const assetHref = resolveAssetHref(currentRelativePath, href);
            return (
              <a href={assetHref} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          }

          return <Link href={resolvedMarkdown as Route}>{children}</Link>;
        },
        img: ({ src = '', alt = '' }) => {
          const assetHref = resolveAssetHref(currentRelativePath, src);

          if (!assetHref || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
            return <img src={src} alt={alt} className="markdown-image" />;
          }

          if (!isImageAsset(src)) {
            return (
              <a href={assetHref} target="_blank" rel="noreferrer">
                {alt || src}
              </a>
            );
          }

          return <MarkdownImage src={assetHref} alt={alt} />;
        },
        h1: ({ children }) => <Heading level={1} id={createHeadingId(extractPlainText(children))}>{children}</Heading>,
        h2: ({ children }) => <Heading level={2} id={createHeadingId(extractPlainText(children))}>{children}</Heading>,
        h3: ({ children }) => <Heading level={3} id={createHeadingId(extractPlainText(children))}>{children}</Heading>,
        code: ({ className, children, ...props }) => {
          const language = className?.replace('language-', '').trim();
          const code = extractCodeText(children).replace(/\n$/, '');
          const isInline = !className && !code.includes('\n');

          if (isInline) {
            return <code className={className} {...props}>{children}</code>;
          }

          if (language === 'mermaid') {
            return <MermaidBlock chart={code.trim()} />;
          }

          return <CodeBlock code={code} language={language} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function Heading({ level, id, children }: { level: 1 | 2 | 3; id: string; children: React.ReactNode }) {
  const Tag = `h${level}` as const;

  return (
    <Tag id={id}>
      <a href={`#${id}`} className="heading-anchor">
        <span className="heading-anchor-mark">#</span>
      </a>
      {children}
    </Tag>
  );
}

function extractPlainText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => extractPlainText(child)).join('');
  }

  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: React.ReactNode } }).props;
    return extractPlainText(props?.children ?? '');
  }

  return '';
}
