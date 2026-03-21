import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["container"]

  add() {
    const index = this.containerTarget.children.length
    const template = `
      <div class="border border-gray-200 rounded-lg p-5 bg-gray-50 space-y-4" data-controller="question-options">
        <div class="flex items-center gap-3">
          <input type="text" name="event[questions_attributes][${index}][prompt]"
                 placeholder="Your question..."
                 class="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2.5 text-sm" required>
          <button type="button" data-action="questions#removeQuestion" class="text-red-400 hover:text-red-600 text-sm font-medium whitespace-nowrap">Remove</button>
        </div>

        <div class="flex items-center gap-3">
          <label class="text-sm text-gray-600">Type:</label>
          <select name="event[questions_attributes][${index}][question_type]"
                  data-action="question-options#toggleType"
                  class="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 text-sm">
            <option value="free_text">Free text</option>
            <option value="single_choice">Single choice</option>
            <option value="multiple_choice">Multiple choice</option>
          </select>
        </div>

        <div data-question-options-target="optionsArea" class="hidden space-y-3 pl-2">
          <label class="block text-xs text-gray-500">Answer options:</label>
          <div data-question-options-target="optionsList" class="space-y-2">
            <input type="text" name="event[questions_attributes][${index}][options][]"
                   placeholder="Option 1"
                   class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 text-sm">
            <input type="text" name="event[questions_attributes][${index}][options][]"
                   placeholder="Option 2"
                   class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 text-sm">
          </div>
          <button type="button" data-action="question-options#addOption"
                  class="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            + Add option
          </button>
        </div>
      </div>
    `
    this.containerTarget.insertAdjacentHTML("beforeend", template)
  }

  removeQuestion(event) {
    const questionDiv = event.target.closest("[data-controller='question-options']")
    questionDiv.remove()
  }
}
