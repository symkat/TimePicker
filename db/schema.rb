# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_03_21_020755) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "answers", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "question_id", null: false
    t.bigint "respondent_id", null: false
    t.datetime "updated_at", null: false
    t.text "value"
    t.index ["question_id"], name: "index_answers_on_question_id"
    t.index ["respondent_id", "question_id"], name: "index_answers_on_respondent_id_and_question_id", unique: true
    t.index ["respondent_id"], name: "index_answers_on_respondent_id"
  end

  create_table "event_time_slots", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "ends_at"
    t.bigint "event_id", null: false
    t.datetime "starts_at"
    t.datetime "updated_at", null: false
    t.index ["event_id"], name: "index_event_time_slots_on_event_id"
  end

  create_table "events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "creator_token", null: false
    t.text "description"
    t.datetime "finalized_at"
    t.string "location"
    t.bigint "selected_time_slot_id"
    t.string "share_token", null: false
    t.string "timezone"
    t.string "title"
    t.datetime "updated_at", null: false
    t.index ["selected_time_slot_id"], name: "index_events_on_selected_time_slot_id"
    t.index ["share_token"], name: "index_events_on_share_token", unique: true
  end

  create_table "questions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "event_id", null: false
    t.text "options"
    t.integer "position"
    t.string "prompt"
    t.string "question_type"
    t.datetime "updated_at", null: false
    t.index ["event_id"], name: "index_questions_on_event_id"
  end

  create_table "respondents", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "edit_token", null: false
    t.bigint "event_id", null: false
    t.string "name"
    t.datetime "updated_at", null: false
    t.index ["edit_token"], name: "index_respondents_on_edit_token", unique: true
    t.index ["event_id"], name: "index_respondents_on_event_id"
  end

  create_table "time_slot_selections", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "event_time_slot_id", null: false
    t.bigint "respondent_id", null: false
    t.datetime "updated_at", null: false
    t.index ["event_time_slot_id"], name: "index_time_slot_selections_on_event_time_slot_id"
    t.index ["respondent_id", "event_time_slot_id"], name: "idx_time_slot_selections_unique", unique: true
    t.index ["respondent_id"], name: "index_time_slot_selections_on_respondent_id"
  end

  add_foreign_key "answers", "questions"
  add_foreign_key "answers", "respondents"
  add_foreign_key "event_time_slots", "events"
  add_foreign_key "events", "event_time_slots", column: "selected_time_slot_id"
  add_foreign_key "questions", "events"
  add_foreign_key "respondents", "events"
  add_foreign_key "time_slot_selections", "event_time_slots"
  add_foreign_key "time_slot_selections", "respondents"
end
