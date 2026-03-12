'use client';

import { useEffect, useId, useState } from 'react';

interface MermaidBlockProps {
  chart: string;
}

export function MermaidBlock({ chart }: MermaidBlockProps) {
  const reactId = useId();
  const elementId = `mermaid-${reactId.replace(/:/g, '-')}`;
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'default' });
        const result = await mermaid.render(elementId, chart);

        if (!cancelled) {
          setSvg(result.svg);
          setError('');
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(renderError instanceof Error ? renderError.message : 'Failed to render mermaid chart');
          setSvg('');
        }
      }
    }

    void renderChart();

    return () => {
      cancelled = true;
    };
  }, [chart, elementId]);

  if (error) {
    return (
      <div className="mermaid-error">
        <p className="mermaid-error-title">Mermaid 렌더링에 실패했습니다.</p>
        <pre>{error}</pre>
        <pre>{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return <div className="mermaid-loading">Mermaid chart 렌더링 중…</div>;
  }

  return <div className="mermaid-block" dangerouslySetInnerHTML={{ __html: svg }} />;
}
