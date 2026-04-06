'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useEffect, useMemo, useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

type ThemeMode = 'dark' | 'light';

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const syntaxTheme = useMemo(() => stripThemeBackgrounds(theme === 'light' ? oneLight : oneDark), [theme]);

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
    <div className={`code-block-shell${language ? ' has-label' : ''}`}>
      {language ? <div className="code-block-label">{language}</div> : null}
      <SyntaxHighlighter
        language={language}
        style={syntaxTheme}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.92rem', background: 'transparent', padding: 0 }}
        codeTagProps={{ style: { background: 'transparent' } }}
        wrapLines
        lineProps={{ style: { background: 'transparent' } }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function stripThemeBackgrounds(themeStyle: Record<string, React.CSSProperties>) {
  return Object.fromEntries(
    Object.entries(themeStyle).map(([selector, style]) => [
      selector,
      {
        ...style,
        background: 'transparent',
        backgroundColor: 'transparent',
      },
    ])
  );
}
