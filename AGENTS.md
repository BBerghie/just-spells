# AGENTS.md

## Project overview

Just Spells is a small, static browser tool for browsing Pathfinder 2e spells and alchemical items, selecting cards, and printing them.

The project intentionally uses plain HTML, CSS, and vanilla JavaScript. It has no backend, package manager, build step, framework, or database.

## Language

All project-facing content must be written in English, including:

- source code identifiers and comments;
- UI labels and messages introduced or changed by new work;
- README and documentation;
- specifications and task descriptions;
- developer-facing console messages.

Existing Pathfinder content loaded from JSON may remain in its source language. Do not translate game data unless a task explicitly requires it.

## Read before changing code

Before implementing a task, read:

1. `specs/product.md`
2. `specs/requirements.md`
3. `specs/architecture.md`
4. `specs/tasks.md`

Inspect the relevant existing code before editing it. This is an existing project, so preserve working behavior unless a specification explicitly changes it.

## Working rules

- Work on one task from `specs/tasks.md` at a time.
- Keep changes small and directly related to the current task.
- Do not introduce a framework, bundler, package manager, or backend unless a specification explicitly requires it.
- Prefer browser-native APIs and small vanilla JavaScript modules/functions.
- Keep the source JSON files immutable at runtime. User edits and user-created cards belong to session state.
- Use `sessionStorage` for state that must survive a page reload within the same browser session.
- Treat loaded JSON data as source data and user modifications as overlays/copies, not as mutations of the JSON files.
- Preserve printing behavior: only selected cards should be printed.
- Avoid unrelated refactors while implementing a feature.
- Do not silently change the data schema. Document any intentional schema change first.
- Escape or safely render user-editable content. Do not inject arbitrary user input into HTML without considering XSS.

## Validation

There is currently no automated test suite or build command.

For every implementation task:

- run JavaScript syntax checks when possible (`node --check <file>`);
- load the application through a local HTTP server rather than `file://`, because it uses `fetch()`;
- manually verify the task's acceptance criteria in a browser;
- verify that spell search still works;
- verify that alchemical item search still works when the task touches shared behavior;
- verify selection and deselection;
- verify print preview for selected cards when rendering or selection behavior changes;
- verify that a page reload behaves according to the session-state requirements when persistence is involved.

A simple local server can be started from the repository root with:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Definition of done

A task is done only when:

- its acceptance criteria are satisfied;
- existing related behavior still works;
- changed JavaScript has no syntax errors;
- new UI/developer-facing text is in English;
- `specs/tasks.md` is updated to reflect the task status and any important implementation note.

## Scope guardrails

This project should remain easy to open, understand, and host as static files. Prefer the smallest design that supports the requested behavior.
