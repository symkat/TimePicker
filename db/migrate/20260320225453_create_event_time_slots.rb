class CreateEventTimeSlots < ActiveRecord::Migration[8.1]
  def change
    create_table :event_time_slots do |t|
      t.references :event, null: false, foreign_key: true
      t.datetime :starts_at
      t.datetime :ends_at

      t.timestamps
    end
  end
end
