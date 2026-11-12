# Guided Tours Module

## Overview

The Guided Tours module shows Backoffice users a short interactive tour of a new feature the first time they open its screen in a VC-Shell app. A tour highlights parts of the interface one step at a time. A step is either a hint or an action the user performs themselves, such as searching or selecting rows; the tour continues once the action is done.

Any module can ship tours for its own features. A tour is a JSON file inside the module package, so neither the platform nor the host app has to change.

![An action step: the tour waits until the user searches](docs/media/action-step.png)

![Once two products are selected, the tour moves to the bulk action in the toolbar](docs/media/bulk-actions.png)

## Key Features

* Tours start on their own when their trigger holds: a blade opens, or the app starts.
* Hint steps with Next and Back, and action steps that wait until the user does what the step asks.
* Each user sees a tour version once. Finishing or closing it is remembered in the user's profile.
* Raising a tour's `version` shows the updated tour to everyone again.
* Tours are shown only to users with the listed permissions, and not to users created after the feature shipped.
* Texts come from the declaring module's locales.
* One global setting turns all tours off.

## How it works

A module puts tour definitions in its package at `tours/{appId}/{name}.json`, where `appId` is the VC-Shell host app the tour runs in:

```json
{
  "id": "products.bulk-actions",
  "version": 1,
  "publishedAt": "2026-11-11",
  "permissions": ["product:update"],
  "priority": 0,
  "trigger": { "bladeOpened": "ProductsList" },
  "steps": [
    { "title": "PRODUCTS.TOUR.TITLE", "text": "PRODUCTS.TOUR.INTRO" },
    {
      "target": { "css": "[data-tour='products.table'] .vc-input" },
      "text": "PRODUCTS.TOUR.SEARCH",
      "action": { "until": { "bladeQueryChanged": "ProductsList" } }
    },
    {
      "target": "products.table",
      "text": "PRODUCTS.TOUR.SELECT",
      "action": {
        "until": { "elementAppears": { "css": "[data-tour='products.table'] input:checked" }, "atLeast": 2 }
      }
    },
    { "target": { "css": "[data-test-id='discount']" }, "text": "PRODUCTS.TOUR.BULK" }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `id`, `version` | Identity. A user who finished or closed this version never sees it again. |
| `publishedAt` | When the feature shipped. Users whose account was created later do not get the tour. |
| `permissions` | The tour is shown only to users with any of these permissions. |
| `priority` | Tours run one at a time; higher priority goes first. |
| `trigger` | `{ "appReady": true }` or `{ "bladeOpened": "<blade name>" }`. |
| `steps[].target` | A `data-tour` anchor name, or `{ "css": "…" }` for markup the module does not own. No target: a centred hint. |
| `steps[].title`, `text` | i18n keys from the module's own locales (plain text also works). |
| `steps[].action.until` | `bladeOpened`, `bladeQueryChanged` (table page, sort, search), `routeChanged`, `elementAppears` (with an optional `atLeast` count), or `click` on the target. |
| `steps[].action.timeout` | After this many ms the user is offered to skip the step. |
| `steps[].waitFor` | How long to wait for the target to render; a step whose target never appears is skipped. |

Anchors are `data-tour="…"` attributes in the module's blade templates. UI-kit components do not pass unknown attributes to their root element, so put the anchor on a wrapping element when the component swallows it.

A tour closes without being remembered when its trigger blade closes, and starts again the next time the blade opens.

## Configuration

### Settings

| Setting | Scope | Description |
| --- | --- | --- |
| `GuidedTours.Enabled` | Global | Shows tours. Turn off to hide every tour. |
| `GuidedTours.State` | Per user | Tour progress, read and written by the VC-Shell plugin through `/api/platform/settings/v2/me/values`. |

### Permissions

The module defines no permissions. Tours list the permissions of the features they describe.

## Components

### Projects

| Project | Description |
| --- | --- |
| `VirtoCommerce.GuidedTours.Core` | Settings and the rule that keeps tours from users created after a feature shipped. |
| `VirtoCommerce.GuidedTours.Web` | Module entry point, tour discovery and REST API. |
| `VirtoCommerce.GuidedTours.Web/ShellPlugin` | VC-Shell plugin with the tour engine, rendered with [driver.js](https://driverjs.com). Host apps load it through Module Federation; it reads its `appId` from the `plugins/{appId}/` folder it is served from. |
| `sandbox` | A VC-Shell app in demo mode with the plugin wired in directly, a sample tour and progress in localStorage. |

### REST API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/guided-tours/apps/{appId}/tours` | Tours every installed module ships for the host app, minus tours the current user should not get. Empty when tours are off. |

## Development

```bash
dotnet test VirtoCommerce.GuidedTours.sln
```

```bash
cd src/VirtoCommerce.GuidedTours.Web/ShellPlugin && yarn install && yarn test run && yarn type-check && yarn build
```

```bash
cd sandbox && yarn install && yarn serve
```

The sandbox opens on <http://localhost:3310/apps/sandbox/>; sign in with any name, open **Products**, and the sample tour starts. Remove the `guided-tours-sandbox:state` localStorage key to see it again. `sandbox/demo/screenshots.mjs` retakes the README screenshots from the running sandbox.

## License

Copyright (c) Virto Solutions LTD. All rights reserved.

Licensed under the Virto Commerce Open Software License (the "License"); you
may not use this file except in compliance with the License. You may
obtain a copy of the License at

<https://virtocommerce.com/open-source-license>

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
