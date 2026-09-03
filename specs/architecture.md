# Architecture

## Current architecture

Just Spells is a static client-side application.

### Entry points

- `index.html` contains the main application layout and controls.
- `style.css` contains page-level layout and print-related styles.
- `style/spellCard.css` contains card styles.
- `main.js` loads data, renders card lists, handles selection/search/tabs, and contains some utility behavior.
- `js/CardTemplate.js` contains card rendering helpers/templates.
- `resources/spells.json` is the bundled spell dataset.
- `resources/alchemical_items.json` is the bundled alchemical item dataset.

### Runtime data flow

Current flow:

```text
Bundled JSON
    |
    v
fetch()
    |
    v
plain JavaScript objects
    |
    v
card template functions
    |
    v
DOM card elements
    |
    +--> search/filter
    +--> selection
    +--> print
```

## Target architecture for editing

The editing feature should introduce a small explicit client-side state layer without introducing a framework.

Target flow:

```text
Bundled JSON -------------------+
                                |
                                v
                          application state
                                ^
                                |
sessionStorage <--> session changes/custom cards
                                |
                                v
                             render
                                |
                 +--------------+--------------+
                 |              |              |
               search        selection        edit
                                                |
                                                v
                                           save to state
                                                |
                                                v
                                         sessionStorage
```

## State model

The application should distinguish between:

1. **Source records**: records loaded from the bundled JSON files.
2. **Edited records**: session copies of source records with user changes.
3. **Custom records**: records created by the user during the session.
4. **UI state**: search text, selected cards, active tab, and editor visibility.

Initially, only edited/custom record persistence is required. Selection persistence should not be added unless a requirement explicitly requests it.

Print border mode is transient shared UI state. It is represented by a class on the document root so print CSS can apply the same mode to spell and alchemical item cards. It is not stored in `sessionStorage`; a reload restores the default bordered mode.

## Print rendering

Selected cards use an explicit CSS border in print media, with `box-sizing: border-box` so the border remains inside the existing card dimensions. The card background continues to provide the wider visual frame when the browser honors exact print colors, while the real border provides a printable outline that does not depend on background graphics. A root-level borderless-mode class suppresses the outer border and frame without changing selection or internal card separators.

## Identity

Editing requires stable record identities that do not depend only on the DOM list index.

For source records, derive a deterministic ID from record type plus stable source fields when no ID exists in the JSON. Do not change the bundled datasets solely to add IDs unless a task explicitly chooses that migration.

Custom records should receive a generated session-safe ID, for example using `crypto.randomUUID()` with a reasonable browser-compatible fallback if needed.

## Rendering

Rendering should be driven by the current application state. An edited record should render in place of its source version. A custom record should render in the same pool as records of its type.

Avoid maintaining independent copies of the same record only in DOM text. The JavaScript object/state should be the source of truth and the DOM should be re-rendered or updated from it.

### Editor preview rendering

An editor preview is a disposable DOM rendering of the current form values. The existing form-value conversion function produces a temporary record, and the existing spell or alchemical item card template renders it into the dialog's preview region. Preview records are never added to application state or session storage. Each request replaces the region contents, and every editor open/close path clears them to prevent stale previews.

## Session persistence

Use a versioned `sessionStorage` key, for example:

```text
just-spells.session.v1
```

Store only user-generated session state needed to reconstruct edits/custom records. Do not duplicate the full bundled JSON dataset unless there is a clear reason.

Session parsing must be defensive: invalid or incompatible stored data should not prevent the base application from loading.

## Security

Card text becomes user-editable. Existing rendering uses template strings and `innerHTML`, which can interpret HTML. Editing work must not make arbitrary user input executable.

Prefer assigning user-entered text using DOM `textContent` or escaping it before interpolation. If formatted text is intentionally supported later, define a limited format explicitly rather than accepting arbitrary HTML.

## Known technical debt relevant to future tasks

The following existing issues should be considered when touching nearby code, but should not trigger broad refactors by themselves:

- UI and console text is currently mixed between Spanish and English.
- `getActionImg()` is defined in both `main.js` and `js/CardTemplate.js`.
- spell search assigns one `data-search` value using `spellJson.enTitle`, while the source field is `englishTitle`; the rendered title element currently contains the correct value through `spell.enTitle`.
- `autoSizeText()` uses jQuery-style `.css()` calls on native DOM elements and is likely non-functional as written.
- state is currently implicit in DOM classes rather than represented as an application state object.
- card rendering relies heavily on `innerHTML`, which requires care once text becomes user-editable.

Fix these only when required by a task or when a small fix is necessary to implement the task safely.
