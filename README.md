# MarkDeck

Browse and read markdown documents in `openclaw-workspace` through a simple web UI.

MarkDeck은 `openclaw-workspace` 아래에 보관된 Markdown 파일을 웹에서 탐색하고 읽을 수 있게 해주는 파일시스템 기반 문서 브라우저입니다. 별도 CMS 없이 로컬/서버 디렉터리를 그대로 콘텐츠 소스로 사용하고, 문서 안의 상대 링크를 따라 다른 문서로 이동할 수 있습니다.

## Why MarkDeck?

workspace 안에는 보통 이런 문서들이 쌓입니다.

- 프로젝트 README
- 설계 문서
- 작업 메모
- 운영 문서
- 회고 / 실험 기록

MarkDeck은 이런 markdown 자산을 **파일 브라우징 + 문서 렌더링 + 링크 이동** 중심으로 빠르게 읽을 수 있게 만드는 것을 목표로 합니다.

## Project goals

- 파일 시스템에 있는 markdown 문서를 그대로 콘텐츠 소스로 사용한다.
- 디렉터리/파일 브라우징을 제공한다.
- markdown 문서를 서버에서 읽어 HTML로 렌더링한다.
- 문서 안 상대 경로 링크를 다른 문서/폴더 화면으로 연결한다.
- content root 바깥 경로 접근을 차단한다.
- 이후 검색, 인증, 최근 문서, 즐겨찾기 같은 기능으로 확장 가능하게 유지한다.

## Current MVP scope

현재 구현 범위는 아래와 같습니다.

- directory browsing
- markdown rendering
- mermaid code block rendering
- full-text search by file path / title / body
- recent documents list (browser localStorage)
- heading-based table of contents (TOC)
- Obsidian-style WikiLink support (`[[Note]]`, `[[path/to/note]]`)
- local relative image rendering and attachment links
- relative markdown link navigation
- hidden file filtering
- configurable ignore patterns
- dark / light theme toggle
- safe content-root restriction
- custom content root via environment variable

## Screens / routes

- `/`
  - 랜딩 페이지
  - 프로젝트 소개와 content root 표시
- `/browse`
  - content root 최상위 브라우징
- `/browse/<path>`
  - 하위 디렉터리 브라우징
- `/search?q=...`
  - 파일명 / 제목 / 본문 기반 markdown 검색
- `/docs/<path-to-file.md>`
  - markdown 문서 렌더링
  - 최근 본 문서 표시
  - heading 기반 TOC 표시

## Link behavior

MarkDeck은 일반적인 markdown 상대 링크를 기준으로 동작합니다.

그리고 브라우징 목록에서는 ignore pattern에 매칭되는 항목(예: `.git`, `node_modules`)을 숨길 수 있습니다.

예시:

- `./README.md` → 현재 폴더 기준 다른 문서로 이동
- `../docs/guide.md` → 상위 폴더 기준 문서로 이동
- `./some-folder` → 해당 폴더 브라우저로 이동
- `./images/diagram.png` → 현재 문서 기준 로컬 이미지로 렌더링
- `./files/spec.pdf` → 현재 문서 기준 첨부 링크로 열기
- `https://example.com` → 외부 링크로 유지
- `#section` → 현재 문서 내부 anchor 유지
- `[[WikiLink]]` → 같은 workspace 안의 markdown 문서 링크로 해석
- `[[folder/note]]` → 경로 기반 wiki link 지원
- 찾지 못한 WikiLink → plain text로 렌더링
- ```` ```mermaid ```` 코드블록 → 브라우저에서 다이어그램으로 렌더링

## Tech stack

- Next.js 15
- React 19
- TypeScript
- react-markdown
- remark-gfm

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
  pnpm-workspace.yaml
  tsconfig.base.json
  README.md
```

## Local development

### 1) Configure environment

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```bash
MARKDECK_CONTENT_ROOT=/Users/yoophi/openclaw-workspace
MARKDECK_APP_TITLE=MarkDeck
MARKDECK_IGNORE_PATTERNS=.git,node_modules
```

### 2) Install dependencies

```bash
npx pnpm install
```

### 3) Run web dev server

```bash
npm run dev
```

Open:

- <http://localhost:3000>

### 4) Production build check

```bash
npm run typecheck
npm run build
npm start
```

웹 앱은 `apps/web`에 위치하고, 루트 스크립트는 workspace를 통해 `@markdeck/web`를 실행합니다.

### 5) Run desktop app in development

```bash
npm run desktop:dev
```

Electron desktop 앱은 개발 모드에서 `apps/web`의 Next.js 서버를 자동으로 띄운 뒤, 해당 URL을 로드합니다.

## Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `MARKDECK_CONTENT_ROOT` | Yes | Markdown files will be exposed only under this directory |
| `MARKDECK_APP_TITLE` | No | App title shown in the UI |
| `MARKDECK_IGNORE_PATTERNS` | No | Comma-separated names/patterns to hide from browsing, e.g. `.git,node_modules,*.log` |

## Security notes

이 프로젝트는 로컬 파일 시스템 문서를 웹에 노출합니다.

그래서 아래 원칙이 중요합니다.

### 반드시 신경 써야 하는 점

- `MARKDECK_CONTENT_ROOT`를 너무 넓게 잡지 않는 것이 좋습니다.
- 민감한 문서가 섞인 디렉터리를 그대로 공개하면 안 됩니다.
- 공개 인터넷에 열 경우 인증 계층 없이 바로 노출하는 것은 권장하지 않습니다.

### 운영 시 권장

- reverse proxy 뒤에 배치
- Basic Auth / OAuth / Cloudflare Access / Tailscale 적용
- 문서 전용 디렉터리만 content root로 사용
- 내부망 또는 사설 접근 환경 우선 고려

## Architecture

상세 설계 문서는 아래에 있습니다.

- [`apps/web/docs/architecture.md`](./apps/web/docs/architecture.md)

주요 설계 포인트:

- 파일 시스템을 단일 source of truth로 사용
- 서버 측 경로 검증으로 root escape 방지
- 브라우징(`/browse`)과 문서 뷰(`/docs`) 라우트를 분리
- 링크 해석을 앱 라우팅과 연결

## Current status

현재 프로젝트는 **초기 MVP 구현과 빌드 검증이 완료된 상태**입니다.

이미 구현된 것:

- 프로젝트 초기 스캐폴딩
- 브라우저 화면
- markdown 문서 렌더링
- 문서 간 상대 링크 이동
- Next.js 빌드/타입 검증 통과

## Next steps

추천 다음 작업:

1. 코드 블록 syntax highlighting 추가
2. breadcrumb / navigation 개선
3. 최근 본 문서 목록 추가
4. full-text search 추가
5. 인증 계층 추가
6. 이미지/첨부파일 링크 처리 정책 정리
7. Obsidian-style wikilink 지원 검토

## Repository

- GitHub: <https://github.com/yoophi-a/markdeck>

## License

현재는 라이선스를 별도로 지정하지 않았습니다. 필요하면 다음 커밋에서 추가하면 됩니다.
