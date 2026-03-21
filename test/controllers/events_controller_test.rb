require "test_helper"

class EventsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @event = events(:one)
  end

  # --- claim action ---

  test "claim with valid token restores creator session" do
    get claim_event_path(@event.share_token, token: @event.creator_token)

    assert_redirected_to event_path(@event)
    follow_redirect!
    assert_match /Creator access restored/, flash[:notice]

    # Should now be recognized as creator (can access edit)
    get edit_event_path(@event.share_token)
    assert_response :success
  end

  test "claim with invalid token rejects" do
    get claim_event_path(@event.share_token, token: "bad_token")

    assert_redirected_to event_path(@event)
    follow_redirect!
    assert_match /Invalid creator link/, flash[:alert]

    # Should NOT be able to edit
    get edit_event_path(@event.share_token)
    assert_redirected_to event_path(@event)
  end

  test "claim with missing token rejects" do
    get claim_event_path(@event.share_token)

    assert_redirected_to event_path(@event)
    follow_redirect!
    assert_match /Invalid creator link/, flash[:alert]
  end

  # --- creator session via create ---

  test "creator session is set on event creation" do
    post events_path, params: {
      event: { title: "New Event", timezone: "Eastern Time (US & Canada)" },
    }

    # Follow redirect to show page
    assert_response :redirect
    follow_redirect!

    # Creator should see edit link
    assert_select "a", text: "Edit"
  end

  # --- show page ---

  test "show page displays creator link for creator" do
    # Set creator session
    get claim_event_path(@event.share_token, token: @event.creator_token)

    get event_path(@event)
    assert_response :success
    assert_select "span", text: "Your creator link:"
  end

  test "show page hides creator link for non-creator" do
    get event_path(@event)
    assert_response :success
    assert_select "span", text: "Your creator link:", count: 0
  end

  # --- edit/update authorization ---

  test "non-creator cannot access edit" do
    get edit_event_path(@event.share_token)
    assert_redirected_to event_path(@event)
  end

  test "creator can access edit" do
    get claim_event_path(@event.share_token, token: @event.creator_token)
    get edit_event_path(@event.share_token)
    assert_response :success
  end
end
