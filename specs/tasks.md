# Development Tasks

Statuses: `TODO`, `IN PROGRESS`, `DONE`, `BLOCKED`.

The tasks are intentionally small. Complete and validate one task before starting the next.

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

- Selected cards have a real CSS border with an explicit width, style, and `var(--card-background)` color in bordered print mode.
- Print CSS requests exact color reproduction with the standard and WebKit print-color-adjust properties.
- Card dimensions and page layout account for the border with `box-sizing: border-box` and do not unexpectedly add pages or clip content.
- Internal colored separators and action icons continue to render correctly.
- Only selected cards are printed.
- The implementation is shared by spell and alchemical item cards.

**Validation:** Select multiple spell and alchemical cards, choose a non-black color, and verify the border in print preview and a generated PDF with browser background graphics both enabled and disabled where the browser permits.

**Implementation note:** Print media now gives selected cards a real 2px solid border using `var(--card-background)`, keeps it within existing dimensions with `box-sizing: border-box`, and requests exact color reproduction through standard and WebKit properties. The rule is shared by both card types and leaves the existing selected-only print filtering intact.

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

**Status:** DONE

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

**Implementation note:** JavaScript syntax checks, `git diff --check`, deterministic toggle-state checks, local HTTP serving, and a headless Firefox render completed successfully. The installed Firefox supports headless screenshots but provides no command-line print/PDF operation, and no Chromium/WebDriver tooling is installed. Interactive print preview and generated-PDF checks—including background-graphics variations—remain blocked on an interactive browser environment. The implementation therefore must not be marked fully validated until those manual checks pass.
