'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useEffect, useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

type ThemeMode = 'dark' | 'light';

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    const currentTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    setTheme(currentTheme);

    const observer = new MutationObserver(() => {
      const nextTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
      setTheme(nextTheme);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="code-block-shell">
      {language ? <div className="code-block-label">{language}</div> : null}
      <SyntaxHighlighter
        language={language}
        style={theme === 'light' ? oneLight : oneDark}
        customStyle={{ margin: 0, borderRadius: 12, fontSize: '0.92rem' }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
