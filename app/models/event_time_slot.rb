class EventTimeSlot < ApplicationRecord
  belongs_to :event
  has_many :time_slot_selections, dependent: :destroy

  validates :starts_at, presence: true

  def selection_count
    time_slot_selections.count
  end
end
