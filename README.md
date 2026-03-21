# TimePicker

A web app for scheduling events with friends. Create an event with multiple date/time options and optional poll questions, share a link, and let your friends vote on when they're available.

Think Doodle or When2meet, but simple and self-hosted.

## Features

- **Create events** with a title, description, location, and multiple date/time options
- **Share a link** — no accounts or sign-ups required for respondents
- **Collect availability** — friends check which time slots work for them
- **Poll questions** — ask free-text or multiple-choice questions alongside availability
- **Availability grid** — see at a glance who can make which time, with the best option highlighted
- **Auto timezone detection** — the creator's timezone is detected automatically via the browser
- **Creator editing** — the event creator can edit event details; a persistent creator link allows access from any device
- **Respondent editing** — respondents get a personal edit link to update their response from any browser
- **Finalize events** — creator picks the winning time slot; new responses are locked, existing respondents can still edit
- **Calendar integration** — after finalizing, download an .ics file or add directly to Google Calendar
- **Mobile friendly** — responsive design works on phones and tablets

## How It Works

1. A user visits the app and creates an event, adding possible dates/times and optional questions
2. The app generates a unique shareable link (e.g., `/events/xK9mP2a3`) and a creator link for managing the event from any device
3. Friends open the link, enter their name, check the time slots that work, answer any questions, and submit
4. Everyone can see the availability grid update with each new response
5. The time slot with the most votes is highlighted
6. Respondents can edit their response via their personal edit link; creators can manage all responses via their creator link
7. When ready, the creator finalizes the event by choosing a time slot — calendar links become available for everyone

## Tech Stack

- **Ruby 3.4** / **Rails 8.1**
- **PostgreSQL 17**
- **Tailwind CSS** (via tailwindcss-rails)
- **Hotwire** — Turbo Drive for navigation, Stimulus for interactive form controls
- **Importmap** — no Node.js build step for JavaScript

## Data Model

```
Event
 ├── EventTimeSlot (one per date/time option)
 │    └── TimeSlotSelection (join: which respondents picked this slot)
 ├── Question (free_text or multiple_choice)
 │    └── Answer (one per respondent per question)
 └── Respondent (a friend who responded)
      ├── TimeSlotSelections
      └── Answers
```

- **Events** are identified publicly by an 8-character `share_token` (never the numeric ID)
- **Creator access** is managed via a `creator_token` — stored in the browser session, but can be restored via a claim link (`/events/:share_token/claim?token=...`)
- **Respondent access** is managed via an `edit_token` on each respondent — embedded in edit URLs so respondents can update their response from any browser
- **No accounts** — neither creators nor respondents need to sign up

## Project Structure

```
app/
  controllers/
    pages_controller.rb       # Landing page
    events_controller.rb      # Event CRUD (create, show, edit, update)
    responses_controller.rb   # Respondent submissions
  models/
    event.rb                  # Token generation, timezone normalization
    event_time_slot.rb        # A possible date/time for an event
    question.rb               # Free-text or multiple-choice poll question
    respondent.rb             # A friend who responded to an event
    time_slot_selection.rb    # Join: respondent selected a time slot
    answer.rb                 # A respondent's answer to a question
  javascript/controllers/
    time_slots_controller.js  # Add/remove time slot rows in the form
    questions_controller.js   # Add/remove question blocks in the form
    question_options_controller.js  # Toggle multiple-choice options
    timezone_controller.js    # Auto-detect browser timezone
  views/
    pages/home.html.erb       # Landing page with CTA
    events/new.html.erb       # Event creation form
    events/show.html.erb      # Event page: availability grid + response form
    events/edit.html.erb      # Edit event details (creator only)
scripts/
  start-postgres.sh           # Wrapper that recreates /run/postgresql on boot
```

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Landing page |
| GET | `/events/new` | Event creation form |
| POST | `/events` | Create an event |
| GET | `/events/:share_token` | View event + respond |
| GET | `/events/:share_token/edit` | Edit event (creator only) |
| PATCH | `/events/:share_token` | Update event (creator only) |
| GET | `/events/:share_token/claim` | Restore creator session via token |
| POST | `/events/:share_token/finalize` | Finalize event with chosen time slot (creator only) |
| DELETE | `/events/:share_token/unfinalize` | Reopen event for new responses (creator only) |
| GET | `/events/:share_token/calendar` | Download .ics calendar file (finalized only) |
| POST | `/events/:share_token/responses` | Submit a response |
| GET | `/events/:share_token/responses/:edit_token/edit` | Edit a response |
| PATCH | `/events/:share_token/responses/:edit_token` | Update a response |
| DELETE | `/events/:share_token/responses/:edit_token` | Remove a response (creator only) |

## Installation on Sprite

The easiest way to get started is with the install script:

```bash
git clone git@github.com:symkat/TimePicker.git
cd TimePicker
bash install.sh
```

The install script handles everything:

1. Installs PostgreSQL 17 and the `libpq-dev` headers
2. Installs the Rails gem
3. Creates the Postgres wrapper script at `~/scripts/start-postgres.sh` (handles `/run/postgresql` being wiped on reboot since `/run` is a tmpfs)
4. Registers Postgres as a Sprite service
5. Creates the database user and development/test databases
6. Runs database migrations
7. Builds Tailwind CSS
8. Registers Rails as a Sprite service on port 3000 (with HTTP proxy routing)

After installation, the app is accessible through the Sprite proxy URL.

### Manual Installation

If you prefer to set things up yourself:

```bash
# Install system dependencies
sudo apt-get update -qq
sudo apt-get install -y -qq postgresql-17 libpq-dev

# Install Rails
gem install rails --no-document

# Set up Postgres runtime directory and start it
sudo mkdir -p /run/postgresql
sudo chown postgres:postgres /run/postgresql
sudo chmod 775 /run/postgresql
sudo pg_ctlcluster 17 main start

# Create database user
sudo -u postgres createuser -s $(whoami)

# Install gems and set up the database
bundle install
bin/rails db:create db:migrate

# Build CSS
bin/rails tailwindcss:build

# Start the server
bin/rails server -b 0.0.0.0 -p 3000
```

### Sprite Services

The app runs as two Sprite services:

- **postgres** — PostgreSQL 17 via the wrapper script
- **rails** — Rails development server on port 3000 (depends on postgres)

```bash
sprite-env services list          # Check service status
sprite-env services stop rails    # Stop the Rails server
sprite-env services start rails   # Start it again
```

### The Postgres Wrapper

On Sprite VMs, `/run` is a tmpfs that gets wiped on every reboot. PostgreSQL needs `/run/postgresql/` for its Unix socket. The wrapper script at `~/scripts/start-postgres.sh` recreates this directory with the correct ownership before starting Postgres, so the database comes up cleanly after a reboot.

## Development

The app uses Rails development mode with:

- **Hot reloading** — code changes take effect without restart
- **Tailwind** — rebuild CSS with `bin/rails tailwindcss:build` (or use `bin/rails tailwindcss:watch` for auto-rebuild)
- **Stimulus** — JS controllers are auto-loaded via importmap

## License

This project is open source.
