# Implementation Plan: TimePicker

## Phase 1: Environment Setup

### 1.1 Install Dependencies
- `sudo apt-get install postgresql-17 libpq-dev` (Postgres + dev headers for the `pg` gem)
- `gem install rails` (latest Rails 8.x)

### 1.2 Postgres Wrapper Script
Create `/home/sprite/scripts/start-postgres.sh`:
```bash
#!/bin/bash
# Ensure runtime directory exists (tmpfs /run is wiped on reboot)
sudo mkdir -p /run/postgresql
sudo chown postgres:postgres /run/postgresql

# Start Postgres in the foreground
exec sudo -u postgres /usr/lib/postgresql/17/bin/postgres \
  -D /var/lib/postgresql/17/main \
  -c config_file=/etc/postgresql/17/main/postgresql.conf
```

### 1.3 Sprite Services
```bash
# Postgres service
sprite-env services create postgres \
  --cmd /home/sprite/scripts/start-postgres.sh

# Rails service (created after app scaffolding)
sprite-env services create rails \
  --cmd bin/rails --args server,-b,0.0.0.0,-p,3000 \
  --dir /home/sprite/TimePicker \
  --needs postgres \
  --http-port 3000
```

### 1.4 Create Rails App
```bash
rails new TimePicker --database=postgresql --css=tailwind \
  --skip-git --force   # --force to use existing directory
```
Configure `config/database.yml` for local Postgres (host: localhost, user: timepicker).

Create the database role and databases:
```bash
sudo -u postgres createuser -s timepicker
sudo -u postgres createdb timepicker_development -O timepicker
sudo -u postgres createdb timepicker_test -O timepicker
```

---

## Phase 2: Data Model

### Models and Schema

```
Event
  - id (bigint, PK)
  - title (string, required)
  - description (text, optional)
  - location (string, optional)
  - timezone (string, default: "UTC")
  - share_token (string, unique, indexed) — 8-char random alphanumeric
  - creator_token (string) — stored in creator's session for edit access
  - created_at, updated_at

EventTimeSlot
  - id (bigint, PK)
  - event_id (FK -> Event)
  - starts_at (datetime, required)
  - ends_at (datetime, optional)
  - created_at, updated_at

Question
  - id (bigint, PK)
  - event_id (FK -> Event)
  - prompt (string, required)
  - question_type (string: "free_text" | "multiple_choice")
  - options (text array, for multiple_choice — stored as Postgres array)
  - position (integer, for ordering)
  - created_at, updated_at

Respondent
  - id (bigint, PK)
  - event_id (FK -> Event)
  - name (string, required)
  - created_at, updated_at

TimeSlotSelection
  - id (bigint, PK)
  - respondent_id (FK -> Respondent)
  - event_time_slot_id (FK -> EventTimeSlot)
  - created_at
  (unique index on [respondent_id, event_time_slot_id])

Answer
  - id (bigint, PK)
  - respondent_id (FK -> Respondent)
  - question_id (FK -> Question)
  - value (text) — free text answer or JSON array of selected options
  - created_at, updated_at
  (unique index on [respondent_id, question_id])
```

### Associations
```
Event
  has_many :event_time_slots, dependent: :destroy
  has_many :questions, dependent: :destroy
  has_many :respondents, dependent: :destroy

EventTimeSlot
  belongs_to :event
  has_many :time_slot_selections, dependent: :destroy

Question
  belongs_to :event
  has_many :answers, dependent: :destroy

Respondent
  belongs_to :event
  has_many :time_slot_selections, dependent: :destroy
  has_many :answers, dependent: :destroy

TimeSlotSelection
  belongs_to :respondent
  belongs_to :event_time_slot

Answer
  belongs_to :respondent
  belongs_to :question
```

---

## Phase 3: Routes and Controllers

### URL Structure
```
GET    /                        → Home page (create event CTA)
GET    /events/new              → Event creation form
POST   /events                  → Create event
GET    /events/:share_token     → Public event page (view + respond)
GET    /events/:share_token/edit → Edit event (creator only, via session)
PATCH  /events/:share_token     → Update event (creator only)
POST   /events/:share_token/responses → Submit a response (name + selections + answers)
```

Events are looked up by `share_token` in all public routes — the numeric ID is never exposed.

### Controllers
- `PagesController#home` — Landing page
- `EventsController` — CRUD for events (create, show, edit, update)
- `ResponsesController` — Handles friend responses (create)

---

## Phase 4: Event Creation Flow

### 4.1 Event Form (`events/new`)
A single-page form with sections:

1. **Event Details**: Title, description (optional), location (optional), timezone selector
2. **Date/Time Slots**: Interactive UI to add multiple date+time slots
   - Flatpickr calendar (inline) for date selection
   - Time inputs for start time (end time optional)
   - "Add another slot" button, list of added slots with remove option
   - Stimulus controller manages the dynamic slot list
3. **Questions** (optional):
   - "Add a question" button
   - For each question: prompt text, type selector (free text / multiple choice)
   - For multiple choice: dynamic option inputs ("Add option" button)
   - Stimulus controller for dynamic question/option management
4. **Submit** → Creates event, redirects to the event page

### 4.2 On Creation
- Generate `share_token` (8-char SecureRandom.alphanumeric)
- Generate `creator_token`, store in session
- Redirect to `/events/:share_token` with a flash showing the shareable link

---

## Phase 5: Event Page (Public View + Response)

### 5.1 Layout
The event page (`/events/:share_token`) has two main sections:

**Top Section — Event Info:**
- Title, description, location
- Grid/table of time slots with respondent availability
  - Columns: each time slot (date + time)
  - Rows: each respondent
  - Cells: checkmark or empty
  - Summary row: total count per slot, highlight the best slot(s)

**Bottom Section — Response Form:**
- Name input
- Checkbox grid: all time slots, check the ones that work
- Questions with appropriate input types
- Submit button

### 5.2 Real-time Updates
- ActionCable channel: `EventChannel` scoped to `share_token`
- When a response is submitted, broadcast a Turbo Stream that appends/updates the availability grid
- All viewers see new responses appear without refreshing

---

## Phase 6: Styling and UX

- **Tailwind CSS** for all styling
- Responsive design (mobile-first — people will open event links on phones)
- Clean card-based layout
- Color-coded availability grid (green = available, gray = unavailable)
- Highlight the time slot(s) with the most availability
- Flatpickr themed to match the app's design

---

## Phase 7: Polish and Edge Cases

- **Validation**: Require title, at least one time slot, respondent name
- **Duplicate respondent names**: Allow (but show a warning)
- **Creator editing**: Can add/remove time slots and questions after creation (existing responses for removed slots are cleaned up)
- **Timezone display**: Show times in the event's configured timezone
- **Empty state**: Friendly message when no one has responded yet
- **Mobile UX**: Horizontal scroll for the availability grid if many time slots

---

## File Structure (Key Files)
```
app/
  models/
    event.rb
    event_time_slot.rb
    question.rb
    respondent.rb
    time_slot_selection.rb
    answer.rb
  controllers/
    pages_controller.rb
    events_controller.rb
    responses_controller.rb
  channels/
    event_channel.rb
  views/
    pages/home.html.erb
    events/
      new.html.erb
      show.html.erb
      edit.html.erb
      _availability_grid.html.erb
      _response_form.html.erb
    responses/
      _respondent_row.turbo_stream.erb
  javascript/
    controllers/
      time_slot_picker_controller.js
      question_form_controller.js
      flatpickr_controller.js
scripts/
  start-postgres.sh
```

---

## Implementation Order

1. Environment setup (Postgres, Rails, Sprite services)
2. Database schema and models
3. Event creation form (with Flatpickr and dynamic fields)
4. Event show page (availability grid)
5. Response submission
6. Real-time updates (Turbo Streams + ActionCable)
7. Creator editing
8. Styling polish and mobile responsiveness
9. Edge cases and validation
