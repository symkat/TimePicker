class Respondent < ApplicationRecord
  belongs_to :event
  has_many :time_slot_selections, dependent: :destroy
  has_many :selected_time_slots, through: :time_slot_selections, source: :event_time_slot
  has_many :answers, dependent: :destroy

  validates :name, presence: true
end
