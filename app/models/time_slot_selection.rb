class TimeSlotSelection < ApplicationRecord
  belongs_to :respondent
  belongs_to :event_time_slot

  validates :event_time_slot_id, uniqueness: { scope: :respondent_id }
end
