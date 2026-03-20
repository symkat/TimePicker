class Answer < ApplicationRecord
  belongs_to :respondent
  belongs_to :question

  validates :question_id, uniqueness: { scope: :respondent_id }
end
