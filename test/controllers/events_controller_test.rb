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
      event: { title: "New Event", timezone: "Eastern Time (US & Canada)" }
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

  # --- finalize ---

  test "creator can finalize event" do
    get claim_event_path(@event.share_token, token: @event.creator_token)
    slot = event_time_slots(:one)

    post finalize_event_path(@event.share_token), params: { time_slot_id: slot.id }
    assert_redirected_to event_path(@event)

    @event.reload
    assert @event.finalized?
    assert_equal slot.id, @event.selected_time_slot_id
  end

  test "non-creator cannot finalize event" do
    slot = event_time_slots(:one)
    post finalize_event_path(@event.share_token), params: { time_slot_id: slot.id }
    assert_redirected_to event_path(@event)

    @event.reload
    assert_not @event.finalized?
  end

  test "creator can unfinalize event" do
    get claim_event_path(@event.share_token, token: @event.creator_token)
    slot = event_time_slots(:one)
    @event.finalize!(slot)

    delete unfinalize_event_path(@event.share_token)
    assert_redirected_to event_path(@event)

    @event.reload
    assert_not @event.finalized?
    assert_nil @event.selected_time_slot_id
  end

  test "show page displays finalized banner when finalized" do
    slot = event_time_slots(:one)
    @event.finalize!(slot)

    get event_path(@event)
    assert_response :success
    assert_select "h2", text: "Event Finalized"
  end

  test "show page hides response form when finalized" do
    slot = event_time_slots(:one)
    @event.finalize!(slot)

    get event_path(@event)
    assert_select "h2", text: "Add Your Response", count: 0
    assert_select "p", text: /no longer accepting new responses/
  end

  test "show page shows finalize section for creator with responses" do
    get claim_event_path(@event.share_token, token: @event.creator_token)
    # Need a respondent for the finalize section to show
    @event.respondents.create!(name: "Test User")

    get event_path(@event)
    assert_select "h2", text: "Choose a Date"
  end

  # --- calendar ---

  test "calendar download works when finalized" do
    slot = event_time_slots(:one)
    @event.finalize!(slot)

    get calendar_event_path(@event.share_token)
    assert_response :success
    assert_equal "text/calendar", response.content_type
    assert_includes response.body, "BEGIN:VCALENDAR"
    assert_includes response.body, @event.title
  end

  test "calendar redirects when not finalized" do
    get calendar_event_path(@event.share_token)
    assert_redirected_to event_path(@event)
  end
end
