import Link from 'next/link';
import type { Route } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { MermaidBlock } from '@/components/MermaidBlock';
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
          const resolved = resolveMarkdownLink(currentRelativePath, href);

          if (!resolved || resolved === href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#'))) {
            return <a href={href}>{children}</a>;
          }

          if (href.startsWith('http://') || href.startsWith('https://')) {
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          }

          return <Link href={resolved as Route}>{children}</Link>;
        },
        code: ({ className, children }) => {
          const language = className?.replace('language-', '').trim();

          if (language === 'mermaid') {
            return <MermaidBlock chart={extractCodeText(children).trim()} />;
          }

          return <code className={className}>{children}</code>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
