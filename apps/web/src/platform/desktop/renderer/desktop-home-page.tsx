'use client';

import { useDesktopContentRootQuery, useDesktopRecentContentRootsQuery, useOpenDesktopRecentContentRootMutation } from '@/platform/desktop/renderer/desktop-queries';
import { DesktopContentRootEmptyState } from '@/platform/desktop/renderer/desktop-error-fallback';
import { PinnedDocuments } from '@/widgets/document/pinned-documents';
import { RecentDocuments } from '@/widgets/document/recent-documents';
import { SessionResumeCard } from '@/widgets/navigation/session-resume-card';

export function DesktopHomePage() {
  const contentRootQuery = useDesktopContentRootQuery(true);
  const recentRootsQuery = useDesktopRecentContentRootsQuery(true);
  const openRecentMutation = useOpenDesktopRecentContentRootMutation();
  const contentRoot = contentRootQuery.data ?? null;
  const recentRoots = (recentRootsQuery.data ?? []).filter((item) => item !== contentRoot);

  if (!contentRootQuery.isLoading && !contentRoot) {
    return <DesktopContentRootEmptyState />;
  }

  return (
    <section className="stack">
      <div className="hero-card">
        <p className="eyebrow">Desktop</p>
        <h1>MarkDeck</h1>
        <p>desktop renderer는 web bootstrap 위에 얹히되, renderer 초기화/라우팅/데이터 조회는 desktop 전용 계층으로 분리되어 있습니다.</p>
      </div>

      <div className="grid two-up">
        <article className="card">
          <h2>핵심 기능</h2>
          <ul>
            <li>desktop 전용 shell + hash route bootstrap</li>
            <li>browse / docs / search client-side route 전환</li>
            <li>Electron main IPC + watcher 기반 content refresh</li>
            <li>recent folder / command palette / native menu 연결</li>
          </ul>
        </article>

        <article className="card">
          <h2>현재 설정</h2>
          <p>
            <strong>content root</strong>
          </p>
          <code>{contentRoot ?? '불러오는 중…'}</code>
          <p className="muted">ignore patterns: .git, node_modules</p>
        </article>
      </div>

      {contentRoot ? <SessionResumeCard contentRootKey={contentRoot} /> : null}

      <div className="grid two-up">
        <article className="card stack">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>최근 연 폴더</h2>
            <p className="muted">이전에 열었던 content root를 바로 다시 열 수 있습니다.</p>
          </div>
          {recentRoots.length > 0 ? (
            <ul className="workspace-root-list">
              {recentRoots.map((root) => (
                <li key={root} className="workspace-root-item">
                  <button type="button" className="workspace-root-button" onClick={() => openRecentMutation.mutate(root)} disabled={openRecentMutation.isPending}>
                    <span className="mono workspace-root-path">{root}</span>
                    <span className="muted">다시 열기</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">아직 최근 폴더가 없습니다.</p>
          )}
        </article>

        <article className="card stack">
          <div>
            <p className="eyebrow">Keyboard</p>
            <h2>빠른 명령</h2>
            <p className="muted">native menu와 command palette로 주요 작업을 바로 실행할 수 있습니다.</p>
          </div>
          <ul className="shortcut-list muted mono">
            <li>⌘/Ctrl + O → 폴더 열기</li>
            <li>⌘/Ctrl + K → 검색 포커스</li>
            <li>⌘/Ctrl + ⇧ + P → command palette</li>
            <li>⌘/Ctrl + ⇧ + L → 테마 전환</li>
            <li>⌥ + ←/→ → 뒤로 / 앞으로</li>
          </ul>
        </article>
      </div>

      <PinnedDocuments />
      <RecentDocuments />
    </section>
  );
}
