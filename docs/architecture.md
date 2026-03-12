# MarkDeck 설계 문서

## 1. 프로젝트 개요

**프로젝트명:** MarkDeck

MarkDeck은 `openclaw-workspace` 아래에 보관된 Markdown 문서를 웹에서 탐색하고 읽을 수 있게 해주는 문서 브라우저다.

핵심 요구사항:
- 파일 브라우징
- 선택한 Markdown 파일 렌더링
- Markdown 문서간 링크 이동

## 2. 목표

### 2.1 사용자 목표
- 로컬에 흩어진 markdown 문서를 브라우저에서 빠르게 찾는다.
- README, 설계 문서, 메모 문서 사이를 링크 기반으로 오가며 읽는다.
- 개발 중인 프로젝트 문서를 외부에서 편하게 조회한다.

### 2.2 제품 목표
- 별도 CMS 없이 파일 시스템을 그대로 콘텐츠 소스로 사용한다.
- 초기 구현은 단순하고 안전하게 시작한다.
- 나중에 인증, 검색, 최근 문서, 즐겨찾기 같은 기능을 확장할 수 있게 한다.

## 3. 범위

### MVP 범위
1. content root 이하 디렉터리 탐색
2. `.md` 파일 렌더링
3. 상대 경로 markdown 링크 해석
4. root 밖 경로 접근 차단
5. 환경변수로 content root 설정

### 이후 확장 후보
- full-text search
- 최근 열람 문서
- 인증/권한 제어
- 코드 하이라이팅
- 이미지/첨부파일 지원
- mdx / wikilink 지원
- git history 기반 최근 변경 문서 보기

## 4. 권장 아키텍처

### 4.1 기술 선택
- **Frontend + Server:** Next.js App Router
- **Renderer:** react-markdown + remark-gfm
- **Data source:** 서버 파일 시스템 (`fs`)
- **Deployment:** VPS / private network / reverse proxy behind auth

선정 이유:
- 파일 시스템 접근이 필요한 서버 로직과 UI를 한 프로젝트에서 같이 관리하기 쉽다.
- SSR 기반으로 첫 화면과 문서 조회가 빠르다.
- 라우팅 구조(`/browse/...`, `/docs/...`)를 만들기 좋다.

## 5. 디렉터리 구조

```text
markdeck/
  app/
    browse/[[...slug]]/page.tsx
    docs/[...slug]/page.tsx
    layout.tsx
    page.tsx
  components/
    BrowserList.tsx
    MarkdownView.tsx
  docs/
    architecture.md
  lib/
    content.ts
    format.ts
  README.md
```

## 6. 라우팅 설계

### 6.1 브라우저
- `/browse`
- `/browse/<path>`

동작:
- 디렉터리 목록 조회
- 폴더와 markdown 파일 구분 표시
- markdown 파일 클릭 시 `/docs/<path>` 이동

### 6.2 문서 뷰어
- `/docs/<path-to-file.md>`

동작:
- 파일 내용을 읽어서 markdown 렌더링
- 상대 경로 링크를 문서/브라우저 링크로 변환

## 7. 링크 해석 규칙

MVP 기준:
- `./other.md` → 현재 문서 기준 상대 경로 계산 후 `/docs/...`로 이동
- `../guide/setup.md` → 상위 디렉터리 기준 계산 후 `/docs/...`로 이동
- `./folder` 또는 `../folder` → `/browse/...`로 이동
- `https://...` → 외부 링크로 유지
- `#section` → 현재 문서 내부 anchor 유지

주의:
- 현재는 일반 markdown 상대 링크 중심이다.
- 옵시디언 스타일 `[[WikiLinks]]`는 후순위다.

## 8. 보안 설계

### 8.1 경로 검증
- 모든 요청 경로는 `content root` 기준으로 resolve 한다.
- `..` 등을 이용해 root 밖으로 나가는 요청은 거부한다.

### 8.2 노출 범위 제한
- 기본적으로 `MARKDECK_CONTENT_ROOT` 아래만 노출한다.
- 숨김 파일(`.` prefix)은 브라우징 목록에서 제외한다.

### 8.3 외부 공개 시 권장사항
**중요:** 이 서비스는 로컬 문서 브라우저이므로, public 배포 시 인증 없이 바로 노출하면 위험하다.

권장:
- Cloudflare Access / Tailscale / Basic Auth / OAuth 중 하나 적용
- reverse proxy 뒤에서 운영
- content root를 workspace 전체가 아닌 문서 전용 디렉터리로 제한

## 9. 성능 전략

MVP에서는 파일 시스템 직접 조회로 충분하다.

문서 수가 많아지면:
- 디렉터리 목록 캐시
- 최근 접근 문서 캐시
- 검색용 별도 인덱스 구축

## 10. 개발 단계 제안

### Phase 1 - MVP
- [x] 프로젝트 초기 구조
- [x] 브라우징
- [x] markdown 렌더링
- [x] 상대 링크 해석
- [ ] 로컬 실행 검증

### Phase 2 - 문서성 강화
- [ ] 코드 하이라이팅
- [ ] breadcrumb 개선
- [ ] 에러 화면 개선
- [ ] 파일 정보(수정 시각, 크기) 표시

### Phase 3 - 운영 기능
- [ ] 검색
- [ ] 인증
- [ ] 최근 문서 / 즐겨찾기
- [ ] GitHub / Git history 연계

## 11. 테스트 전략

### 단위 테스트 대상
- 안전한 경로 해석
- 상대 링크 변환
- 디렉터리/문서 path 매핑

### 수동 테스트 체크리스트
- 루트 브라우징 진입
- 하위 폴더 진입
- markdown 파일 렌더링
- 문서 내 상대 링크 이동
- 존재하지 않는 경로 404 처리
- `../..` 기반 탈출 시도 차단

## 12. 운영 메모

- 개발 환경에서는 `MARKDECK_CONTENT_ROOT=/Users/yoophi/openclaw-workspace` 권장
- 공개 운영 전에는 반드시 인증 계층을 추가하는 것을 권장
- 실사용 시 markdown 외 이미지/첨부 링크 처리 정책을 정해야 한다

## 13. 다음 작업 제안

1. `npm install`
2. `npm run dev`
3. 실제 workspace markdown로 브라우징 테스트
4. 필요 시 검색/인증 우선순위 확정
