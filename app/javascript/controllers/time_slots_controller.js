import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["container", "row"]

  add() {
    const template = `
      <div class="flex items-center gap-3 time-slot-row" data-time-slots-target="row">
        <div class="flex-1">
          <input type="datetime-local" name="event[time_slots][][starts_at]"
                 class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm" required>
        </div>
        <span class="text-gray-400 text-sm">to</span>
        <div class="flex-1">
          <input type="datetime-local" name="event[time_slots][][ends_at]"
                 class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm">
        </div>
        <button type="button" data-action="time-slots#remove" class="text-red-400 hover:text-red-600 p-1" title="Remove">
          &#10005;
        </button>
      </div>
    `
    this.containerTarget.insertAdjacentHTML("beforeend", template)
  }

  remove(event) {
    const row = event.target.closest(".time-slot-row")
    if (this.rowTargets.length > 1) {
      row.remove()
    }
  }
}
