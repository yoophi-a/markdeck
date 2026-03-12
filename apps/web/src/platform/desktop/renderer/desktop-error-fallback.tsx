'use client';

import { AlertTriangle, FolderOpen, RefreshCw } from 'lucide-react';

import { useChooseDesktopContentRootMutation } from '@/platform/desktop/renderer/desktop-queries';
import { DesktopApiError } from '@/shared/lib/desktop-contract';
import { Button } from '@/shared/ui/button';

interface DesktopErrorFallbackProps {
  title: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
}

export function DesktopErrorFallback({ title, description, error, onRetry }: DesktopErrorFallbackProps) {
  const chooseRootMutation = useChooseDesktopContentRootMutation();
  const details = describeDesktopError(error, description);

  return (
    <section className="stack">
      <div className="card stack">
        <p className="eyebrow">Desktop</p>
        <h1>{title}</h1>
        <p className="muted">{details.message}</p>
        <div className="document-meta muted mono">
          <span>code: {details.code}</span>
        </div>
        <div className="actions document-actions">
          {onRetry ? (
            <Button type="button" variant="outline" onClick={onRetry}>
              <RefreshCw className="size-4" />
              다시 시도
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => chooseRootMutation.mutate()} disabled={chooseRootMutation.isPending}>
            <FolderOpen className="size-4" />
            Content root 선택
          </Button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4" />
          <strong>안내</strong>
        </div>
        <ul>
          <li>파일이 이동/삭제된 경우 문서 경로를 다시 확인해 주세요.</li>
          <li>권한 문제라면 Finder 또는 터미널에서 해당 폴더 접근 권한을 확인해 주세요.</li>
          <li>renderer 예외라면 다시 시도 후에도 반복되는지 확인해 주세요.</li>
        </ul>
      </div>
    </section>
  );
}

export function DesktopContentRootEmptyState() {
  return (
    <DesktopErrorFallback
      title="content root가 아직 설정되지 않았습니다."
      description="읽을 문서 폴더를 먼저 선택하면 browse / docs / search를 바로 사용할 수 있습니다."
    />
  );
}

function describeDesktopError(error: unknown, fallbackMessage?: string) {
  if (error instanceof DesktopApiError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || fallbackMessage || 'desktop renderer 오류가 발생했습니다.',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: fallbackMessage || 'desktop renderer 오류가 발생했습니다.',
  };
}
