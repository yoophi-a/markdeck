# Split View Editor + Preview Plan

## Goal

MarkDeck에 **editor + preview split view**를 도입해서, markdown 원문 편집과 렌더링 결과 확인을 한 화면에서 자연스럽게 오갈 수 있도록 하는 계획 문서입니다.

현재 MarkDeck은 desktop-first markdown reader/review tool 방향이 강하고, annotation / feedback workflow가 중요한 제품입니다. 따라서 split view는 단순 편집기 추가가 아니라, 이후 annotation, suggested edit, source mapping, memo persistence와 연결될 수 있는 형태로 설계하는 것이 중요합니다.

---

## Why this matters

split view는 단순히 "왼쪽 editor, 오른쪽 preview" UI를 추가하는 기능이 아닙니다. 아래 목적과 연결됩니다.

- 원문 markdown을 보면서 결과를 즉시 확인
- annotation이나 feedback이 실제 source에 어떻게 대응하는지 시각적으로 이해
- source-based edit suggestion과 preview 결과를 함께 검토
- markdown reader 중심 앱에서 editor-assisted review tool로 확장

즉, 이 작업은 MarkDeck을 "reader/reviewer"에서 "lightweight editor + reviewer"로 확장하는 핵심 변화가 될 수 있습니다.

---

## Product assumptions

우선 다음 가정을 기준으로 계획합니다.

- full IDE 수준 편집기보다는 markdown-focused editor를 지향한다
- 초기 버전은 local file editing 중심이다
- split view는 desktop 환경에서만 우선 지원한다
- annotation / review 기능과 충돌하지 않도록 모드를 분리하거나 점진적으로 통합한다
- source of truth는 markdown 원문 파일이다

---

## Scope options

### Option A. Read-only preview + editable source pane

- 왼쪽: markdown source editor
- 오른쪽: rendered preview
- source edit 시 preview가 debounce 후 갱신

장점:

- 구현이 비교적 단순함
- source mapping 구조와 잘 맞음
- 초기 버전으로 적합함

단점:

- preview에서 직접 수정하는 경험은 없음
- annotation과 editor interaction conflict 조정이 필요함

### Option B. Editable source + interactive preview

- source pane 편집 가능
- preview pane에서도 annotation, block action, selection 가능
- 양쪽이 동기화됨

장점:

- MarkDeck 방향성과 가장 잘 맞음
- review workflow와 편집 workflow를 한 화면에 결합 가능

단점:

- 상태 복잡도 급상승
- selection mapping, focus, dirty state 관리가 어려움

### Recommendation

초기 구현은 **Option A**로 시작하고, 구조는 나중에 Option B로 확장 가능하게 잡는 것이 좋습니다.

---

## UX decisions to make

다음 질문을 먼저 정리해야 합니다.

### 1. Split view는 어떤 화면에서 열리는가?

후보:

- document page 내부 토글
- 별도 editor route
- command palette 액션으로 진입

권장:

- 기존 document page 안에서 **view mode toggle**로 여는 방식
- 예: `read`, `split`, `source`

이 방식이 현재 desktop reader 구조를 가장 덜 흔듭니다.

### 2. Source pane은 어떤 수준의 editor인가?

초기 권장 범위:

- plain textarea 또는 가벼운 code editor
- line number 지원
- dirty state 표시
- save / revert / reload 제공

추후 후보:

- CodeMirror
- Monaco

초기에는 과도한 editor 도입보다, source mapping과 preview sync를 먼저 안정화하는 편이 좋습니다.

### 3. 저장은 언제 일어나는가?

후보:

- manual save only
- auto-save with debounce
- hybrid

권장:

- 초기에는 **manual save**
- unsaved changes 명확히 표시
- external file change 감지 시 conflict UX 제공

이유:

- annotation, watcher, reload 흐름과 충돌을 줄일 수 있음
- desktop app에서는 저장 시점이 명확한 편이 안전함

---

## Architecture implications

split view는 단순 UI 작업이 아니라 아래 아키텍처 변경을 동반합니다.

### 1. Renderer state model 확장

추가로 필요할 상태 예시:

```ts
type DocumentViewMode = 'read' | 'split' | 'source'

type EditorSessionState = {
  documentPath: string
  originalMarkdown: string
  workingMarkdown: string
  isDirty: boolean
  lastSavedAt?: number
}
```

여기에 추가로:

- preview refresh status
- save status
- external change detected 여부
- source selection / preview focus state

등이 붙을 수 있습니다.

### 2. Main process capabilities 확장

현재 reader 중심 main runtime에 아래 기능이 더 필요해질 가능성이 큽니다.

- markdown file raw read API
- markdown file save API
- file changed externally 감지 이벤트
- save conflict detection
- optional backup/recovery strategy

즉 desktop main IPC contract도 확장해야 합니다.

### 3. Source-render mapping 기반 필요성 증가

이미 정리한 `markdown-source-render-mapping.md`와 직접 연결됩니다.

split view가 들어오면 아래 기능 요구가 생깁니다.

- source line ↔ preview block 매핑
- editor cursor ↔ preview scroll sync
- preview selection ↔ source highlight
- annotation anchor ↔ source region 표시

따라서 split view는 source mapping 설계를 밀어주는 기능입니다.

---

## Suggested implementation phases

## Phase 1. Basic split layout

목표:

- document page에서 split mode 진입 가능
- source pane + preview pane 나란히 표시
- source 변경 시 preview 재렌더링

세부 작업:

- [ ] document page에 view mode 상태 추가
- [ ] split layout component 추가
- [ ] source pane 기본 editor 추가
- [ ] working markdown state 도입
- [ ] debounce preview refresh 연결

완료 기준:

- markdown 문서를 열었을 때 split view 토글 가능
- source 수정 결과가 preview에 반영됨
- 아직 저장하지 않아도 preview는 working state를 반영함

---

## Phase 2. Save/reload workflow

목표:

- desktop app에서 실제 markdown file 저장 가능
- dirty state와 저장 상태를 명확히 보여줌

세부 작업:

- [ ] renderer -> main save API 추가
- [ ] save action / shortcut 추가
- [ ] unsaved changes 표시
- [ ] revert to file action 추가
- [ ] external file change 감지 UX 정의

완료 기준:

- 수정 후 저장 가능
- 저장 성공/실패가 명확히 보임
- 외부 변경 시 안전한 재로드 흐름이 있음

---

## Phase 3. Editor-preview synchronization

목표:

- source와 preview의 대응 관계를 시각적으로 강화

세부 작업:

- [ ] source block ↔ preview block mapping 도입
- [ ] preview click 시 source 관련 위치로 이동
- [ ] source cursor 위치에 따른 preview 하이라이트 검토
- [ ] preview selection anchor를 source 기준으로 계산할 준비

완료 기준:

- 최소 block 수준 동기화가 동작
- 향후 annotation/edit mapping 작업의 기반이 생김

---

## Phase 4. Annotation integration

목표:

- split view에서 annotation과 편집 workflow 공존

세부 작업:

- [ ] split mode에서 annotation 허용 범위 정의
- [ ] source dirty 상태와 annotation anchor invalidation 정책 정의
- [ ] annotation panel이 source 변경을 어떻게 반영할지 설계
- [ ] orphan annotation / stale anchor UX 정리

완료 기준:

- split view가 annotation 흐름과 충돌하지 않음
- 적어도 unsupported case가 명확히 정의됨

---

## Key design risks

### 1. Dirty state vs annotation state 충돌

source를 편집하는 순간 기존 preview anchor가 흔들릴 수 있습니다.

대응 필요:

- working state 기준 preview 재생성
- saved state 기준 annotation persistence 분리
- dirty 중 annotation 허용 정책 정의

### 2. External file change conflict

desktop app이므로 다른 에디터가 같은 파일을 수정할 수 있습니다.

대응 필요:

- watcher 기반 외부 변경 감지
- reload / keep mine / compare later 같은 UX 검토

### 3. Editor choice overkill

처음부터 Monaco 같은 무거운 편집기를 넣으면 구현 비용이 빠르게 커집니다.

권장:

- 초기에는 lightweight editor
- source mapping과 save/reload 플로우를 먼저 안정화

### 4. Performance on large documents

큰 markdown 문서를 split view로 실시간 렌더링하면 비용이 커질 수 있습니다.

대응 필요:

- debounce refresh
- expensive render section profiling
- mermaid/code block 처리 비용 측정

---

## Suggested technical direction

초기 구현 기준 추천:

- layout: existing desktop document page 내부 확장
- editor: lightweight controlled editor from renderer state
- save: main process IPC write API
- sync: block-level source mapping first
- preview refresh: debounced working markdown render

이후 확장 기준:

- richer code editor 도입
- text-level source mapping
- preview interaction과 source selection 양방향 sync
- suggested edit UX

---

## Definition of done for first meaningful release

첫 번째 의미 있는 split view 릴리즈는 아래 정도를 기준으로 볼 수 있습니다.

- 사용자가 markdown 문서를 split view로 열 수 있다
- 왼쪽 source 수정이 오른쪽 preview에 반영된다
- dirty state가 보인다
- save / revert / reload 흐름이 있다
- 외부 파일 변경에 대한 최소한의 안전 장치가 있다
- 기존 read-only workflow를 깨지 않는다

---

## Recommended next step

바로 구현에 들어간다면 첫 작업은 아래 순서를 추천합니다.

1. document page에 `read | split | source` view mode 도입
2. source pane용 editor state 추가
3. working markdown 기반 preview 렌더링 연결
4. save/revert IPC 설계
5. 이후 source-render block mapping 연결

즉, **먼저 split view를 제품 안에 안정적으로 꽂고, 그 다음 source mapping과 annotation 연동으로 확장**하는 흐름이 좋습니다.
