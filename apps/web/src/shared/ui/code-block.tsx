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
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(currentTheme);

    const observer = new MutationObserver(() => {
      const nextTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      setTheme(nextTheme);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
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
