# CLAUDE.md - TimePicker

## Project Overview

TimePicker is a self-hosted event scheduling app (like Doodle/When2meet) built with **Rails 8.1**, **PostgreSQL 17**, and the **Hotwire** stack (Turbo + Stimulus). No authentication required for respondents — creators share a link and friends vote on time slots.

## Tech Stack

- **Backend:** Rails 8.1, Ruby 3.4.6, PostgreSQL 17
- **Frontend:** Hotwire (Turbo Drive + Stimulus), Tailwind CSS, Importmap (no JS build step)
- **Testing:** Minitest (unit/integration), Playwright (e2e)
- **Deployment:** Docker, Kamal

## Key Commands

```bash
# Dev server
bin/rails server -b 0.0.0.0 -p 3000

# CSS (needed for style changes)
bin/rails tailwindcss:build        # one-off build
bin/rails tailwindcss:watch        # watch mode

# Both at once
foreman start                      # uses Procfile.dev

# Database
bin/rails db:create db:migrate
bin/rails db:reset                 # drop + create + migrate

# Tests
bin/rails test                     # all minitest
bin/rails test test/models         # model tests
bin/rails test test/controllers    # controller tests
npx playwright test                # e2e (requires server on :3000)

# Sprite VM services
sprite-env services list
sprite-env services start rails
sprite-env services stop rails
```

## Data Model

```
Event (title, description, location, timezone, share_token, creator_token, finalized_at, selected_time_slot_id)
├── has_many EventTimeSlot (starts_at, ends_at)
│   └── has_many TimeSlotSelection (join: respondent ↔ time_slot)
├── belongs_to :selected_time_slot (optional, set on finalization)
├── has_many Question (prompt, question_type [free_text|multiple_choice], options JSON, position)
│   └── has_many Answer (value)
└── has_many Respondent (name, edit_token)
    ├── has_many TimeSlotSelection
    └── has_many Answer
```

## Routing

```ruby
root "pages#home"
resources :events, only: [:new, :create, :show, :edit, :update], param: :share_token do
  member do
    get :claim       # Restore creator session via token param
    post :finalize   # Lock event to a chosen time slot (creator only)
    delete :unfinalize  # Reopen event (creator only)
    get :calendar    # Download .ics file (finalized events only)
  end
  resources :responses, only: [:create], param: :edit_token, controller: "responses" do
    member do
      get :edit
      patch :update
      delete :destroy
    end
  end
end
```

Events use `share_token` (8-char alphanumeric) in URLs, not numeric IDs.

## Key Architecture Decisions

- **Creator auth:** 32-byte random hex token stored in session (`session["creator_token_#{share_token}"]`). Restorable via claim link (`/events/:share_token/claim?token=...`). No user accounts.
- **Respondent auth:** 16-byte random hex `edit_token` on each respondent. Session set on create; restorable via edit URL. Anyone with the share link can submit a new response.
- **Timezone:** Auto-detected from browser via Stimulus controller, normalized to Rails timezone on the Event model.
- **Dynamic forms:** Stimulus controllers (`time_slots`, `questions`, `question_options`, `timezone`) handle adding/removing form rows client-side.
- **Multiple-choice answers:** Stored as JSON arrays in the `value` column of `answers`.
- **Finalization:** Creator picks a winning time slot, which sets `finalized_at` and `selected_time_slot_id`. New responses are blocked; existing respondents can still edit. Generates ICS download and Google Calendar link.

## File Layout (key files)

| Path | Purpose |
|------|---------|
| `app/models/event.rb` | Token generation, timezone normalization |
| `app/controllers/events_controller.rb` | Event CRUD, creator authorization |
| `app/controllers/responses_controller.rb` | Respondent submission (transactional) |
| `app/views/events/show.html.erb` | Availability grid + response form |
| `app/javascript/controllers/` | Stimulus controllers for dynamic forms |
| `config/routes.rb` | RESTful routes with share_token param |
| `db/schema.rb` | Database schema |
| `e2e/` | Playwright end-to-end tests |
| `install.sh` | Sprite VM setup script |

## Code Quality

- Linting: `rubocop-rails-omakase` (config in `.rubocop.yml`)
- Security scanning: `brakeman`, `bundler-audit`
- **Before committing:** Always run `bundle exec rubocop` and `bin/rails test` to catch lint and test failures. Fix any issues before creating the commit.
