class Event < ApplicationRecord
  has_many :event_time_slots, dependent: :destroy
  has_many :questions, -> { order(:position) }, dependent: :destroy
  has_many :respondents, dependent: :destroy

  validates :title, presence: true
  validates :share_token, presence: true, uniqueness: true
  validates :creator_token, presence: true

  before_validation :generate_tokens, on: :create

  def to_param
    share_token
  end

  private

  def generate_tokens
    self.share_token ||= SecureRandom.alphanumeric(8)
    self.creator_token ||= SecureRandom.hex(32)
  end
end
