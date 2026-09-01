# Requirements

## R1 — Preserve current static deployment

The application must remain deployable as static files with no backend, database, build service, or server-side runtime.

### Acceptance criteria

- The application can still be served by a basic static HTTP server.
- All new runtime functionality executes in the browser.

## R2 — Preserve bundled source data

Bundled JSON files are read-only source data from the application's point of view.

### Acceptance criteria

- Editing a card does not attempt to write to `resources/*.json`.
- Reloading with no saved session edit renders the original bundled value.
- Resetting an edited source card restores the bundled value.

## R3 — Edit an existing spell card

A user must be able to edit the textual/data fields of an existing spell card through an explicit editing UI.

### Acceptance criteria

- Editing is initiated intentionally and does not conflict with card selection.
- The editor starts with the card's current values.
- Saving updates the rendered card.
- Canceling leaves the card unchanged.
- The edited card remains searchable and printable.
- User-entered content is rendered safely and cannot inject executable HTML/script.

## R4 — Create a custom spell card

A user must be able to create a new spell card without modifying the bundled dataset.

### Acceptance criteria

- A clear “Create spell” action opens an empty/default spell form.
- The form uses the same core data shape required by spell rendering.
- Saving creates a new card in the spell pool.
- The custom card can be searched, selected, edited, and printed.
- Canceling creation does not add a card.

## R5 — Session persistence

User edits and user-created cards must persist for the current browser session using `sessionStorage`.

### Acceptance criteria

- Saved edits survive a page reload in the same session.
- Custom cards survive a page reload in the same session.
- The application still loads the bundled data if session data is absent or invalid.
- Session storage uses a versioned application-specific key.

## R6 — Reset and delete session changes

Users must be able to reverse session-only changes.

### Acceptance criteria

- An edited bundled card can be reset to its original source data.
- A custom card can be deleted.
- Reset/deletion updates session persistence immediately.
- The UI makes the difference between reset (source card) and delete (custom card) understandable.

## R7 — Existing browse/print behavior must continue working

Editing features must not break the current primary workflow.

### Acceptance criteria

- Spell search still filters cards by Spanish/source and English title where available.
- Alchemical item search continues to work.
- Cards can still be selected/deselected.
- Only selected cards are included in print output.
- Background color customization continues to affect cards.

## R8 — English project UI for changed/new interface text

New or modified application chrome must be written in English.

Pathfinder dataset content is not application chrome and may remain in its source language.

### Acceptance criteria

- New buttons, labels, dialogs, validation messages, and console messages are in English.
- When an existing UI section is substantially modified by a task, nearby application labels should be normalized to English where reasonable and within task scope.

## R9 — Alchemical item editing is a follow-up feature

The first editing iteration should establish the pattern using spells. Alchemical item editing/creation should reuse that architecture in a later task rather than being implemented simultaneously unless explicitly requested.

### Acceptance criteria

- Spell editing does not regress alchemical item browsing/printing.
- Shared state/rendering utilities are designed so alchemical support can be added without replacing the whole approach.

## Out of scope for the first editing iteration

- backend persistence;
- user accounts;
- cloud synchronization;
- collaborative editing;
- arbitrary HTML/WYSIWYG editing;
- permanent local persistence via `localStorage`;
- importing/exporting custom JSON files;
- a JavaScript framework or build tool migration.
