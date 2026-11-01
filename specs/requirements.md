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

## R8 — Spanish application interface

All user-visible application text must be written in Spanish.

Pathfinder dataset content is not application chrome and may remain in its source language.

### Acceptance criteria

- Navigation, buttons, labels, dialogs, filters, card field labels, placeholders, accessibility labels, and messages are in Spanish.
- Pathfinder game data loaded from JSON keeps its original language.
- Source identifiers, comments, specs, and developer-facing console messages remain in English.

## R9 — Alchemical item editing is a follow-up feature

The first editing iteration should establish the pattern using spells. Alchemical item editing/creation should reuse that architecture in a later task rather than being implemented simultaneously unless explicitly requested.

### Acceptance criteria

- Spell editing does not regress alchemical item browsing/printing.
- Shared state/rendering utilities are designed so alchemical support can be added without replacing the whole approach.

## R10 — Edit and create alchemical items

Alchemical items must support the same session-only edit, create, reset, and delete workflow as spells.

The editable model preserves all fields currently rendered from `alchemical_items.json`. `tags` remains an array represented in the editor as comma-separated values. The tier fields (`minor`, `lesser`, `moderate`, `greater`, `major`, and `level_true`) remain arrays represented as one entry per line. All other fields are edited as plain text; the controlled `actions` field selects a known action icon.

### Acceptance criteria

- Every bundled alchemical item has a deterministic application ID and is held in source/effective application state.
- A user can edit every currently rendered field, save or cancel, and reset a bundled item.
- A user can create, edit, and delete a custom alchemical item.
- Edits and custom items persist in `just-spells.session.v1` without copying the bundled dataset.
- Edited/custom titles participate in source-title and English-title search.
- Selection, deselection, selected-list labels, printing, and background color continue to work after re-rendering.
- User-entered values are rendered as text and cannot inject executable markup.
- The alchemical dataset is identified by its root `type` field and keeps its records under `data`.

## R11 — Printable card borders

Selected spell and alchemical item cards must print with a visible outer border by default. The border uses the current shared card color selected in either view and must not rely only on browser background printing.

Users may switch to borderless printing to reproduce the previous PDF appearance. This preference is transient UI state: it is shared by both views, does not alter card or selection data, and resets to bordered mode after a reload.

### Acceptance criteria

- Bordered printing is the default.
- A solid CSS frame uses the current `--card-background` color in print preview and generated PDFs, including when browser background graphics are disabled.
- Print CSS requests exact color reproduction for the colored card frame.
- A control in both views switches between bordered and borderless printing and clearly communicates the available action.
- Both controls remain synchronized because they change one shared print mode.
- Borderless mode removes only the outer border/frame; card content and internal separators remain visible.
- Only selected cards are printed in either mode.

## R12 — Preview unsaved card changes

Spell and alchemical item editors must provide an explicit preview of the current unsaved form values in both create and edit modes.

### Acceptance criteria

- An English-labeled `Preview` button renders one card on demand; previews do not update continuously.
- Preview uses the same form normalization and safe card template as Save and normal pool rendering.
- Preview uses the current shared card color.
- Preview does not modify application data, selection, search results, or `sessionStorage`.
- Repeated preview requests replace the previous preview.
- Saving, canceling, closing, or reopening an editor clears stale preview content.
- Spell and alchemical item preview behavior is consistent, including array-field normalization and alchemical text autosizing.
- Preview UI and content are not printed.

## R13 — Browse equipment and item datasets

The application must expose the indexed armor, ranged weapon, melee weapon, shield, and general item datasets as separate browsable catalogs.

### Acceptance criteria

- Each catalog JSON filename and root `type` uses an English identifier.
- Each catalog has its own view, search field, card list, and selected-card list.
- Cards display the record's fields safely as text and use the same card frame, white content panel, title rule, and footer style as spell and alchemical cards.
- Catalog cards support selection, deselection, and selected-only printing.
- Existing spell and alchemical item views continue to load through the shared dataset index.

## R14 — Filter cards by type-specific fields

Every card type must offer sidebar filters for its relevant structured fields, in addition to its title search. For any field with fewer than 20 distinct non-empty values in the current dataset, use a select control; fields with 20 or more values use a text search control. Applying multiple filters narrows the results by all selected criteria.

### Acceptance criteria

- Spell, alchemical item, armor, ranged weapon, melee weapon, shield, and general item views expose relevant field filters in their sidebars.
- Fields with 2–19 distinct values use a selector; fields with 20 or more distinct values use a text filter.
- Selectors for array-valued fields match a record when its array contains the selected value.
- Title search and all field filters combine, and clearing a filter restores the matching cards.
- Filter controls use English labels and do not alter card selection or the source JSON data.

## Out of scope for the first editing iteration

- backend persistence;
- user accounts;
- cloud synchronization;
- collaborative editing;
- arbitrary HTML/WYSIWYG editing;
- permanent local persistence via `localStorage`;
- importing/exporting custom JSON files;
- a JavaScript framework or build tool migration.
