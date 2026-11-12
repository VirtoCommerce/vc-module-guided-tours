# Guided Tours app: managing tours

## Why

Today a tour exists only as a JSON file shipped inside a module, and nobody can see, switch off or try a tour without a developer. The people who need that:

- a product owner checks how a tour for a new feature looks before a release;
- a documentation engineer builds a tour on a demo environment and records a screencast from it for YouTube;
- an administrator of a customer environment switches tours off, all of them or one broken tour;
- support looks at a tour a user complained about, through the same list and launch (no per-user view).

## Goals

1. A separate back-office app, **Guided Tours**, like the Push Messages app: declared as `<app id="guided-tours">` in `module.manifest`, opened from the Apps menu, and able to run embedded in the admin (`supportEmbeddedMode`).
2. One list of all tours: tours shipped by modules and custom tours created in the app.
3. Tour details shown as readable steps, not JSON.
4. Custom tours: create by pasting JSON, edit in a step form or as JSON, delete. Validation blocks saving an invalid tour.
5. Switch tours on and off: all tours at once, and each tour on its own.
6. Launch any tour, on or off, in a new browser tab for preview and screencasts.

## Non-goals

- Editing tours shipped by modules. They are read-only; a writer copies one to a custom tour to change it.
- Picking an element by clicking it in the live interface. The author types or pastes a CSS selector or a `data-tour` name.
- Checking known values: whether a blade name, permission or selector exists. Validation covers the format only.
- Analytics on who saw or finished a tour.
- Per-user management (resetting one user's progress) from the app.

## Anti-goals

- A step list that pretends to understand meaning it cannot know. "Waits until the list parameters of OrdersList change" is fine; "waits until the user searches" is a guess and must not appear unless the author wrote it as a label.
- Launching a tour from the app changing anything for real users: it neither records progress nor depends on the tour being on.
- Any change to how end users get tours: still automatic, once per tour version.

## Decisions

### Two kinds of tours

| | Module tour | Custom tour |
| --- | --- | --- |
| Source | `Content/tours/{appId}/*.json` in a module package | Created in the app, stored in the module's database |
| Edit / delete | No | Yes |
| On / off | Yes | Yes |
| Launch | Yes | Yes |
| Copy as custom | Yes | Yes |

Tour ids are unique across both kinds; a custom tour cannot take a module tour's id. Custom tours carry the target `appId` like module tours do.

*Builder's call:* if a module installed later ships a tour with an id a custom tour already uses, the module tour wins for users; the custom tour is marked as conflicting in the list and is not served until it gets another id.

*Builder's call:* a new or copied custom tour starts **off**, so a half-built tour never reaches users; copying leaves the original as it was. Saving a tour that is on publishes the change at once (no drafts); the editor says so next to Save.

### Versions

The author raises the version by hand when users must see the tour again. Saving an edit never changes the version.

### Readable step view

Each step is described from its structure only:

- kind: **Hint** (Next/Back) or **Action** (waits for the user);
- what it points at: the target's `label` if present, otherwise the selector or `data-tour` name, otherwise "centred";
- for an action, what it waits for, phrased per condition type: a blade opens; the list parameters of a blade change (search, sort, page); the route changes; an element appears (with "at least N"); a click on the target;
- title and text in the language picked in the details blade.

The tour header shows the id, version, trigger ("blade X opens" / "app starts"), required permissions, `publishedAt` ("not shown to users created after …") and on/off state.

`target` gets an optional `label` (for example `{ "css": "…", "label": "search field" }`, and the same for `data-tour` targets). The runtime ignores it; it exists for the readable view.

### Editing a custom tour

One blade, two tabs over the same tour:

- **Steps**: title, trigger, permissions; steps as cards with type (Hint/Action), target and label, wait condition, title, text; add, remove, reorder.
- **JSON**: the whole tour as text.

"Add tour" offers "Paste JSON" (and an empty tour that opens in Steps). Saving runs format validation; problems are listed with their path (`steps[1].action.until: unknown condition "bladeOpend"`) and the tour is not saved.

The same validation runs on the server for every write.

### Languages

Tours are multilingual, the way the News module does it: text per language code, edited with a language selector.

- A step's `title` and `text`, and the tour's own title, are objects of texts per language: `{ "en-US": "Find an order", "de-DE": "Bestellung finden" }`. This is the only form, for module and custom tours alike; i18n keys from module locales are dropped (the module has no users yet, so nothing needs to keep working). A copied module tour therefore carries its texts as they are.
- The editor shows a language selector (`VcLanguageSelector`) and multilanguage inputs, like the News article blade. The language list comes from the platform setting `VirtoCommerce.Core.General.Languages`, as News loads it.
- At runtime the engine picks the user's interface language: exact tag first (`de-DE`), then the same language (`de`), then English, then the first text there is. A step never shows empty.
- Validation checks the shape only (an object of non-empty strings keyed by language code, at least one entry), not that every language is filled in.

### On / off

- All tours: the existing global setting `GuidedTours.Enabled`, switchable from the app's toolbar.
- One tour: stored per tour id in the module's database, for module and custom tours alike. A tour that is off is not returned to end users and does not start.

### Launch

The app opens a new tab in the tour's target app on the trigger blade's screen, with the tour id in the URL (for example `/apps/admin-shell/#/orders?tour=orders.workspace`). The tour engine sees the parameter and starts that tour right away, whether it is on or off and whether the user has seen it, and records nothing. A tour with an `appReady` trigger opens the app's start page.

*Builder's call:* a launch also ignores the global switch, the tour's `permissions` and the `publishedAt` rule (a demo account is usually newer than the feature). The engine fetches the tour from a separate endpoint, `GET /api/guided-tours/tours/{id}`, which requires `guided-tours:access`; a user without it who opens the link gets nothing and the app works as usual.

### Permissions

- `guided-tours:access` — open the app, see tours, launch them.
- `guided-tours:manage` — create, edit, delete, copy, switch on and off (one tour or all).

### Storage

Custom tours and per-tour on/off live in the module's own tables, so the module goes back to the database-agnostic template (SqlServer, PostgreSql, MySql) it was generated from. User progress stays in the per-user setting.

## Constraints

- Platform 3.1095.0 or later, VC-Shell framework 2.10 or later (what admin-shell uses today).
- The app is a VC-Shell app built from `create-vc-app --type standalone`, the same stack as the existing plugin.
- No backward compatibility: nobody uses the module yet, so the tour format, API and storage may change freely.

## Left to the builder

- The JSON schema format and where the shared validator lives (it must give the same answers in the app and on the server).
- How the launch URL is built from a blade name (the target app knows its blade routes; the Guided Tours app does not).
- Table design, REST API shape and caching of the merged tour list.
- Layout and wording of the screens; the mockups in `.superpowers/brainstorm/` are a starting point, not a spec.
- How "Copy as custom" names the copy.
