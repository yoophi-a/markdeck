# MarkDeck Desktop Bootstrap Notes

## 현재 구조

MarkDeck desktop은 아직 **Electron + embedded Next web app** 구조를 사용합니다.

- Electron main이 창을 띄운다.
- 개발 모드에서는 `apps/web` Next dev server를 띄운다.
- 패키징 모드에서는 standalone Next server를 띄운다.
- renderer UI는 Next app이 담당한다.
- 문서 데이터(search / browse / docs / asset)는 점진적으로 Electron main IPC로 이동 중이다.

즉, **UI bootstrap은 아직 웹서버에 기대고 있지만, 콘텐츠 데이터는 main → IPC → renderer 경계로 옮기는 중**이다.

## 지금까지 옮긴 범위

desktop renderer는 아래 항목을 Electron main IPC로 읽는다.

- search 결과
- browse directory entries
- docs markdown document + sidebar tree + known documents
- image / attachment asset payload

web 환경은 기존 서버 경로를 유지한다.

## 왜 웹서버가 아직 남아 있나

현재 renderer는 Next App Router 기반 UI를 그대로 사용한다.
그래서 아래 bootstrap 책임은 아직 Next server가 맡는다.

- route resolution (`/browse/...`, `/docs/...`, `/search`)
- React/Next hydration boot
- static assets and app bundle serving
- App Router layout composition

즉, 데이터를 IPC로 옮겨도 **renderer 앱 자체를 띄우는 진입점**은 아직 Next runtime이다.

## 남아 있는 한계

1. desktop에서도 앱 첫 진입은 web URL 로드에 의존한다.
2. Next server가 죽으면 renderer bootstrap도 같이 흔들린다.
3. desktop 전용 preload / IPC 구조와 Next route bootstrap이 이중 구조처럼 공존한다.
4. desktop 전용 에러/로딩 제어가 web bootstrap 제약을 받는다.

## 단계적 제거 전략

### Phase A — data plane 정리
완료/진행 중.

- main이 콘텐츠 데이터 공급
- renderer는 desktop data access layer로만 접근
- web server fallback을 UI 내부에서 최소화

### Phase B — renderer bootstrap 분리
부분 적용.

- desktop 전용 renderer entry를 `/desktop` page + HashRouter 기반 client shell로 분리했다.
- Electron은 `/desktop#/` 진입점을 로드하고, desktop renderer의 browse / docs / search route state는 client-side hash route가 담당한다.
- web 홈(`/`)은 web 전용 landing / Next route bootstrap으로 유지된다.
- 문서 데이터는 기존처럼 Electron main IPC를 사용하고, embedded Next server는 bootstrap 및 web 호환성을 위해 유지한다.
- Next App Router 기반 web route는 그대로 남겨 두어 web/desktop이 공존한다.

### Phase C — embedded server dependency 축소
장기 단계.

선택지:
- Next를 빌드 산출물/정적 shell 중심으로 축소
- 또는 desktop 전용 renderer를 별도 번들로 분리
- 라우팅은 client-side + IPC data source 중심으로 재구성

핵심은 **Electron main이 데이터뿐 아니라 앱 bootstrap 계약도 더 많이 소유**하게 만드는 것이다.

## 당장 권장하는 원칙

1. desktop에서 새 데이터 기능은 가능하면 main IPC부터 추가한다.
2. renderer UI는 desktop data access layer를 통해서만 desktop 데이터를 읽는다.
3. desktop의 비동기 조회 상태는 React Query query key 기준으로 정리해 loading/error/cache 재사용을 맞춘다.
4. Next server path는 web compatibility 용도로만 유지한다.
5. desktop 기능 구현 시 "server route를 먼저 만들고 desktop에서 재사용" 패턴을 더 늘리지 않는다.
