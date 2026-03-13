# ROADMAP.md

## MarkDeck Product Roadmap

### Vision
MarkDeck has two product goals:

1. **Read markdown documents conveniently**
2. **Generate and share feedback conveniently based on markdown documents**

---

## v1.0.0 — Markdown Reading Foundation

Status: **done**

Included themes:
- markdown reading UX
- desktop-first viewer structure
- Electron main -> IPC -> renderer architecture base
- browse / docs / search
- desktop routing and async state foundations
- packaging baseline

---

## v1.1 — Annotation Drafting Foundation

Status: **in progress**

Focus:
- annotation model
- text selection -> highlight / comment
- deletion mark for paragraphs/blocks
- side feedback panel
- `.memo` sidecar format draft

Current state:
- annotation model exists
- preview highlight/comment UI exists
- delete mark UI exists
- feedback panel exists
- selection preservation bug fixed
- `.memo` serialization preview exists

Still needed:
- actual `.memo` file write/read
- anchor drift recovery
- better export/share flow
- richer annotation metadata

---

## v1.2 — Feedback Persistence and Sharing

Planned outcomes:
- real `.memo` sidecar save/load in desktop app
- annotation persistence through Electron main APIs
- feedback export / shareable view improvements
- restore annotations reliably after reload
- clearer feedback workflow for reviewing documents

Key deliverables:
- `.memo` file IO
- annotation sync between document and side panel
- exportable feedback summary
- desktop-aware persistence UX

---

## v1.3 — Review Workflow Upgrade

Planned outcomes:
- author / timestamp / thread metadata
- comment thread or reply model
- improved delete / highlight / comment coexistence rules
- better navigation between annotated regions
- review session polish for large markdown documents

Potential additions:
- annotation filters
- unresolved / resolved states
- reviewer identity model
- compact review mode
- selection/block level translate actions
- translation-assisted review flow

### Translation support direction
Recommended staged approach:
1. Add **Translate** actions to selection popovers and block toolbars
2. Open Google Translate for quick external translation checks first
3. Later add an in-app translation side panel / preview
4. If needed, evaluate formal translation API integration for tighter workflow support

---

## v1.4 — Desktop Productivity Layer

Planned outcomes:
- stronger workspace/recent folder flow
- better command palette / shortcuts / menu system
- file watcher driven refresh refinement
- cache / indexing improvements for larger document sets
- release/signing automation maturity

---

## Longer-Term Direction

### Desktop architecture
Keep moving toward:
- **main** -> file system / indexing / persistence / OS integration
- **IPC** -> stable typed contract
- **renderer** -> UI and review workflow

### Feedback-centric expansion
Potential future directions:
- review templates
- feedback export formats
- shareable review bundles
- document diff-aware annotation recovery
- collaboration-friendly memo conventions
