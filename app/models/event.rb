class Event < ApplicationRecord
  has_many :event_time_slots, dependent: :destroy
  has_many :questions, -> { order(:position) }, dependent: :destroy
  has_many :respondents, dependent: :destroy

  validates :title, presence: true
  validates :share_token, presence: true, uniqueness: true
  validates :creator_token, presence: true

  before_validation :generate_tokens, on: :create
  before_validation :normalize_timezone

  def to_param
    share_token
  end

  private

  def generate_tokens
    self.share_token ||= SecureRandom.alphanumeric(8)
    self.creator_token ||= SecureRandom.hex(32)
  end

  def normalize_timezone
    return if timezone.blank?
    # If it's already a valid Rails timezone name, keep it
    return if ActiveSupport::TimeZone[timezone]
    # Try mapping IANA identifier to Rails timezone
    mapped = ActiveSupport::TimeZone::MAPPING.invert[timezone]
    self.timezone = mapped if mapped.present?
  end
end
