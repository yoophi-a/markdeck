import Link from 'next/link';
import type { Route } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { CodeBlock } from '@/components/CodeBlock';
import { MarkdownImage } from '@/components/MarkdownImage';
import { MermaidBlock } from '@/components/MermaidBlock';
import { resolveAssetHref, isImageAsset } from '@/lib/assets';
import { resolveMarkdownLink } from '@/lib/content';
import { extractCodeText } from '@/lib/markdown';

interface MarkdownViewProps {
  content: string;
  currentRelativePath: string;
}

export function MarkdownView({ content, currentRelativePath }: MarkdownViewProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href = '', children }) => {
          const resolvedMarkdown = resolveMarkdownLink(currentRelativePath, href);

          if (!resolvedMarkdown || resolvedMarkdown === href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#'))) {
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
