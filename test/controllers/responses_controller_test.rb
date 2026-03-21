require "test_helper"

class ResponsesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @event = events(:one)
    @respondent = respondents(:one)
    @time_slot = event_time_slots(:one)
  end

  test "create response sets respondent session token" do
    post event_responses_path(@event.share_token), params: {
      respondent: {
        name: "Charlie",
        time_slot_ids: [ @time_slot.id ]
      }
    }

    assert_redirected_to event_path(@event)
    follow_redirect!
    assert_match /Thanks, Charlie!/, flash[:notice]
  end

  test "create response without name fails" do
    post event_responses_path(@event.share_token), params: {
      respondent: { name: "", time_slot_ids: [] }
    }

    assert_redirected_to event_path(@event)
    follow_redirect!
    assert_match /fill in your name/, flash[:alert]
  end

  test "edit response via edit_token" do
    get edit_event_response_path(@event.share_token, @respondent.edit_token)
    assert_response :success
  end

  test "update response via edit_token" do
    patch event_response_path(@event.share_token, @respondent.edit_token), params: {
      respondent: {
        name: "Alice Updated",
        time_slot_ids: [ @time_slot.id ]
      }
    }

    assert_redirected_to event_path(@event)
    @respondent.reload
    assert_equal "Alice Updated", @respondent.name
  end

  test "creator can destroy response" do
    # Set creator session
    get claim_event_path(@event.share_token, token: @event.creator_token)

    assert_difference "Respondent.count", -1 do
      delete event_response_path(@event.share_token, @respondent.edit_token)
    end

    assert_redirected_to event_path(@event)
  end

  test "non-creator cannot destroy response" do
    assert_no_difference "Respondent.count" do
      delete event_response_path(@event.share_token, @respondent.edit_token)
    end

    assert_redirected_to event_path(@event)
  end
end
