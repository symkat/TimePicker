class AddFinalizationToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :finalized_at, :datetime
    add_reference :events, :selected_time_slot, foreign_key: { to_table: :event_time_slots }, null: true
  end
end
