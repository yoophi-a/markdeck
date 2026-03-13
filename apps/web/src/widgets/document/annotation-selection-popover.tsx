'use client';

import { useEffect, useState } from 'react';

import {
  createAnnotationId,
  createTimestamp,
  type CommentAnnotation,
  type HighlightAnnotation,
  type StrikeAnnotation,
} from '@/shared/lib/annotations';
import { Button } from '@/shared/ui/button';

interface SelectionDraft {
  text: string;
  blockId: string;
  quote: string;
  occurrence: number;
  prefix: string;
  suffix: string;
  rect: { top: number; left: number; right: number; bottom: number; width: number; height: number };
  range: Range;
}

interface AnnotationSelectionPopoverProps {
  selectionDraft: SelectionDraft;
  position: { top: number; left: number; placement: 'top' | 'bottom' };
  onRestoreSelection: () => void;
  onClose: () => void;
  onAddHighlight: (annotation: HighlightAnnotation) => void;
  onAddStrike: (annotation: StrikeAnnotation) => void;
  onAddComment: (annotation: CommentAnnotation) => void;
}

export function AnnotationSelectionPopover({
  selectionDraft,
  position,
  onRestoreSelection,
  onClose,
  onAddHighlight,
  onAddStrike,
  onAddComment,
}: AnnotationSelectionPopoverProps) {
  const [isCommentMode, setIsCommentMode] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');

  useEffect(() => {
    setIsCommentMode(false);
    setCommentDraft('');
  }, [selectionDraft]);

  return (
    <div
      className="annotation-selection-popover"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      data-placement={position.placement}
      onMouseDownCapture={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('textarea, input')) {
          return;
        }

        event.preventDefault();
        onRestoreSelection();
      }}
    >
      <div className="annotation-selection-toolbar">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            onRestoreSelection();
            onAddHighlight({
              id: createAnnotationId(),
              kind: 'highlight',
              color: 'yellow',
              createdAt: createTimestamp(),
              updatedAt: createTimestamp(),
              anchor: {
                kind: 'text-range',
                blockId: selectionDraft.blockId,
                quote: selectionDraft.quote,
                occurrence: selectionDraft.occurrence,
                prefix: selectionDraft.prefix,
                suffix: selectionDraft.suffix,
              },
            });
          }}
        >
          하이라이트
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            onRestoreSelection();
            onAddStrike({
              id: createAnnotationId(),
              kind: 'strike',
              color: 'red',
              createdAt: createTimestamp(),
              updatedAt: createTimestamp(),
              anchor: {
                kind: 'text-range',
                blockId: selectionDraft.blockId,
                quote: selectionDraft.quote,
                occurrence: selectionDraft.occurrence,
                prefix: selectionDraft.prefix,
                suffix: selectionDraft.suffix,
              },
            });
          }}
        >
          취소선
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            onRestoreSelection();
            setIsCommentMode(true);
            setCommentDraft((current) => current || selectionDraft.text);
          }}
        >
          코멘트
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          닫기
        </Button>
      </div>
      {isCommentMode ? (
        <div className="annotation-comment-form">
          <textarea
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            onFocus={onRestoreSelection}
            placeholder="선택한 영역에 대한 코멘트를 적어 주세요"
          />
          <div className="annotation-comment-actions">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onRestoreSelection();
                const trimmed = commentDraft.trim();
                if (!trimmed) {
                  return;
                }

                onAddComment({
                  id: createAnnotationId(),
                  kind: 'comment',
                  color: 'yellow',
                  comment: trimmed,
                  createdAt: createTimestamp(),
                  updatedAt: createTimestamp(),
                  anchor: {
                    kind: 'text-range',
                    blockId: selectionDraft.blockId,
                    quote: selectionDraft.quote,
                    occurrence: selectionDraft.occurrence,
                    prefix: selectionDraft.prefix,
                    suffix: selectionDraft.suffix,
                  },
                });
              }}
            >
              코멘트 저장
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
