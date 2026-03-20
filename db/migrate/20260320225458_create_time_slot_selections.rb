class CreateTimeSlotSelections < ActiveRecord::Migration[8.1]
  def change
    create_table :time_slot_selections do |t|
      t.references :respondent, null: false, foreign_key: true
      t.references :event_time_slot, null: false, foreign_key: true

      t.timestamps
    end

    add_index :time_slot_selections, [:respondent_id, :event_time_slot_id], unique: true, name: "idx_time_slot_selections_unique"
  end
end
