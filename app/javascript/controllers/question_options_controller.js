import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["optionsArea", "optionsList"]

  toggleType(event) {
    if (event.target.value === "multiple_choice") {
      this.optionsAreaTarget.classList.remove("hidden")
    } else {
      this.optionsAreaTarget.classList.add("hidden")
    }
  }

  addOption() {
    const inputs = this.optionsListTarget.querySelectorAll("input")
    const index = inputs.length + 1
    // Derive the correct name from existing inputs
    const existingName = inputs[0]?.name || ""
    const template = `
      <input type="text" name="${existingName}"
             placeholder="Option ${index}"
             class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 text-sm">
    `
    this.optionsListTarget.insertAdjacentHTML("beforeend", template)
  }
}
