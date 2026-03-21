class Respondent < ApplicationRecord
  belongs_to :event
  has_many :time_slot_selections, dependent: :destroy
  has_many :selected_time_slots, through: :time_slot_selections, source: :event_time_slot
  has_many :answers, dependent: :destroy

  validates :name, presence: true
  validates :edit_token, presence: true, uniqueness: true

  before_validation :generate_edit_token, on: :create

  def to_param
    edit_token
  end

  private

  def generate_edit_token
    self.edit_token ||= SecureRandom.hex(16)
  end
end
