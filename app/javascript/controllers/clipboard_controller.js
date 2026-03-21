import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  copy(event) {
    const value = event.params.value
    const button = event.currentTarget

    navigator.clipboard.writeText(value).then(() => {
      const original = button.textContent
      button.textContent = "copied!"
      setTimeout(() => { button.textContent = original }, 2000)
    })
  }
}
