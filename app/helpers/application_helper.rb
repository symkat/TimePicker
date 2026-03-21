module ApplicationHelper
  def google_calendar_url(event)
    slot = event.selected_time_slot
    return "#" unless slot

    starts_at = slot.starts_at.utc.strftime("%Y%m%dT%H%M%SZ")
    ends_at = (slot.ends_at || (slot.starts_at + 1.hour)).utc.strftime("%Y%m%dT%H%M%SZ")

    params = {
      action: "TEMPLATE",
      text: event.title,
      dates: "#{starts_at}/#{ends_at}",
      details: event.description.to_s,
      location: event.location.to_s
    }

    "https://calendar.google.com/calendar/render?#{params.to_query}"
  end
end
