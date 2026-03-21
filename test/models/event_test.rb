require "test_helper"

class EventTest < ActiveSupport::TestCase
  test "generates share_token and creator_token on create" do
    event = Event.create!(title: "Test Event")
    assert event.share_token.present?
    assert event.creator_token.present?
    assert_equal 8, event.share_token.length
    assert_equal 64, event.creator_token.length
  end

  test "share_token must be unique" do
    event1 = events(:one)
    event2 = Event.new(title: "Dup", share_token: event1.share_token, creator_token: SecureRandom.hex(32))
    assert_not event2.valid?
    assert_includes event2.errors[:share_token], "has already been taken"
  end

  test "title is required" do
    event = Event.new
    assert_not event.valid?
    assert_includes event.errors[:title], "can't be blank"
  end

  test "keeps valid IANA timezone unchanged when ActiveSupport resolves it" do
    event = Event.new(title: "TZ Test", timezone: "America/New_York")
    event.valid?
    assert_equal "America/New_York", event.timezone
  end

  test "keeps valid Rails timezone as-is" do
    event = Event.new(title: "TZ Test", timezone: "Eastern Time (US & Canada)")
    event.valid?
    assert_equal "Eastern Time (US & Canada)", event.timezone
  end

  test "to_param returns share_token" do
    event = events(:one)
    assert_equal event.share_token, event.to_param
  end

  test "finalize! sets finalized_at and selected_time_slot" do
    event = events(:one)
    slot = event_time_slots(:one)
    event.finalize!(slot)
    assert event.finalized?
    assert_equal slot, event.selected_time_slot
    assert event.finalized_at.present?
  end

  test "unfinalize! clears finalization" do
    event = events(:one)
    slot = event_time_slots(:one)
    event.finalize!(slot)
    event.unfinalize!
    assert_not event.finalized?
    assert_nil event.selected_time_slot
    assert_nil event.finalized_at
  end

  test "finalized? returns false by default" do
    event = events(:one)
    assert_not event.finalized?
  end
end
