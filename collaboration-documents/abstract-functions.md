# Abstract Functions Collaboration Document

This document lists the important public app-level functions and their responsibilities. Administration handlers are documented in the separate `../talkware_admin_hub` project.

## App Orchestration

### `App`

Location: `src/App.tsx`

- Owns `showSplash`.
- Renders `SplashScreen` until completion.
- Mounts public app routes after the splash transition.

## Landing Page Functions

### `fetchData`

Location: `src/pages/LandingPage.tsx`

- Runs once on page load.
- Fetches public events, highlights, and contributor data.
- Filters events with `archived = false`.
- Updates local React state when each query returns rows.

### `displayEvents`

Location: `src/pages/LandingPage.tsx`

- Supplies the non-archived events rendered as public event cards.

### `displayHighlights`

Location: `src/pages/LandingPage.tsx`

- Uses database highlights when available.
- Falls back to bundled highlight content when the table is empty.

## Event Detail Functions

### `getYouTubeEmbedId(url)`

Location: `src/pages/EventDetailPage.tsx`

- Accepts common YouTube URL forms or a raw video ID.
- Returns the video ID when a pattern matches and `null` otherwise.

### `fetchData`

Location: `src/pages/EventDetailPage.tsx`

- Runs when the route `id` changes.
- Fetches one event, its ordered media and sections, and linked highlights.
- Updates detail-page state.

### `photos`, `videos`, `groupedSections`

Location: `src/pages/EventDetailPage.tsx`

- `photos` and `videos` filter event media by type.
- `groupedSections` groups event sections by `section_type`.
