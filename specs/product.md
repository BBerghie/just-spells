# Product Specification

## Product

**Just Spells** is a lightweight, static web tool for creating printable Pathfinder 2e reference cards from structured JSON data.

## Problem

Pathfinder spell and item descriptions are useful during play but are not always convenient to consult quickly. Just Spells turns structured game data into compact cards that can be searched, selected, and printed.

## Current capabilities

The application currently:

- loads spell data from `resources/spells.json`;
- loads alchemical item data from `resources/alchemical_items.json`;
- renders the records as printable cards;
- provides separate spell and alchemical item views;
- searches cards by title;
- lets the user select cards for printing;
- allows the card background color to be changed;
- uses the browser print dialog to print selected cards.

## Near-term product direction

The next goal is to make the generated cards customizable without adding a backend.

Users should be able to:

- edit the content of an existing card;
- create a new custom card;
- save edited and custom cards for the current browser session;
- continue searching, selecting, and printing edited/custom cards like source cards;
- discard session changes and return to the original source data.

## Persistence model

The application has no server and no account system.

Source JSON files are read-only application data. User-created and user-edited cards are session data. Session data should be stored in browser `sessionStorage` so it can survive page reloads in the same browser tab/session but is not treated as permanent remote storage.

A later feature may add explicit JSON import/export, but that is outside the initial editing feature unless added to `requirements.md`.

## Product principles

- Keep the application static and dependency-free.
- Keep printing fast and predictable.
- Make editing reversible.
- Never overwrite or depend on modifying the bundled JSON files from the browser.
- Prefer a simple interface over a general-purpose card designer.
- Preserve compatibility with static hosting such as GitHub Pages.
