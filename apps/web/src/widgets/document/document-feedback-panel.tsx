'use client';

import { Filter, MessageSquareText, Highlighter, ScissorsLineDashed, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { DocumentAnnotation } from '@/shared/lib/annotations';
import { Button } from '@/shared/ui/button';

interface DocumentFeedbackPanelProps {
  annotations: DocumentAnnotation[];
  onDeleteAnnotation: (annotationId: string) => void;
}

const filterOptions = [
  { value: 'all', label: '전체', icon: Filter },
  { value: 'highlight', label: '하이라이트', icon: Highlighter },
  { value: 'comment', label: '코멘트', icon: MessageSquareText },
  { value: 'strike', label: '취소선', icon: ScissorsLineDashed },
  { value: 'deletion', label: '삭제표시', icon: ScissorsLineDashed },
] as const;

export function DocumentFeedbackPanel({ annotations, onDeleteAnnotation }: DocumentFeedbackPanelProps) {
  const [filter, setFilter] = useState<(typeof filterOptions)[number]['value']>('all');
  const filteredAnnotations = useMemo(() => {
    if (filter === 'all') {
      return annotations;
    }

    return annotations.filter((annotation) => annotation.kind === filter);
  }, [annotations, filter]);

  const shareDraft = useMemo(() => buildShareDraft(filteredAnnotations), [filteredAnnotations]);

  return (
    <div className="stack document-feedback-panel-shell">
      <div className="card stack document-feedback-panel">
        <div className="document-panel-header">
          <div>
            <p className="eyebrow">Feedback</p>
            <h2>annotation panel</h2>
          </div>
          <span className="annotation-count-badge">{annotations.length}</span>
        </div>

        <div className="annotation-filter-row">
          {filterOptions.map(({ value, label, icon: Icon }) => (
            <Button key={value} type="button" variant={filter === value ? 'default' : 'outline'} size="sm" onClick={() => setFilter(value)}>
              <Icon className="size-3.5" />
              {label}
            </Button>
          ))}
        </div>

        <div className="stack annotation-list">
          {filteredAnnotations.length === 0 ? (
            <p className="muted">아직 annotation이 없습니다. preview에서 텍스트를 선택하거나 문단 삭제표시를 추가해 보세요.</p>
          ) : (
            filteredAnnotations.map((annotation) => (
              <div key={annotation.id} className={`annotation-card annotation-${annotation.kind}`}>
                <div className="annotation-card-header">
                  <strong>{annotationLabel(annotation.kind)}</strong>
                  <Button type="button" variant="ghost" size="xs" onClick={() => onDeleteAnnotation(annotation.id)}>
                    제거
                  </Button>
                </div>
                {'quote' in annotation.anchor ? <p className="annotation-quote">“{annotation.anchor.quote}”</p> : null}
                {annotation.kind === 'comment' ? <p>{annotation.comment}</p> : null}
                {annotation.kind === 'deletion' && annotation.reason ? <p>{annotation.reason}</p> : null}
                <p className="muted mono annotation-meta">block: {annotation.anchor.blockId}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card stack document-feedback-panel">
        <div className="document-panel-header">
          <div>
            <p className="eyebrow">Share</p>
            <h2>feedback draft view</h2>
          </div>
          <Share2 className="size-4 text-[var(--muted)]" />
        </div>
        <p className="muted">공유용 summary 초안입니다. 추후 desktop 저장/내보내기 로직이 붙을 자리를 먼저 마련했습니다.</p>
        <pre className="feedback-share-preview">{shareDraft}</pre>
      </div>
    </div>
  );
}

function annotationLabel(kind: DocumentAnnotation['kind']) {
  switch (kind) {
    case 'highlight':
      return '하이라이트';
    case 'comment':
      return '코멘트';
    case 'strike':
      return '취소선';
    case 'deletion':
      return '삭제 표시';
  }
}

function buildShareDraft(annotations: DocumentAnnotation[]) {
  if (annotations.length === 0) {
    return ['# Feedback draft', '', '- 아직 annotation이 없습니다.'].join('\n');
  }

  const lines = ['# Feedback draft', ''];

  annotations.forEach((annotation, index) => {
    lines.push(`${index + 1}. ${annotationLabel(annotation.kind)}`);
    lines.push(`   - block: ${annotation.anchor.blockId}`);
    if ('quote' in annotation.anchor) {
      lines.push(`   - quote: ${annotation.anchor.quote}`);
    }
    if (annotation.kind === 'comment') {
      lines.push(`   - comment: ${annotation.comment}`);
    }
    if (annotation.kind === 'strike') {
      lines.push('   - action: emphasize with strikethrough');
    }
    if (annotation.kind === 'deletion') {
      lines.push('   - action: remove this paragraph/block');
    }
    lines.push('');
  });

  return lines.join('\n').trim();
}
