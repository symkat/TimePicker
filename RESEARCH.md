# Research: Event Scheduling App (TimePicker)

## Concept

A "Doodle/When2meet"-style app where a user creates an event with multiple date/time options and optional poll questions, shares a link, and friends respond with their availability and answers.

---

## Environment

- **Sprite VM**: Ubuntu 25.10, 8 CPU cores, 16GB RAM
- **Ruby**: 3.4.6 (pre-installed)
- **Node**: 22.20.0 (pre-installed), npm 11.11.1
- **Bundler**: 4.0.8
- **PostgreSQL 17**: Available via apt, not yet installed
- **Rails**: Not yet installed (gem install needed)
- **Sprite services**: Used to run Postgres and Rails as managed long-running processes

### Postgres on Sprite

PostgreSQL needs `/run/postgresql/` for its unix socket and PID file. On this VM, `/run` is a tmpfs that gets wiped on reboot. The solution is a wrapper script that ensures `/run/postgresql/` exists (with correct permissions) before starting Postgres each time.

The data directory (`/var/lib/postgresql/`) is on persistent disk, so data survives reboots — only the runtime dir needs recreation.

---

## Key Architecture Decisions

### 1. Rails Version: 8.x (latest)

**Pros**: Latest conventions, built-in features (Hotwire/Turbo by default), active support.
**Cons**: None significant — this is a greenfield project.

### 2. Frontend Approach: Hotwire (Turbo + Stimulus) vs. React/Vue SPA

#### Option A: Hotwire (Turbo + Stimulus) — Recommended

- Ships with Rails 8 by default, zero extra setup
- Turbo Frames and Turbo Streams give real-time page updates without a full SPA
- Stimulus provides lightweight JS for interactive widgets (date pickers, checkboxes)
- Simpler deployment — no separate frontend build pipeline
- Perfect fit for this app's complexity level (forms, lists, checkboxes)

#### Option B: React/Vue SPA

- More powerful for highly interactive UIs
- Requires API-only Rails backend + separate frontend build
- Much more complexity for a relatively simple CRUD + polling app
- Overkill here

**Decision**: Hotwire. The app is form-centric with some real-time updates — exactly what Turbo excels at.

### 3. Real-time Updates

When friends submit their availability, the event page should update for everyone viewing it.

#### Option A: Turbo Streams over ActionCable (WebSockets)

- Built into Rails, streams partial updates to all connected browsers
- True real-time — instant updates when someone responds
- Requires a persistent WebSocket connection per viewer

#### Option B: Turbo Streams via polling

- Simpler — periodic page refresh via `<meta>` or Turbo Drive
- Small delay (e.g., 5-10 seconds) between updates
- No WebSocket infrastructure needed

**Decision**: Start with ActionCable/Turbo Streams for true real-time. Rails makes this easy and it's a better UX. Fall back to polling if WebSocket complexity becomes an issue.

### 4. Date/Time Picker UI

The user needs to select multiple date+time slots when creating an event. This needs to feel modern.

#### Option A: Flatpickr

- Lightweight (~16KB), no dependencies
- Supports date+time, multiple selections, inline calendar
- Easy to integrate with Stimulus
- Well-maintained, good docs

#### Option B: Vanilla HTML date/time inputs

- No dependencies
- Browser-native, but inconsistent across browsers
- Poor UX for selecting multiple date/time combos

#### Option C: Full calendar library (FullCalendar, etc.)

- Very powerful, calendar grid view
- Heavy (~50KB+), may be more than needed
- Better for viewing schedules than picking date/time slots

**Decision**: Flatpickr for the date/time selection UI, wrapped in a Stimulus controller. It's the right balance of modern UX, lightweight footprint, and ease of integration.

### 5. Database Schema Approach

#### Event Identification: UUID vs. Slug vs. Sequential ID

- **UUID**: Unguessable, good for share links (`/events/a1b2c3d4-...`)
- **Short random slug**: Nicer URLs (`/events/xK9mP2`), still unguessable
- **Sequential ID**: Guessable — bad for a sharing app

**Decision**: Short random token for share URLs (e.g., 8-character alphanumeric). Store as a unique indexed column alongside the normal primary key.

#### Time Slots: Separate model vs. JSON column

- **Separate model (EventTimeSlot)**: Normalized, queryable, each slot can have responses linked to it via foreign key. Standard Rails associations.
- **JSON column**: Simpler schema, but harder to query and link responses to specific slots.

**Decision**: Separate `EventTimeSlot` model. Responses need to reference specific time slots, so normalization is the right call.

### 6. Authentication

The event creator and respondents are casual users — no account creation.

#### Option A: No auth at all

- Creator gets a link, respondents just type their name
- Simplest possible UX, lowest friction
- Risk: Anyone with the link can impersonate or edit responses

#### Option B: Session-based creator token

- When you create an event, a "creator token" is stored in your browser session/cookie
- Creator can edit/manage the event from that browser
- Respondents still just type their name (no login)
- Good balance of simplicity and control

#### Option C: Magic link / email auth

- More secure, but adds friction and email infrastructure
- Overkill for casual event planning

**Decision**: Option B — session-based creator token. The creator gets management capabilities tied to their browser session. Respondents just enter a name. This matches how When2meet and Doodle work for simple use cases.

### 7. CSS Framework

#### Option A: Tailwind CSS

- Ships well with Rails 8 (tailwindcss-rails gem)
- Utility-first, rapid styling
- Modern look with minimal custom CSS

#### Option B: Bootstrap

- Component-ready (modals, cards, forms)
- Heavier, more opinionated

#### Option C: Minimal custom CSS

- Full control, but slower to develop

**Decision**: Tailwind CSS via the `tailwindcss-rails` gem. Fast to develop, modern aesthetic, great Rails integration.

### 8. Poll Questions

Questions can be various types. What to support?

- **Free text**: Open-ended answers
- **Single choice**: Radio buttons
- **Multiple choice**: Checkboxes

**Decision**: Support free text and multiple choice to start. These cover most event planning questions ("What should we bring?", "Which restaurant do you prefer?"). Can add more types later.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Postgres runtime dir wiped on reboot | Wrapper script recreates `/run/postgresql` before starting |
| No email infrastructure for notifications | Keep it URL-share based, no email required |
| Time zone confusion for event times | Store all times in UTC, display in the creator's chosen timezone (stored on event) |
| Concurrent response edits | Turbo Streams broadcast updates; optimistic UI is fine for this use case |
| Spam/abuse on public event links | Rate limiting on responses; optional: creator can delete responses |
