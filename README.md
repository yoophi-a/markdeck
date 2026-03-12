# MarkDeck

Markdown browser for `openclaw-workspace`.

MarkDeck은 `openclaw-workspace` 아래의 markdown 문서를 웹에서 탐색하고 읽을 수 있게 해주는 경량 문서 뷰어다.

## Project goals

- 파일 시스템에 있는 markdown 문서를 그대로 콘텐츠 소스로 사용한다.
- 폴더/파일 브라우징을 제공한다.
- markdown 문서를 렌더링한다.
- 문서 안 상대 링크를 따라 다른 문서로 이동할 수 있게 한다.
- 향후 검색, 인증, 최근 문서 기능으로 확장 가능하게 설계한다.

## MVP features

- Directory browsing
- Markdown rendering
- Relative markdown link navigation
- Safe content-root restriction

## Tech stack

- Next.js 15
- React 19
- TypeScript
- react-markdown
- remark-gfm

## Routes

- `/` : landing page
- `/browse` : content root browsing
- `/browse/<path>` : browse subdirectory
- `/docs/<path-to-file.md>` : render markdown document

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open: <http://localhost:3000>

## Environment variables

```bash
MARKDECK_CONTENT_ROOT=/Users/yoophi/openclaw-workspace
MARKDECK_APP_TITLE=MarkDeck
```

## Security note

이 프로젝트는 로컬 파일 시스템 문서를 웹으로 노출한다.

**인증 없이 public 인터넷에 바로 노출하는 것은 권장하지 않는다.**

운영 시 권장:
- reverse proxy 뒤에 배치
- Basic Auth / OAuth / Cloudflare Access / Tailscale 등 적용
- content root를 문서 전용 디렉터리로 제한

## Architecture doc

상세 설계는 아래 문서 참고:

- [`docs/architecture.md`](./docs/architecture.md)

## Current status

초기 MVP 골격이 구현되어 있다.
다음 단계는 실제 실행 검증, UI 다듬기, 검색/인증 추가다.
