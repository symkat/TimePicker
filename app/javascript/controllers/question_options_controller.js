import { Controller } from "@hotwired/stimulus"

const TYPE_HINTS = {
  free_text: "Respondents type their answer in a text field.",
  single_choice: "Respondents pick one option from the list.",
  multiple_choice: "Respondents can select multiple options from the list."
}

export default class extends Controller {
  static targets = ["optionsArea", "optionsList", "typeHint"]

  toggleType(event) {
    const type = event.target.value
    if (type === "multiple_choice" || type === "single_choice") {
      this.optionsAreaTarget.classList.remove("hidden")
    } else {
      this.optionsAreaTarget.classList.add("hidden")
    }

    if (this.hasTypeHintTarget) {
      this.typeHintTarget.textContent = TYPE_HINTS[type] || ""
    }
  }

  addOption() {
    const inputs = this.optionsListTarget.querySelectorAll("input")
    const index = inputs.length + 1
    const existingName = inputs[0]?.name || ""
    const template = `
      <input type="text" name="${existingName}"
             placeholder="Option ${index}"
             class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 text-sm">
    `
    this.optionsListTarget.insertAdjacentHTML("beforeend", template)
  }
}
