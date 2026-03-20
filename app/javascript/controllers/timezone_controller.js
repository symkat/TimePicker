import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["field"]

  connect() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz && this.hasFieldTarget) {
      // Map IANA timezone to Rails-friendly name
      this.fieldTarget.value = tz
    }
  }
}
