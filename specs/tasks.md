# Development Tasks

Statuses: `TODO`, `IN PROGRESS`, `DONE`, `BLOCKED`.

The tasks are intentionally small. Complete and validate one task before starting the next.

## Interface language and layout

### UI-001 — Translate the interface and align card actions

**Status:** DONE

**Goal:** Display application chrome in Spanish and keep card editing controls clear of card titles.

**Acceptance criteria:**

- Visible navigation, search, filters, editor controls, and generic catalog labels are in Spanish.
- Card action buttons do not overlap the card title.
- Pathfinder dataset content remains in its original language.

**Implementation note:** Translated static and dynamically generated application labels, editor forms, filter names, card field labels, and accessible action names. Reserved title space for the `Editar` button and versioned the scripts so browsers reload the updated Spanish labels.

### CATALOG-EDIT-001 — Add edit and create controls to equipment catalogs

**Status:** DONE

**Goal:** Let users edit source cards and create session-only records in armor, weapon, shield, and general item catalogs.

**Acceptance criteria:**

- Every generic catalog card has an Edit button, and its sidebar has a type-specific Create button.
- Edits, restores, creation, and deletion use session storage and leave source JSON untouched.
- Saved changes remain visible in search, filters, selection, and printing.
- JavaScript syntax and browser loading are checked.

**Implementation note:** Added type-specific create buttons, dynamic per-record forms, edit/restore/delete actions, and session-backed edit/custom-record state for all five equipment catalogs. Browser review confirmed edit and create controls on all 215 source cards, plus successful edit/restore and create/delete flows; `node --check main.js` and `git diff --check` pass.

### DATA-004 — Discover generic catalog types from resources

**Status:** DONE

**Goal:** Discover every type from indexed JSON datasets and use one inferred filter system across all catalog views.

**Acceptance criteria:**

- Adding an indexed JSON type with records does not require a JavaScript catalog or filter registration.
- Optional dataset label metadata supplies Spanish tab and create labels.
- Spells, alchemical items, and generic catalog filters are inferred from their effective record fields.
- All seven types use one generated view and editor; type-specific card templates preserve spell and alchemical layouts.

**Implementation note:** All types are discovered from indexed datasets and use generated views, shared card actions, filters, selection, and editor forms. Spell and alchemical records retain specialized card templates within that shared flow. New dataset types need no JavaScript view, filter, or editor registration. The generated borderless-print control includes its initial label.

### CATALOG-EDIT-002 — Use the shared catalog flow for every type

**Status:** DONE

**Goal:** Route spell and alchemical cards and editors through the same generated catalog system used by the newer types.

**Acceptance criteria:**

- All seven catalog views, card actions, selection lists, filters, create/edit forms, previews, and print controls are generated through the shared catalog flow.
- Spell and alchemical cards retain their existing specialized visual templates.
- Edited source records can be restored, and custom records can be deleted for all types.
- Every generated borderless-print toggle has a visible Spanish label and stays synchronized.
- Spell and alchemical title search, selection, deselection, and printing behavior continue working.

**Implementation note:** The seven indexed types now share generated views and one dynamic editor with previews; spell and alchemical renderers plug into the common card flow. Browser checks covered all catalog counts and edit buttons, create/edit/preview/restore/delete for spell and alchemical records, search and selection toggles, and synchronized borderless-print labels. JavaScript syntax and whitespace checks passed.

## Presentation

### STYLE-001 — Refresh the application and card styles

**Status:** DONE

**Goal:** Give the application and all card types a more complete, consistent appearance using only project-owned CSS.

**Acceptance criteria:**

- App navigation, controls, sidebar, catalog layout, and dialogs share a responsive visual system.
- Spell, alchemical, and generic catalog cards retain a consistent card frame and readable typography.
- Selected-card printing retains its existing dimensions and layout.
- No external style libraries are introduced.

**Implementation note:** Reworked `style.css` and `style/spellCard.css` with shared colors, surfaces, spacing, focus states, responsive catalog layout, and refined card details. Added a version query to the card stylesheet URL in `index.html` so browsers refresh a cached older card layout. `node --check main.js` and `git diff --check` pass. Browser review confirmed the updated spell and armor layouts share the sidebar design, card widths render correctly, and title search still filters spells and alchemical items.

## Dataset loading

### FILTER-001 — Add field filters to every card type

**Status:** DONE

**Goal:** Add relevant sidebar filters to spell, alchemical item, armor, weapon, shield, and general item views.

**Acceptance criteria:**

- Every card type offers filters for its useful structured fields alongside title search.
- Fields with 2–19 distinct values use selectors; fields with 20 or more use text inputs.
- Array-valued fields match any contained value, and active filters combine with each other and title search.
- Clearing filters restores matching cards without changing selection.

**Implementation note:** Added a shared filter renderer and matcher, with field definitions for all seven catalog types. Filter choices are derived from effective records so session edits and custom spell/alchemical records are included. `node --check main.js` and `git diff --check` pass. Browser verification confirmed selector filtering for spell level and alchemical hand count, text filtering for spell traits, melee weapon traits, and item price, combined title/field filtering, and clearing a filter to restore all 103 general items. No browser console errors were reported.

### DATA-003 — Add equipment and general item catalogs

**Status:** IN PROGRESS

**Goal:** Rename the new source datasets in English, identify them by type, and make them browseable in the application.

**Acceptance criteria:**

- New resource filenames are English and each root object declares its catalog `type` with records under `data`.
- The static resource index includes all new datasets.
- Each dataset appears in its own searchable view with safe text rendering, selection, deselection, and selected-card printing.
- Spell, alchemical item, and equipment views use the same sidebar layout and shared search, selection, print, and card-color controls.
- New catalog cards use the same visual template structure as spell and alchemical item cards.
- Existing spell and alchemical views continue to use their current templates and workflows.

**Implementation note:** Added armor, ranged weapons, melee weapons, shields, and general items catalogs. Their source filenames are `armor.json`, `ranged_weapons.json`, `melee_weapons.json`, `shields.json`, and `items.json`. Their card template shares the existing spell/alchemical frame and typography. Generic catalog views use the same sidebar structure and control order as spell and alchemical views. Syntax and dataset structure checks pass. Browser verification confirmed all five catalogs load, generic search filters records, selection and deselection work, and English-title search still works for spells and alchemical items. The in-app browser did not open native print preview, so print preview remains to be checked manually.

### DATA-002 — Combine all datasets by declared type

**Status:** DONE

**Goal:** Load every indexed JSON dataset whose root `type` matches the requested section and merge its records into that section's main list.

**Acceptance criteria:**

- A static dataset index lists the JSON files in `resources` without requiring server-side directory enumeration.
- Spell and alchemical loaders fetch all indexed files and combine each matching dataset's `data` records.
- Files of another type do not enter the section's list; a missing matching type produces a clear load error.
- Existing single-dataset files remain valid inputs.

**Implementation note:** Added `resources/datasets.json` as a static-hosting-compatible file index. `loadTypedDataset(type)` fetches its listed JSON files in parallel, filters by root `type`, then concatenates the `data` arrays.

### DATA-001 — Select datasets by their declared type

**Status:** DONE

**Goal:** Identify each bundled dataset from its root `type` field rather than inferring the dataset type from its filename.

**Acceptance criteria:**

- Spell and alchemical item JSON use a root object with a `type` discriminator and a `data` array.
- Each section validates the expected discriminator before normalizing and rendering its records.
- An HTTP or dataset format error is reported without silently loading the wrong data.

**Implementation note:** Added `type: "spells"` and `type: "alchemical-items"` wrappers to the bundled JSON files and a shared typed dataset loader. The root JSON schema intentionally changed from an array to `{ type, data }`; per-record fields remain unchanged.

## Foundation

### JS-001 — Document and normalize the spell data model

**Status:** DONE

**Goal:** Create a single normalization function for records loaded from `spells.json` so later state/editing code does not duplicate field mapping.

**Likely files:** `main.js`

**Acceptance criteria:**

- One function converts a raw spell JSON record into the application spell shape.
- Existing spell rendering remains visually equivalent.
- Both `englishTitle` and `title` are mapped correctly.
- No editing behavior is added yet.

**Validation:** Search for a spell using both its source title and English title; select and print-preview it.

**Implementation note:** Spell records are normalized through `normalizeSpell()` before rendering, including the `englishTitle` to `enTitle` mapping used by the existing card template and search behavior.

---

### JS-002 — Add stable spell IDs

**Status:** DONE

**Goal:** Give every source spell a stable application ID that does not depend only on its position in the rendered list.

**Depends on:** JS-001

**Likely files:** `main.js`

**Acceptance criteria:**

- Every normalized source spell has a deterministic ID.
- IDs are unique for the current source dataset.
- DOM element IDs may use the stable ID safely or keep a separate DOM-safe representation.
- Search, selection, and printing still work.

**Implementation note:** Normalized source spells receive deterministic, DOM-safe IDs derived from their source and English titles, type, and level. Spell card DOM IDs now use those stable application IDs.

---

### JS-003 — Introduce spell application state

**Status:** DONE

**Goal:** Store source spells and effective/rendered spells in explicit JavaScript state instead of relying on the DOM as the only state representation.

**Depends on:** JS-002

**Likely files:** `main.js`

**Acceptance criteria:**

- Loaded spell objects are held in an application state structure.
- Spell pool rendering is performed from state.
- Re-rendering the spell pool does not duplicate cards or event handlers.
- Existing search/selection behavior remains functional.

**Implementation note:** Source and effective spell records are held separately in `applicationState`, and `renderSpellPool()` replaces the existing spell DOM from effective state on each render.

---

## Session persistence

### JS-004 — Add versioned session storage utilities

**Status:** DONE

**Goal:** Add defensive load/save helpers for session-only spell changes.

**Depends on:** JS-003

**Likely files:** `main.js` or a small new file under `js/`

**Acceptance criteria:**

- Storage uses the key `just-spells.session.v1` (or another documented versioned key).
- Missing storage is treated as an empty session.
- Invalid JSON does not prevent the application from starting.
- Save/load utilities can represent edited source spells and custom spells.
- The full source dataset is not unnecessarily copied into storage.

**Implementation note:** Session-only spell changes use the versioned `just-spells.session.v1` key with defensive load/save helpers and the compact shape `{ editedSpells, customSpells }`. Missing, malformed, or incompatible data falls back to an empty session.

---

### JS-005 — Merge source spells with session state

**Status:** DONE

**Goal:** Build the effective spell list from immutable source records plus session edits/custom records.

**Depends on:** JS-004

**Acceptance criteria:**

- A session edit overrides the matching source spell in the rendered list.
- A session custom spell appears in the rendered list.
- With empty session state, rendering matches the source dataset.
- Unknown/stale edit IDs are ignored safely.

**Implementation note:** `buildEffectiveSpells()` creates render copies from immutable source records, applies matching session edit overlays while preserving source IDs, appends valid custom spells, and ignores stale edits or conflicting custom IDs.

---

## Spell editor

### UI-001 — Add an explicit Edit action to spell cards

**Status:** DONE

**Goal:** Let the user request editing without interfering with select/deselect behavior.

**Depends on:** JS-005

**Likely files:** `index.html`, `main.js`, `js/CardTemplate.js`, `style.css`, `style/spellCard.css`

**Acceptance criteria:**

- Each spell exposes an English-labeled Edit action in non-print UI.
- Clicking Edit does not toggle card selection.
- Edit controls are not printed.

**Implementation note:** Each rendered spell card includes an English `Edit` button marked `no-print`. Its click handler stops propagation and records the requested spell ID in application UI state without changing card selection.

---

### UI-002 — Add a spell editor form

**Status:** DONE

**Goal:** Provide a simple form for the fields currently used by spell card rendering.

**Depends on:** UI-001

**Likely files:** `index.html`, `style.css`, `main.js`

**Acceptance criteria:**

- The form opens with the current effective spell values.
- The user can change title, English title, action type, type, level, traditions, cast time, range, area, duration, objectives, trigger, description, and heightenings as applicable.
- Save and Cancel actions are available.
- Cancel performs no mutation.
- Form labels and messages are in English.

**Implementation note:** A native modal dialog now exposes all fields used by spell rendering and is populated from the current effective spell. Cancel and dialog dismissal clear editor UI state without changing spell or session data; saving is intentionally deferred to JS-006.

---

### JS-006 — Save spell edits safely

**Status:** DONE

**Goal:** Save edited values into application/session state and re-render the card.

**Depends on:** UI-002

**Acceptance criteria:**

- Save updates the effective spell immediately.
- Save writes the edit to session storage.
- The change survives reload in the same browser session.
- Edited user text cannot execute injected HTML or JavaScript.
- Search uses the edited titles after saving.

**Implementation note:** Saving now records an editable-field overlay for the source spell, persists it under the versioned session key, rebuilds effective state, and immediately re-renders while retaining selection and the active search filter. Spell template values are HTML-escaped before interpolation so session-provided text is rendered inert.

---

### UI-003 — Reset an edited source spell

**Status:** DONE

**Goal:** Allow a source spell with session edits to be restored to its bundled value.

**Depends on:** JS-006

**Acceptance criteria:**

- Reset is offered only when a source spell has session changes.
- Reset removes the edit overlay from session storage.
- The original source version is immediately rendered.
- Selection state does not unexpectedly toggle when Reset is clicked.

**Implementation note:** Edited source spell cards now show a non-printing `Reset` action. Reset removes only that spell's edit overlay, saves the updated session immediately, rebuilds the effective spell list from bundled source data, and re-renders while preserving selection and search state.

---

## Custom spells

### UI-004 — Add Create spell flow

**Status:** DONE

**Goal:** Reuse the spell editor form to create a new session-only spell.

**Depends on:** JS-006

**Acceptance criteria:**

- A non-print `Create spell` action is available in the spell view.
- It opens the spell form in create mode.
- Saving generates a unique custom spell ID.
- The new card appears immediately.
- The custom spell is written to session storage.
- Cancel creates nothing.

**Implementation note:** The spell view now provides a non-printing `Create spell` action that opens the shared editor in create mode with an empty form. Saving assigns a collision-checked custom ID using `crypto.randomUUID()` with a fallback, appends the spell to session state, persists it, and re-renders it in the spell pool. The shared edit flow also updates custom spells in session state.

---

### UI-005 — Delete a custom spell

**Status:** DONE

**Goal:** Allow session-created spells to be removed.

**Depends on:** UI-004

**Acceptance criteria:**

- Delete is offered for custom spells, not bundled source spells.
- Deleting removes the spell from state and session storage.
- The card disappears immediately.
- Deleting a selected custom card does not leave stale selection-list UI behind.

**Implementation note:** Custom spell cards now show a non-printing `Delete` action that is not rendered for bundled source spells. Deleting removes the custom record and any matching selected-spell list entry, persists the session immediately, rebuilds effective state, and re-renders the filtered spell pool.

---

## Cleanup directly supporting the feature

### JS-007 — Make card rendering safe for editable text

**Status:** DONE

**Goal:** Remove unsafe interpolation paths for fields that can contain user-entered values.

**Depends on:** JS-006

**Likely files:** `js/CardTemplate.js`, possibly `main.js`

**Acceptance criteria:**

- User-editable values are inserted as text or explicitly escaped.
- Existing bundled descriptions still render correctly for expected plain-text data.
- Action icons continue to render from controlled application values.

**Implementation note:** Spell cards are now built with DOM nodes and all editable values are assigned through `textContent` or text nodes rather than interpolated into `innerHTML`. Action images are created only for the known action-type values; unknown session values render without an image. The non-editable alchemical item renderer remains unchanged.

---

### BUG-001 — Repair or remove broken native text autosizing implementation

**Status:** DONE

**Goal:** Address `autoSizeText()` using jQuery-style `.css()` on native elements.

**Priority:** Low unless editing exposes overflow problems.

**Acceptance criteria:**

- No native element calls a nonexistent `.css()` method.
- If autosizing remains, it has a lower font-size bound and cannot loop indefinitely.
- Existing cards do not regress visually.

**Implementation note:** `autoSizeText()` now uses native `getComputedStyle()` and `element.style.fontSize` APIs. It changes only overflowing `.resize` elements, stops at a 7px lower bound, and caps iterations based on the initial computed size so it always terminates.

---

### CLEAN-001 — Remove duplicate `getActionImg()` implementation

**Status:** DONE

**Goal:** Keep one source of truth for action icon mapping.

**Priority:** Low.

**Acceptance criteria:**

- Exactly one implementation is used by spell and alchemical item rendering.
- Both card types still display action icons correctly.

**Implementation note:** The duplicate action-icon mapping was removed from `main.js`. Spell and alchemical item card rendering now share the single `getActionImg()` implementation in `js/CardTemplate.js`.

---

## Follow-up: alchemical items

### ALC-001 — Apply the edit/create/session model to alchemical items

**Status:** DONE

**Goal:** Extend the proven spell editing architecture to alchemical items after the spell workflow is complete.

**Depends on:** UI-005, JS-007

**Acceptance criteria:**

- Requirements are refined for the more complex alchemical item schema before implementation.
- Existing spell editing architecture is reused where appropriate.
- No backend or permanent persistence is introduced.

**Implementation note:** The alchemical item schema and editor representation are documented in R10. Bundled items now receive stable IDs and render from source/effective state merged with edit overlays and custom items in `just-spells.session.v1`. The shared session workflow supports safe edit/create/reset/delete behavior, updated search and selection labels, and text-only rendering for all user-editable item fields without changing the bundled JSON schema.

---

## Print borders

### PRINT-001 — Specify printable card border behavior

**Status:** DONE

**Goal:** Define the expected bordered and borderless print modes before changing rendering or controls.

**Likely files:** `specs/requirements.md`, `specs/architecture.md`

**Acceptance criteria:**

- Bordered printing is documented as the default mode.
- The printed border uses the current `--card-background` color selected by either card view.
- Borderless printing is documented as an explicit user choice that reproduces the current PDF appearance.
- The behavior applies consistently to selected spell and alchemical item cards.
- The specification states whether the mode persists; unless another requirement is added, it is UI state only and resets to bordered mode on reload.

**Implementation note:** R11 and the print-rendering architecture now define bordered printing as the default shared mode. Borderless mode is transient root-level UI state, applies to both card types, and resets on reload.

---

### PRINT-002 — Add a reliable print border

**Status:** DONE

**Goal:** Make selected cards show their configured color around the card in print preview and generated PDFs without relying only on printable backgrounds.

**Depends on:** PRINT-001

**Likely files:** `style.css`, `style/spellCard.css`

**Acceptance criteria:**

- Selected cards have a solid print frame with an explicit width and `var(--card-background)` color that remains visible when browser background graphics are disabled.
- Print CSS requests exact color reproduction with the standard and WebKit print-color-adjust properties.
- Card dimensions and page layout account for the border with `box-sizing: border-box` and do not unexpectedly add pages or clip content.
- Internal colored separators and action icons continue to render correctly.
- Only selected cards are printed.
- The implementation is shared by spell and alchemical item cards.

**Validation:** Select multiple spell and alchemical cards, choose a non-black color, and verify the border in print preview and a generated PDF with browser background graphics both enabled and disabled where the browser permits.

**Implementation note:** Print media gives selected cards a 0.48rem solid frame using `var(--card-background)`, matching the screen frame thickness and keeping it inside existing dimensions with `box-sizing: border-box`. The card content uses the frame's inner edge so it is not inset twice. Exact color reproduction is requested through standard and WebKit properties; the rule is shared by both card types and leaves selected-only filtering intact.

---

### PRINT-003 — Add a borderless print toggle

**Status:** DONE

**Goal:** Let users deliberately print selected cards without the outer colored border.

**Depends on:** PRINT-001, PRINT-002

**Likely files:** `index.html`, `main.js`, `style.css`, `style/spellCard.css`

**Acceptance criteria:**

- An English-labeled non-print control is available from both the spell and alchemical item views.
- Bordered mode is active by default.
- Activating borderless mode removes the outer border in print preview/PDF while retaining card content and internal separators.
- The control clearly communicates the current mode and allows switching back to bordered printing.
- Controls in both views reflect the same shared print mode.
- Toggling the mode does not select/deselect cards and does not alter session-stored spell or alchemical item data.

**Validation:** Toggle both modes from each view and verify spell and alchemical print previews, including after changing the shared card color.

**Implementation note:** Both views now expose synchronized `Print without borders` / `Print with borders` controls. They toggle one root class and ARIA pressed state without touching selection or session persistence. Borderless print CSS removes only the outer border and frame.

---

### PRINT-004 — Run print regression checks

**Status:** IN PROGRESS

**Goal:** Verify the complete print-border behavior and existing browse/print workflows after implementation.

**Depends on:** PRINT-002, PRINT-003

**Likely files:** `specs/tasks.md`

**Acceptance criteria:**

- Spell and alchemical search still work.
- Selection and deselection still work, and unselected cards do not appear in print.
- Black and non-black border colors appear in bordered print preview and generated PDF.
- Borderless mode produces cards without the outer colored border.
- Switching modes does not change card selection or editable session data.
- Changed JavaScript passes `node --check` and changed CSS has no obvious parsing errors in supported browsers.
- The manual validation result and any browser-specific limitation are recorded in the relevant task implementation notes.

**Implementation note:** The selected card's print frame now uses a 0.48rem solid border matching the on-screen frame, so its chosen color is not dependent on background graphics. The local browser loaded and parsed the updated print CSS; spell and alchemical cards share the rule. Interactive print preview/PDF checks with background graphics enabled and disabled remain to be completed manually.

---

## Card editor preview

### PREVIEW-001 — Specify unsaved card preview behavior

**Status:** DONE

**Goal:** Define how previews behave in spell and alchemical item create/edit flows before implementation.

**Likely files:** `specs/requirements.md`, `specs/architecture.md`

**Acceptance criteria:**

- Preview is available in both create and edit modes for spells and alchemical items.
- Preview is explicitly triggered by an English-labeled `Preview` button and does not update continuously.
- Preview uses the current unsaved form values and the current shared card color.
- Preview does not save, create, edit, select, or print a card and does not write to `sessionStorage`.
- Repeated preview requests replace the previous preview rather than appending cards.
- Closing or reopening an editor does not expose stale preview content from a previous editing session.

**Implementation note:** R12 and the editor-preview architecture define an explicit, on-demand preview for both record types. Preview values are disposable DOM data, share the normal form normalization and rendering paths, and never enter application or session state.

---

### PREVIEW-002 — Add a reusable editor preview surface

**Status:** DONE

**Goal:** Add the shared dialog structure and styling needed to display a single card preview without changing save/cancel behavior.

**Depends on:** PREVIEW-001

**Likely files:** `index.html`, `style.css`, `style/spellCard.css`

**Acceptance criteria:**

- Both editor dialogs have a `Preview` button with `type="button"` so it cannot submit the form.
- Each dialog has an accessible preview region with an English label or heading.
- The region fits one normal card within the dialog and remains usable on narrow screens.
- Preview content is visually isolated from selectable cards in the main pools.
- Preview controls and content remain excluded from printing with the editor dialog.
- Existing Save and Cancel controls retain their behavior and remain accessible.

**Implementation note:** Both dialogs now have a non-submitting `Preview` button and an accessible live preview region. Shared responsive styles display one normal-sized card, allow the dialog to scroll, and retain the dialog's existing non-print behavior.

---

### PREVIEW-003 — Preview unsaved spell values

**Status:** DONE

**Goal:** Render the current spell form values on demand without mutating spell or session state.

**Depends on:** PREVIEW-001, PREVIEW-002

**Likely files:** `main.js`

**Acceptance criteria:**

- Clicking the spell editor's `Preview` button reads values through the existing spell form conversion path.
- The preview reuses `spellCardTemplate()` so its layout and safe text rendering match saved spell cards.
- Title, English title, action type, type, level, traditions, attributes, description, and heightenings reflect the unsaved form values.
- HTML/script-like input is displayed as text and cannot execute.
- Previewing does not change effective spells, selections, search results, or session storage.
- Canceling after preview leaves the original spell or spell pool unchanged.

**Implementation note:** Spell preview reads the current form through `getSpellEditorValues()` and renders it with `spellCardTemplate()`. Each request replaces the prior temporary card without invoking save, selection, search, or persistence code.

---

### PREVIEW-004 — Preview unsaved alchemical item values

**Status:** DONE

**Goal:** Render the current alchemical item form values on demand without mutating item or session state.

**Depends on:** PREVIEW-001, PREVIEW-002

**Likely files:** `main.js`

**Acceptance criteria:**

- Clicking the alchemical editor's `Preview` button reads values through the existing alchemical form conversion path.
- The preview reuses `alchemicalItemCardTemplate()` so its layout and safe text rendering match saved item cards.
- Comma-separated tags and line-separated tier values use the same normalization as Save.
- All other rendered fields and the controlled action icon reflect the unsaved form values.
- Existing bounded text autosizing is applied to the preview where required.
- HTML/script-like input is displayed as text and cannot execute.
- Previewing does not change effective items, selections, search results, or session storage.
- Canceling after preview leaves the original item or item pool unchanged.

**Implementation note:** Alchemical preview reads the current form through `getAlchemicalItemEditorValues()`, renders it with `alchemicalItemCardTemplate()`, and applies bounded autosizing within the preview card. Its temporary values use the same tag and tier normalization as Save.

---

### PREVIEW-005 — Clear previews and run editor regressions

**Status:** DONE

**Goal:** Prevent stale previews and verify preview integration against existing editor workflows.

**Depends on:** PREVIEW-003, PREVIEW-004

**Likely files:** `main.js`, `specs/tasks.md`

**Acceptance criteria:**

- Opening create or edit mode starts with an empty/hidden preview region.
- Saving, canceling, or otherwise closing a dialog clears its preview.
- Multiple preview clicks maintain exactly one preview card.
- Spell and alchemical create, edit, reset, delete, search, selection, and printing still work.
- Previewing followed by Cancel produces no session-storage change; previewing followed by Save persists only the saved form values.
- The current card color is visible in both preview types.
- Changed JavaScript passes `node --check` and the application loads through a local HTTP server.
- Manual browser results and any environment limitations are recorded in the implementation note.

**Implementation note:** Preview regions are cleared on create/edit open, Save, Cancel, and native dialog close. JavaScript syntax checks and `git diff --check` passed, the application loaded through Caddy, and a headless Firefox smoke test passed for spell/alchemical rendering, replacement, safe HTML-like text, array normalization, Cancel cleanup, and unchanged session storage. Interactive print-preview validation remains subject to the existing environment limitation recorded in PRINT-004.

### UI-006 — Polish card layout and tab switching

**Status:** DONE

**Goal:** Keep card actions within the title row, align titles and action symbols, and avoid tab-switch layout flashes.

**Implementation note:** Card title rows now use centered flex alignment, edit actions fit inside the row, and card borders and color controls share the same initial color. Tab switching uses direct element/class updates without synchronous text autosizing. Catalog filtering now reuses each card's record object instead of serializing and reparsing it on each keystroke.

### CARD-PAGES-001 — Continue overflowing card text on numbered cards

**Status:** IN PROGRESS

**Goal:** Keep long record text readable by continuing overflowing content on additional cards.

**Acceptance criteria:**

- Text that exceeds a card's content area continues on additional cards with the same title and repeated card framing.
- Multi-card titles show their page number and total, such as `(1/2)` and `(2/2)`.
- Continuation cards remain searchable with their record, and selecting or deselecting one selects or deselects every card in the set.
- Printing selected records includes every continuation page.
- Editor previews use the same continuation layout as catalog cards.
- Existing one-card records keep their original titles and selection behavior.

**Implementation note:** Added a shared DOM-measured paginator for all discovered types. It fills each card's existing body, splits overflowing text at word boundaries (falling back to character boundaries for unbroken text), repeats the title and footer, and groups continuation pages for selection and printing. Browser verification confirms Alucinación begins on card `(1/2)` and continues on `(2/2)`, with no third empty card or content overflow. Selecting or deselecting either page toggles the full set. JavaScript syntax checks pass. Print preview remains unverified because the browser tab became unresponsive when opening it; the local HTTP check was also blocked by sandbox access to port 8080.

### DATA-IMPORT-001 — Import validated typed JSON datasets

**Status:** IN PROGRESS

**Goal:** Let users add a resource-format JSON dataset to its matching catalog for the current browser session.

**Acceptance criteria:**

- A global import button is available on every catalog view.
- The imported dataset type must match a discovered catalog, and all records must match the bundled field names and value types.
- Valid records are added to the matching catalog and persist across reloads in the same session.
- Invalid JSON, unknown types, and invalid records are rejected without partially changing catalogs or session storage.
- Imported records support the existing search, filters, editing, selection, and printing behavior.

**Implementation note:** Added the shared header picker, type/schema validation, all-record validation before mutation, type-aware normalization, and session-backed import into the existing custom record stores. Browser loading confirms the enabled import button remains alongside all seven generated catalog tabs. Added `resources/test_spells_import.json`, an unindexed fixture containing three invented spells with the exact bundled spell schema for manual import checks. `node --check` passes for both JavaScript files, `git diff --check` passes, and every bundled dataset has consistent record fields. Direct valid/invalid file-picker and reload verification remains pending because the browser evaluation bridge does not expose file/session APIs.

### PRINT-DUPLEX-001 — Print matching card backs for long-edge duplex

**Status:** IN PROGRESS

**Goal:** Add an optional colored card back aligned to each selected card when printing portrait sheets duplex on the long edge.

**Acceptance criteria:**

- A synchronized toggle is available in every catalog sidebar and starts disabled.
- Enabled duplex printing creates one matching back sheet after each front sheet, with up to nine card positions per sheet.
- Back positions mirror horizontally and only correspond to occupied front card positions.
- Back fill uses the chosen shared card color; borderless mode removes only the outer frame.
- Selected-only printing and normal catalog rendering remain unchanged.

**Implementation note:** Added R18 and documented the temporary print-document approach. The UI now exposes synchronized duplex toggles across all seven catalog sidebars, and browser checks confirmed that enabling one updates all seven labels and pressed states. The renderer groups selected card pages into 3-by-3 front sheets and builds horizontally mirrored color-back sheets. Back cards now use a double inset frame and a central diamond medallion in the same navy, cream, and gold palette as the front border. `node --check` and `git diff --check` pass. Print preview remains unverified because opening native print preview has made the browser automation unresponsive in this environment.
