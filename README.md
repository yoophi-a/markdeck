# MarkDeck

MarkDeck is a desktop-first markdown reader and review tool.

MarkDeck은 로컬 markdown 문서를 **편하게 읽고**, 그 문서를 기반으로 **피드백을 만들고 공유**하기 위한 앱입니다.

현재는 다음 두 가지 목표를 중심으로 개발 중입니다.

1. **markdown 문서를 편리하게 본다**
2. **markdown 문서를 기반으로 피드백을 편리하게 생성하고 공유한다**

---

## What MarkDeck does

MarkDeck은 파일 시스템에 있는 markdown 문서를 별도 CMS 없이 그대로 읽고 탐색할 수 있게 해줍니다. 여기에 더해 문서 위에 annotation 계층을 얹어서 highlight, comment, delete mark 같은 피드백을 만들 수 있습니다.

핵심 경험은 크게 두 가지입니다.

- **Reader**: browse / docs / search / wikilink / TOC / desktop reading UX
- **Reviewer**: selection highlight / comment / delete mark / feedback panel / memo sidecar draft

---

## Current status

### Release

- Current tag: **`v1.0.0`**
- Repository: <https://github.com/yoophi-a/MarkDeck>

### Product maturity

#### Reading workflow
이미 충분히 usable 한 수준까지 올라와 있습니다.

- directory browsing
- markdown rendering
- mermaid code block rendering
- full-text search
- TOC / breadcrumb / recent docs
- dark / light theme
- local image / attachment rendering
- relative markdown links
- Obsidian-style WikiLink support
- desktop app packaging baseline

#### Feedback workflow
1차 annotation 기능이 들어가 있습니다.

- selection highlight
- selection comment
- selection strike annotation
- block-level highlight / comment / delete actions
- comment icon / preview popover on annotated blocks
- feedback side panel
- `.memo` sidecar serialization preview

현재 annotation은 **draft + preview 중심**이며, `.memo` 실제 파일 저장/로드는 다음 단계입니다.

---

## Desktop architecture

MarkDeck은 현재 **Electron desktop app + web renderer** 구조를 사용합니다.

방향은 점점 더 아래 구조로 이동 중입니다.

- **main** → 파일 시스템 / search / asset read / desktop integration
- **IPC** → typed contract
- **renderer** → UI / routing / review workflow

현재 desktop main은 1차적으로 hexagonal architecture 방향으로 정리되어 있습니다.

- **core** → 순수 규칙 / 정책
- **application** → 유스케이스 오케스트레이션
- **adapters/electron** → 메뉴 / shell / Electron boundary
- **adapters/node** → config / content / watcher / process access

현재 desktop에서 이미 반영된 것:

- Electron main -> IPC 데이터 흐름
- React Router **HashRouter** 기반 desktop route state
- React Query 기반 desktop async state
- desktop 전용 renderer entry
- single-instance app 보장
- CLI 인자로 디렉토리 / markdown 파일 열기
- recent workspace UX
- desktop fallback UX
- packaging / hardened runtime baseline
- desktop main의 hexagonal architecture 1차 정리
- core / application / adapters 경계 분리
- desktop main 회귀 테스트 기반 확보

자세한 문서:

- [`apps/web/docs/desktop-bootstrap.md`](./apps/web/docs/desktop-bootstrap.md)
- [`docs/desktop-architecture-review.md`](./docs/desktop-architecture-review.md)
- [`docs/platform-boundaries.md`](./docs/platform-boundaries.md)
- [`docs/desktop-cache-strategy.md`](./docs/desktop-cache-strategy.md)
- [`docs/desktop-packaging.md`](./docs/desktop-packaging.md)

---

## Annotation / feedback model

현재 annotation은 다음 개념을 기반으로 합니다.

### Types
- `highlight`
- `comment`
- `deletion`
- `strike`

### Anchors
- `text-range`
- `block`

### Persistence direction
- annotation sidecar file: **`.파일명.memo`**
- diff-like operation format 초안 존재
- 현재는 localStorage draft + serialization preview까지 구현
- 실제 file write/read desktop 연동은 후속 작업

관련 설계 문서:
- [`docs/annotations.md`](./docs/annotations.md)
- [`docs/memo-format.md`](./docs/memo-format.md)

---

## Main features

## Reading
- content root 기반 브라우징
- markdown preview
- 문서 내 heading anchor / TOC
- relative link navigation
- local image / attachment rendering
- Wikilink 지원
- 최근 본 문서 / pinned docs
- search
- desktop file-open flow

## Review / feedback
- 텍스트 선택 후 highlight / comment / strike
- paragraph / heading block 단위 quick actions
- delete mark 시각화
- comment annotation icon / preview popover
- feedback panel에서 annotation 목록 / 필터 / 삭제
- feedback draft text preview
- `.memo` serialization preview

## Desktop UX
- recent folders / workspace reopen
- keyboard shortcut help
- watcher 기반 자동 갱신
- desktop packaging baseline
- single-instance protection
- CLI launch support
  - `MarkDeck <dir>`
  - `MarkDeck <file.md>`

---

## Project structure

```text
markdeck/
  apps/
    web/
      app/
      src/
      docs/
      package.json
    desktop/
      package.json
      main.js
      preload.js
  docs/
  ROADMAP.md
  TODO.md
  IMPROVEMENT.md
  README.md
  pnpm-workspace.yaml
  tsconfig.base.json
```

---

## Testing

현재는 특히 **desktop main 영역에 대한 테스트 기반**이 들어가 있습니다.

주요 테스트 축:
- core 규칙 테스트
- application orchestration 테스트
- adapter mock 기반 테스트
- launch / content root / watcher 흐름 회귀 테스트

실행 예시:

```bash
npm run desktop:test
npm run typecheck
npm run desktop:build:web
```

앞으로의 기본 원칙은 **기능/구조 작업 시 관련 테스트를 함께 추가하고, 테스트 통과까지 확인한 뒤 마무리하는 것**입니다.

---

## Local development

### 1) Install dependencies

```bash
npx pnpm install
```

### 2) Configure web environment (optional)

```bash
cp apps/web/.env.example apps/web/.env.local
```

Example:

```bash
MARKDECK_CONTENT_ROOT=.
MARKDECK_APP_TITLE=MarkDeck
MARKDECK_IGNORE_PATTERNS=.git,node_modules
```

### 3) Run web development server

```bash
npm run dev
```

Open:
- <http://localhost:3000>

### 4) Run desktop app in development

```bash
npm run desktop:dev
```

### 5) Typecheck / build

```bash
npm run typecheck
npm run build
```

### 6) Build packaged desktop app

```bash
npm run desktop:build:web
npm run desktop:pack
# or
npm run desktop:dist
```

`desktop:pack` creates a macOS unpacked app bundle such as:

- `release/desktop/mac-arm64/MarkDeck.app`

---

## CLI launch behavior

Packaged desktop app supports opening a directory or markdown file from CLI.

Examples:

```bash
MarkDeck /path/to/folder
MarkDeck /path/to/file.md
```

Behavior:
- passing a **directory** opens it as the content root
- passing a **markdown file** opens its parent folder as content root and navigates directly to that document
- if MarkDeck is already running, the existing instance receives the target instead of launching a duplicate instance

---

## Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `MARKDECK_CONTENT_ROOT` | No | Default content root for web/local runs. Desktop can also choose folders interactively. |
| `MARKDECK_APP_TITLE` | No | App title shown in the UI |
| `MARKDECK_IGNORE_PATTERNS` | No | Comma-separated names/patterns to hide from browsing, e.g. `.git,node_modules,*.log` |

---

## Security notes

MarkDeck reads local markdown content from the filesystem, so content root scope matters.

Recommended:
- keep content roots intentionally scoped
- avoid exposing sensitive directories
- if serving over network, put the web app behind proper auth/proxy layers
- treat desktop file access as privileged and keep file IO inside Electron main where possible

---

## Roadmap / planning docs

- [`ROADMAP.md`](./ROADMAP.md)
- [`TODO.md`](./TODO.md)
- [`IMPROVEMENT.md`](./IMPROVEMENT.md)

---

## Next likely steps

- actual `.memo` file write / read
- annotation anchor drift recovery
- richer feedback export / sharing flow
- reviewer metadata (author / time / thread)
- translation actions for selected text / blocks

---

## License

No explicit license has been added yet.
