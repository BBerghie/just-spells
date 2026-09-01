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

**Status:** TODO

**Goal:** Build the effective spell list from immutable source records plus session edits/custom records.

**Depends on:** JS-004

**Acceptance criteria:**

- A session edit overrides the matching source spell in the rendered list.
- A session custom spell appears in the rendered list.
- With empty session state, rendering matches the source dataset.
- Unknown/stale edit IDs are ignored safely.

---

## Spell editor

### UI-001 — Add an explicit Edit action to spell cards

**Status:** TODO

**Goal:** Let the user request editing without interfering with select/deselect behavior.

**Depends on:** JS-005

**Likely files:** `index.html`, `main.js`, `js/CardTemplate.js`, `style.css`, `style/spellCard.css`

**Acceptance criteria:**

- Each spell exposes an English-labeled Edit action in non-print UI.
- Clicking Edit does not toggle card selection.
- Edit controls are not printed.

---

### UI-002 — Add a spell editor form

**Status:** TODO

**Goal:** Provide a simple form for the fields currently used by spell card rendering.

**Depends on:** UI-001

**Likely files:** `index.html`, `style.css`, `main.js`

**Acceptance criteria:**

- The form opens with the current effective spell values.
- The user can change title, English title, action type, type, level, traditions, cast time, range, area, duration, objectives, trigger, description, and heightenings as applicable.
- Save and Cancel actions are available.
- Cancel performs no mutation.
- Form labels and messages are in English.

---

### JS-006 — Save spell edits safely

**Status:** TODO

**Goal:** Save edited values into application/session state and re-render the card.

**Depends on:** UI-002

**Acceptance criteria:**

- Save updates the effective spell immediately.
- Save writes the edit to session storage.
- The change survives reload in the same browser session.
- Edited user text cannot execute injected HTML or JavaScript.
- Search uses the edited titles after saving.

---

### UI-003 — Reset an edited source spell

**Status:** TODO

**Goal:** Allow a source spell with session edits to be restored to its bundled value.

**Depends on:** JS-006

**Acceptance criteria:**

- Reset is offered only when a source spell has session changes.
- Reset removes the edit overlay from session storage.
- The original source version is immediately rendered.
- Selection state does not unexpectedly toggle when Reset is clicked.

---

## Custom spells

### UI-004 — Add Create spell flow

**Status:** TODO

**Goal:** Reuse the spell editor form to create a new session-only spell.

**Depends on:** JS-006

**Acceptance criteria:**

- A non-print `Create spell` action is available in the spell view.
- It opens the spell form in create mode.
- Saving generates a unique custom spell ID.
- The new card appears immediately.
- The custom spell is written to session storage.
- Cancel creates nothing.

---

### UI-005 — Delete a custom spell

**Status:** TODO

**Goal:** Allow session-created spells to be removed.

**Depends on:** UI-004

**Acceptance criteria:**

- Delete is offered for custom spells, not bundled source spells.
- Deleting removes the spell from state and session storage.
- The card disappears immediately.
- Deleting a selected custom card does not leave stale selection-list UI behind.

---

## Cleanup directly supporting the feature

### JS-007 — Make card rendering safe for editable text

**Status:** TODO

**Goal:** Remove unsafe interpolation paths for fields that can contain user-entered values.

**Depends on:** JS-006

**Likely files:** `js/CardTemplate.js`, possibly `main.js`

**Acceptance criteria:**

- User-editable values are inserted as text or explicitly escaped.
- Existing bundled descriptions still render correctly for expected plain-text data.
- Action icons continue to render from controlled application values.

---

### BUG-001 — Repair or remove broken native text autosizing implementation

**Status:** TODO

**Goal:** Address `autoSizeText()` using jQuery-style `.css()` on native elements.

**Priority:** Low unless editing exposes overflow problems.

**Acceptance criteria:**

- No native element calls a nonexistent `.css()` method.
- If autosizing remains, it has a lower font-size bound and cannot loop indefinitely.
- Existing cards do not regress visually.

---

### CLEAN-001 — Remove duplicate `getActionImg()` implementation

**Status:** TODO

**Goal:** Keep one source of truth for action icon mapping.

**Priority:** Low.

**Acceptance criteria:**

- Exactly one implementation is used by spell and alchemical item rendering.
- Both card types still display action icons correctly.

---

## Follow-up: alchemical items

### ALC-001 — Apply the edit/create/session model to alchemical items

**Status:** TODO

**Goal:** Extend the proven spell editing architecture to alchemical items after the spell workflow is complete.

**Depends on:** UI-005, JS-007

**Acceptance criteria:**

- Requirements are refined for the more complex alchemical item schema before implementation.
- Existing spell editing architecture is reused where appropriate.
- No backend or permanent persistence is introduced.
