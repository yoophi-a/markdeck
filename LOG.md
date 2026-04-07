# LOG

## 2026-04-08

- Pulled latest `main` from origin and updated local repository from `73b9a76` to `8d55e37`.
- Confirmed that the project has shifted more decisively to a desktop-first architecture centered on `apps/desktop`.
- Noted the major structural transition from `apps/web`-centric UI ownership to `apps/desktop/src/renderer` ownership.
- Recorded adoption of `electron-vite` and the clearer separation of `main`, `preload`, and `renderer` entrypoints.
- Recorded that desktop main architecture is now more explicitly organized into `app`, `application`, `core`, and `infrastructure` layers.
- Noted related product/runtime changes including desktop content root routing fixes, annotation control refinements, markdown typography improvements, and README updates aligned to the desktop-first direction.
