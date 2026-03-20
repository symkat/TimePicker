import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["container", "row"]

  add() {
    const num = this.rowTargets.length + 1
    const template = `
      <div class="border border-gray-200 rounded-lg p-5 bg-gray-50 time-slot-row" data-time-slots-target="row">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-gray-700">Option ${num}</span>
          <button type="button" data-action="time-slots#remove" class="text-red-400 hover:text-red-600 text-sm font-medium">Remove</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-gray-500 mb-1">Date</label>
            <input type="date" name="event[time_slots][][date]"
                   class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 text-sm" required>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Start time</label>
            <input type="time" name="event[time_slots][][start_time]"
                   class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 text-sm" required>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">End time <span class="text-gray-400">(optional)</span></label>
            <input type="time" name="event[time_slots][][end_time]"
                   class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 text-sm">
          </div>
        </div>
      </div>
    `
    this.containerTarget.insertAdjacentHTML("beforeend", template)
  }

  remove(event) {
    const row = event.target.closest(".time-slot-row")
    if (this.rowTargets.length > 1) {
      row.remove()
      this.renumber()
    }
  }

  renumber() {
    this.rowTargets.forEach((row, i) => {
      const label = row.querySelector("span")
      if (label) label.textContent = `Option ${i + 1}`
    })
  }
}
