# MarkDeck shadcn component usage

## 기준

- `apps/desktop/components.json` 기준으로 shadcn alias는 `@/shared/ui`를 사용한다.
- 현재 프로젝트는 전통적인 Radix 조합이 아니라 `base-nova` 스타일 + `@base-ui/react` 기반 shadcn 컴포넌트를 사용한다.
- 아래 목록은 `apps/desktop/src/renderer/src/shared/ui`에 있는 공통 UI 중, 실제 화면에서 import 되어 사용 중인 항목만 정리했다.
- `AppLink`, `CodeBlock`, `DesktopAsset*`, `MarkdownImage`, `MermaidBlock`는 shadcn 원본 컴포넌트라기보다 프로젝트 전용 래퍼이므로 별도 구분했다.

## 1. shadcn 기반 공통 컴포넌트

| 컴포넌트 | 기반 | 주 용도 | 대표 사용처 |
| --- | --- | --- | --- |
| `Button` | `@base-ui/react/button` | 주요 액션, 보조 액션, 토글, 필터, 아이콘 버튼 | `apps/desktop/src/renderer/src/widgets/layout/app-header.tsx`, `apps/desktop/src/renderer/src/features/search/ui/search-form.tsx`, `apps/desktop/src/renderer/src/widgets/document/document-tree.tsx`, `apps/desktop/src/renderer/src/widgets/document/document-feedback-panel.tsx` |
| `Card` | shadcn card 패턴 | 정보 블록, 사이드 패널, 다이얼로그 컨테이너 | `apps/desktop/src/renderer/src/widgets/document/recent-documents.tsx`, `apps/desktop/src/renderer/src/widgets/document/pinned-documents.tsx`, `apps/desktop/src/renderer/src/widgets/document/table-of-contents.tsx`, `apps/desktop/src/renderer/src/widgets/navigation/session-resume-card.tsx` |
| `Input` | `@base-ui/react/input` | 검색 입력 | `apps/desktop/src/renderer/src/features/search/ui/search-form.tsx` |
| `ScrollArea` | `@base-ui/react/scroll-area` | 긴 목록/패널의 내부 스크롤 | `apps/desktop/src/renderer/src/widgets/document/document-tree.tsx`, `apps/desktop/src/renderer/src/widgets/document/recent-documents.tsx`, `apps/desktop/src/renderer/src/widgets/document/pinned-documents.tsx`, `apps/desktop/src/renderer/src/widgets/document/table-of-contents.tsx` |
| `Separator` | `@base-ui/react/separator` | 헤더 액션 그룹 시각 분리 | `apps/desktop/src/renderer/src/widgets/layout/app-header.tsx` |

## 2. 용도별 정리

### 탐색 및 전역 헤더

- `Button`
  - 검색 실행 버튼
  - desktop command palette 실행 버튼
  - theme toggle 버튼
  - content root 선택 버튼
- `Separator`
  - 헤더 우측 액션 그룹과 내비게이션 링크 구분

관련 파일:

- `apps/desktop/src/renderer/src/widgets/layout/app-header.tsx`
- `apps/desktop/src/renderer/src/features/search/ui/search-form.tsx`
- `apps/desktop/src/renderer/src/features/theme/ui/theme-toggle.tsx`
- `apps/desktop/src/renderer/src/widgets/layout/content-root-selector.tsx`

### 문서 탐색 패널

- `Card`
  - 파일 트리, 최근 문서, 즐겨찾기, 목차를 각각 독립된 패널로 감싼다.
- `ScrollArea`
  - 문서 목록과 목차가 길어질 때 패널 높이를 고정한 채 내부 스크롤을 제공한다.
- `Button`
  - 트리 노드 expand/collapse
  - 즐겨찾기 pin/unpin

관련 파일:

- `apps/desktop/src/renderer/src/widgets/document/document-tree.tsx`
- `apps/desktop/src/renderer/src/widgets/document/recent-documents.tsx`
- `apps/desktop/src/renderer/src/widgets/document/pinned-documents.tsx`
- `apps/desktop/src/renderer/src/widgets/document/table-of-contents.tsx`

### 문서 피드백 및 편집 보조

- `Button`
  - annotation 필터 전환
  - annotation 삭제
  - markdown block 액션 실행
- `Card`
  - desktop shortcut help 모달 컨테이너
  - session resume 카드

관련 파일:

- `apps/desktop/src/renderer/src/widgets/document/document-feedback-panel.tsx`
- `apps/desktop/src/renderer/src/widgets/document/markdown-view.tsx`
- `apps/desktop/src/renderer/src/widgets/desktop/shortcut-help/ui/desktop-shortcut-help.tsx`
- `apps/desktop/src/renderer/src/widgets/navigation/session-resume-card.tsx`

### 검색

- `Input`
  - 현재 검색 UI에서 유일한 입력 컴포넌트다.
- `Button`
  - 검색 submit 액션을 담당한다.

관련 파일:

- `apps/desktop/src/renderer/src/features/search/ui/search-form.tsx`

## 3. 프로젝트 전용 래퍼 컴포넌트

이 항목들은 `@/shared/ui`에 있지만 shadcn 원형보다 앱 특화 책임이 더 크다.

| 컴포넌트 | 역할 | 대표 사용처 |
| --- | --- | --- |
| `AppLink`, `AppAnchorLink` | Next.js / React Router / desktop hash 라우팅을 공통화 | 헤더, 브레드크럼, 문서 목록, markdown 링크 |
| `CodeBlock` | markdown 코드 하이라이팅 + 테마 연동 | `apps/desktop/src/renderer/src/widgets/document/markdown-view.tsx` |
| `DesktopAssetLink`, `DesktopAssetImage` | desktop renderer에서 바이너리 asset object URL 처리 | `apps/desktop/src/renderer/src/widgets/document/markdown-view.tsx`, `apps/desktop/src/renderer/src/shared/ui/markdown-image.tsx` |
| `MarkdownImage` | markdown 이미지 경로 해석 래퍼 | `apps/desktop/src/renderer/src/widgets/document/markdown-view.tsx` |
| `MermaidBlock` | mermaid 다이어그램 렌더링 | `apps/desktop/src/renderer/src/widgets/document/markdown-view.tsx` |

## 4. 운영 관점 정리

- 유지보수 우선순위가 높은 shadcn 컴포넌트는 `Button`, `Card`, `ScrollArea`다.
  - 실제 화면 노출 범위가 가장 넓고, 레이아웃/상호작용 품질에 직접 영향을 준다.
- `Input`과 `Separator`는 사용 범위가 좁아서 변경 영향도는 상대적으로 작다.
- 신규 shadcn 컴포넌트를 도입할 때는 우선 `@/shared/ui` 아래에 두고, 화면별 스타일 커스터마이징은 widget 단에서 처리하는 현재 구조를 유지하는 편이 맞다.
- `AppLink` 계열은 shadcn이 아니지만 내비게이션 추상화의 핵심이므로, 링크성 UI를 추가할 때 `a`/`Link`를 직접 쓰기보다 이 계층을 우선 재사용하는 것이 안전하다.
