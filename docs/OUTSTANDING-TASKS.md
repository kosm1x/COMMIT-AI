# Outstanding Tasks

> Last updated: 2026-04-01

## Phase 6 Backlog

| #   | Item                  | Effort | Impact | Blocker                                 | Notes                                                                                                                                                                                     |
| --- | --------------------- | ------ | ------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | PWA / offline support | Medium | High   | Decision: web-first vs Capacitor-first  | `index.html` already has PWA meta tags. Needs `manifest.json`, service worker, `vite-plugin-pwa`. Capacitor handles offline for native — PWA only matters for web users                   |
| 2   | Push notifications    | Medium | High   | Firebase project + backend push service | Needs `@capacitor/push-notifications`, Firebase Cloud Messaging setup, device token storage, push payload handlers. Decide trigger strategy (deadlines, goal updates, Jarvis suggestions) |
| 3   | WebAuthn fallback     | Medium | Low    | None                                    | Biometric auth for web browsers (currently only works on native via Capacitor plugin)                                                                                                     |
| 4   | Storybook             | Medium | Low    | None                                    | Component library documentation. 60+ components across 9 directories                                                                                                                      |

## Jarvis Enhancements

| #   | Item                                     | Notes                                                                                                                                                                                      |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 5   | "Jarvis Says" insight cards              | Strategic insights on journal/objectives pages. Journal already shows AI analysis (emotions, patterns). This would add goal connections, suggested actions, and Jarvis commentary overlays |
| 6   | Link 3 unlinked projects to COMMIT goals | Data task in Jarvis SQLite. Projects: presencia-digital-eurekamd, pipesong, alianza-cmll. Need to identify matching COMMIT goals or create new ones                                        |

## Code Quality

| #   | Item                                                            | Severity | Notes                                                                                                                                               |
| --- | --------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7   | Split `useObjectivesCRUD.ts` (1183 LOC)                         | Low      | 2x the 600 LOC convention. Natural split by entity: visionCRUD, goalCRUD, objectiveCRUD, taskCRUD. Includes undo closures that complicate splitting |
| 8   | Remaining Pino migration (213 console calls in mission-control) | Low      | Logger module in place. 9 critical files migrated. 44 files remain with `console.log/error/warn` for incremental adoption                           |

## Deployment

| #   | Item            | Notes                                                                                                                               |
| --- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 9   | Automate deploy | Currently manual: `npm run build` → rsync to Hostinger. Could add a GitHub Action or deploy script. SSH details: 195.35.38.10:65002 |
