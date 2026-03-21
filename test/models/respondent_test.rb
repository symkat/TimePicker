require "test_helper"

class RespondentTest < ActiveSupport::TestCase
  test "generates edit_token on create" do
    respondent = Respondent.create!(event: events(:one), name: "Test User")
    assert respondent.edit_token.present?
    assert_equal 32, respondent.edit_token.length
  end

  test "edit_token must be unique" do
    r1 = respondents(:one)
    r2 = Respondent.new(event: events(:one), name: "Dup", edit_token: r1.edit_token)
    assert_not r2.valid?
    assert_includes r2.errors[:edit_token], "has already been taken"
  end

  test "name is required" do
    r = Respondent.new(event: events(:one))
    assert_not r.valid?
    assert_includes r.errors[:name], "can't be blank"
  end

  test "to_param returns edit_token" do
    r = respondents(:one)
    assert_equal r.edit_token, r.to_param
  end
end
