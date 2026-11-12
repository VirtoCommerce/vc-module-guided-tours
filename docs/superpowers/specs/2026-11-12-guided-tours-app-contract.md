# Guided Tours app: shared contract

The decisions the design left to the builder, fixed so the backend, the tour engine and the app agree.
Design: [2026-11-12-guided-tours-app-design.md](2026-11-12-guided-tours-app-design.md).

## Tour format

Strict: an unknown property is a problem.

```text
TourText   = { [languageCode]: string }      at least one entry; values non-empty; key ^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$  e.g. "en-US", "de"
TourTarget = string                           a data-tour anchor name (non-empty)
           | { css: string, label?: string }
           | { anchor: string, label?: string }   a data-tour anchor name with a label
Condition  = exactly one key of
             { bladeOpened: string } | { bladeQueryChanged: string } | { routeChanged: true }
           | { elementAppears: TourTarget, atLeast?: positive int } | { click: true }

Tour {
  id:          string, required, ^[a-z0-9][a-z0-9._-]*$, at most 128 chars
  version:     positive int, required
  appId:       string ^[a-z0-9][a-z0-9-]*$; required for custom tours; for module tours the server sets it from the folder
  title:       TourText, required
  permissions: string[] of non-empty strings, optional
  publishedAt: ISO 8601 date or date-time, optional
  priority:    int, optional
  trigger:     exactly one of { appReady: true } | { bladeOpened: string }, required
  steps:       non-empty array of Step, required
}
Step {
  target?:    TourTarget
  title?:     TourText
  text:       TourText, required
  placement?: "top" | "right" | "bottom" | "left"
  waitFor?:   positive int (ms)
  action?:    { until: Condition, timeout?: positive int (ms) }
}
```

`label` is ignored at runtime; it exists for the readable step view.

### Validation problems

`Problem = { path: string, message: string }`. `path` is JS-style from the tour root (`""` for the root, `steps[1].action.until`, `title.en-US`). Messages are English, lower-case first word, no trailing period except where a second sentence follows. Example:

```json
{ "path": "steps[1].action.until", "message": "unknown condition \"bladeOpend\". Expected bladeOpened, bladeQueryChanged, routeChanged, elementAppears or click." }
```

Validation lives only on the server. The app shows what the server returns.

## REST API (`api/guided-tours`)

```text
TourInfo {
  tour: Tour                       as stored; module tours have appId filled in
  source: "module" | "custom"
  moduleId: string | null          module tours only
  isEnabled: boolean               per-tour switch; module tours default to on, custom tours are created off
  isConflicting: boolean           custom tour whose id a module tour also uses; never served to users
  modifiedDate: string | null      custom tours only
  modifiedBy: string | null        custom tours only
}
```

| Method and path | Permission | Result |
| --- | --- | --- |
| `GET apps/{appId}/tours` | any signed-in user | `Tour[]` for end users: global switch on, tour on, not conflicting, audience rule (`publishedAt` vs user created date). Module and custom tours. Each item also carries `moduleId` when it has one. |
| `GET tours?appId=` | `guided-tours:access` | `TourInfo[]`, all tours, both kinds |
| `GET tours/{id}` | `guided-tours:access` | `TourInfo`, 404 when none. For a conflicting id the module tour |
| `POST tours` (body `Tour`) | `guided-tours:manage` | 201 `TourInfo`, created off; 400 `{ problems: Problem[] }` (a taken id is a problem on `id`) |
| `PUT tours/{id}` (body `Tour`) | `guided-tours:manage` | `TourInfo`; the body's id may differ (rename, keeps the switch state); 400 problems; 404; 400 problem on `""` "module tours are read-only" for a module tour |
| `DELETE tours/{id}` | `guided-tours:manage` | 204, custom tours only (400 for module tours) |
| `POST tours/{id}/copy` | `guided-tours:manage` | 201 `TourInfo`: id `{id}-copy` (then `{id}-copy-2`, …), each title value gets ` (copy)`, created off, original untouched |
| `PUT tours/{id}/enabled` (body `{ isEnabled }`) | `guided-tours:manage` | 204, module and custom |
| `POST tours/validate` (body `Tour`) | `guided-tours:access` | `{ problems: Problem[] }` |
| `GET settings` | `guided-tours:access` | `{ isEnabled }` (global setting `GuidedTours.Enabled`) |
| `PUT settings` (body `{ isEnabled }`) | `guided-tours:manage` | 204 |

## The app

- `<app id="guided-tours">` in `module.manifest`, permission `guided-tours:access`, `supportEmbeddedMode`.
- Source in `src/VirtoCommerce.GuidedTours.Web/App`, built into `src/VirtoCommerce.GuidedTours.Web/Content/guided-tours/` (served at `/apps/guided-tours/`, base path `/apps/guided-tours/`), like Push Messages.

## Launch

- The app opens `{origin}/apps/{tour.appId}/?tour={id}` in a new tab.
- The engine plugin, on startup, reads `tour` from `window.location.search` (and from the router query, for hash routes). If present, it does not start the scheduler for this page load: it fetches `GET tours/{id}`, and on success opens the trigger blade by name when the trigger is `bladeOpened` and that blade is not open, then runs the tour at once. It records no progress and ignores the global switch, the tour switch, `permissions` and `publishedAt`. On 403/404 it does nothing.

## Languages at runtime

`resolveText(text, locale)`: exact key (case-insensitive) → same language (`de` matches `de-DE`, `de-DE` matches `de`) → English (`en-US`, then any `en*`) → first entry.
