class Question < ApplicationRecord
  belongs_to :event
  has_many :answers, dependent: :destroy

  validates :prompt, presence: true
  validates :question_type, presence: true, inclusion: { in: %w[free_text multiple_choice single_choice] }

  serialize :options, coder: JSON

  def multiple_choice?
    question_type == "multiple_choice"
  end

  def single_choice?
    question_type == "single_choice"
  end

  def has_options?
    multiple_choice? || single_choice?
  end
end
