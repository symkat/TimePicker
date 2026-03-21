import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["calendar", "selectedList", "hiddenInputs",
                     "monthLabel", "defaultStart", "defaultEnd",
                     "endTimeToggle", "endTimeWrapper", "overnightBadge"]

  connect() {
    const now = new Date()
    this.currentMonth = now.getMonth()
    this.currentYear = now.getFullYear()
    this.today = this.formatDate(now)
    this.selectedDates = new Set()
    this.overrides = {}
    this.showEndTime = false
    this._activeDropdown = null

    this.renderCalendar()
    this.renderSelectedList()
    this.updateOvernightBadge()
    this._initComboboxes()

    // Close dropdowns on outside click
    this._outsideClickHandler = (e) => this._closeDropdownIfOutside(e)
    document.addEventListener("click", this._outsideClickHandler)
  }

  disconnect() {
    document.removeEventListener("click", this._outsideClickHandler)
  }

  // --- Time combobox ---

  _initComboboxes() {
    this.element.querySelectorAll("[data-time-combobox]").forEach(wrapper => {
      this._setupCombobox(wrapper)
    })
  }

  _setupCombobox(wrapper) {
    const input = wrapper.querySelector("input")
    const dropdown = wrapper.querySelector("[data-combobox-list]")
    if (!input || !dropdown) return

    // Populate dropdown with 15-minute intervals
    dropdown.innerHTML = this._timeListItems(input.dataset.value || "")

    input.addEventListener("focus", () => {
      this._showDropdown(wrapper)
      this._scrollToSelected(dropdown, input.dataset.value)
    })

    input.addEventListener("input", () => {
      // Filter dropdown as user types
      const query = input.value.toLowerCase().replace(/\s/g, "")
      dropdown.querySelectorAll("[data-time-value]").forEach(item => {
        const label = item.textContent.toLowerCase().replace(/\s/g, "")
        item.style.display = label.includes(query) ? "" : "none"
      })
      this._showDropdown(wrapper)
    })

    input.addEventListener("blur", (e) => {
      // Delay to allow dropdown click to register
      setTimeout(() => {
        this._parseAndSetTime(input)
        this._hideDropdown(wrapper)
      }, 200)
    })

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        this._parseAndSetTime(input)
        this._hideDropdown(wrapper)
        input.blur()
      } else if (e.key === "Escape") {
        this._hideDropdown(wrapper)
        input.blur()
      }
    })

    dropdown.addEventListener("mousedown", (e) => {
      const item = e.target.closest("[data-time-value]")
      if (!item) return
      e.preventDefault()
      input.value = item.textContent
      input.dataset.value = item.dataset.timeValue
      this._hideDropdown(wrapper)
      input.dispatchEvent(new Event("change", { bubbles: true }))
    })
  }

  _timeListItems(selectedValue) {
    let html = ""
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        const label = this.formatTimeDisplay(val)
        const isSelected = val === selectedValue
        html += `<div data-time-value="${val}" class="px-3 py-1.5 text-sm cursor-pointer hover:bg-indigo-50 ${isSelected ? "bg-indigo-100 font-medium text-indigo-700" : "text-gray-700"}">${label}</div>`
      }
    }
    return html
  }

  _showDropdown(wrapper) {
    const dropdown = wrapper.querySelector("[data-combobox-list]")
    dropdown.classList.remove("hidden")
    this._activeDropdown = wrapper
  }

  _hideDropdown(wrapper) {
    const dropdown = wrapper.querySelector("[data-combobox-list]")
    dropdown.classList.add("hidden")
    // Reset filter
    dropdown.querySelectorAll("[data-time-value]").forEach(item => {
      item.style.display = ""
    })
    if (this._activeDropdown === wrapper) this._activeDropdown = null
  }

  _scrollToSelected(dropdown, value) {
    if (!value) return
    const selected = dropdown.querySelector(`[data-time-value="${value}"]`)
    if (selected) {
      selected.scrollIntoView({ block: "center" })
    }
  }

  _closeDropdownIfOutside(e) {
    if (!this._activeDropdown) return
    if (!this._activeDropdown.contains(e.target)) {
      this._hideDropdown(this._activeDropdown)
    }
  }

  _parseAndSetTime(input) {
    const raw = input.value.trim()
    if (!raw) {
      input.dataset.value = ""
      input.dispatchEvent(new Event("change", { bubbles: true }))
      return
    }

    const parsed = this._parseTimeString(raw)
    if (parsed) {
      input.dataset.value = parsed
      input.value = this.formatTimeDisplay(parsed)
    } else {
      // Revert to previous valid value
      if (input.dataset.value) {
        input.value = this.formatTimeDisplay(input.dataset.value)
      } else {
        input.value = ""
      }
    }
    input.dispatchEvent(new Event("change", { bubbles: true }))
  }

  _parseTimeString(str) {
    // Normalize: strip spaces, lowercase
    let s = str.toLowerCase().replace(/\s+/g, "").replace(/\./g, "")

    // Extract AM/PM
    let isPM = null
    if (s.includes("pm") || s.includes("p")) {
      isPM = true
      s = s.replace(/pm|p/g, "")
    } else if (s.includes("am") || s.includes("a")) {
      isPM = false
      s = s.replace(/am|a/g, "")
    }

    let hours, minutes

    // Try "H:MM" or "HH:MM"
    const colonMatch = s.match(/^(\d{1,2}):(\d{2})$/)
    if (colonMatch) {
      hours = parseInt(colonMatch[1], 10)
      minutes = parseInt(colonMatch[2], 10)
    } else {
      // Try bare numbers: "7" -> 7:00, "930" -> 9:30, "1030" -> 10:30
      const numMatch = s.match(/^(\d{1,4})$/)
      if (numMatch) {
        const num = numMatch[1]
        if (num.length <= 2) {
          hours = parseInt(num, 10)
          minutes = 0
        } else if (num.length === 3) {
          hours = parseInt(num[0], 10)
          minutes = parseInt(num.slice(1), 10)
        } else {
          hours = parseInt(num.slice(0, 2), 10)
          minutes = parseInt(num.slice(2), 10)
        }
      }
    }

    if (hours === undefined || minutes === undefined) return null
    if (minutes < 0 || minutes > 59) return null

    // Apply AM/PM conversion
    if (isPM !== null) {
      if (hours < 1 || hours > 12) return null
      if (isPM && hours !== 12) hours += 12
      if (!isPM && hours === 12) hours = 0
    } else {
      // No AM/PM specified — if hours <= 12 and > 0, treat ambiguously
      // but allow 0-23 for 24h input
      if (hours < 0 || hours > 23) return null
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  }

  // Render a combobox HTML string
  _comboboxHtml(name, value, extraClasses) {
    const display = value ? this.formatTimeDisplay(value) : ""
    const cls = extraClasses || ""
    return `<div data-time-combobox class="relative ${cls}">
      <input type="text" value="${display}" data-value="${value || ""}"
             data-combobox-field="${name}"
             autocomplete="off"
             class="w-28 text-sm rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 pl-3 pr-2"
             placeholder="7:00 PM">
      <div data-combobox-list class="hidden absolute z-50 mt-1 w-36 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
        ${this._timeListItems(value || "")}
      </div>
    </div>`
  }

  // --- Calendar rendering ---

  renderCalendar() {
    const year = this.currentYear
    const month = this.currentMonth
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    this.monthLabelTarget.textContent = `${monthNames[month]} ${year}`

    let html = ""

    for (let i = 0; i < firstDay; i++) {
      html += `<div class="h-10"></div>`
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      const isPast = dateStr < this.today
      const isSelected = this.selectedDates.has(dateStr)
      const isToday = dateStr === this.today

      let classes = "h-10 w-10 flex items-center justify-center rounded-full text-sm font-medium mx-auto transition-colors "

      if (isPast) {
        classes += "text-gray-300 cursor-not-allowed"
      } else if (isSelected) {
        classes += "bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700"
      } else if (isToday) {
        classes += "border-2 border-indigo-400 text-indigo-700 cursor-pointer hover:bg-indigo-50"
      } else {
        classes += "text-gray-700 cursor-pointer hover:bg-gray-100"
      }

      if (isPast) {
        html += `<div class="${classes}">${day}</div>`
      } else {
        html += `<div class="${classes}" data-action="click->date-time-picker#toggleDate" data-date="${dateStr}">${day}</div>`
      }
    }

    this.calendarTarget.innerHTML = html
  }

  prevMonth() {
    this.currentMonth--
    if (this.currentMonth < 0) {
      this.currentMonth = 11
      this.currentYear--
    }
    this.renderCalendar()
  }

  nextMonth() {
    this.currentMonth++
    if (this.currentMonth > 11) {
      this.currentMonth = 0
      this.currentYear++
    }
    this.renderCalendar()
  }

  toggleDate(event) {
    const dateStr = event.currentTarget.dataset.date
    if (this.selectedDates.has(dateStr)) {
      this.selectedDates.delete(dateStr)
      delete this.overrides[dateStr]
    } else {
      this.selectedDates.add(dateStr)
    }
    this.renderCalendar()
    this.renderSelectedList()
    this.syncHiddenInputs()
  }

  // --- Default time ---

  defaultTimeChanged(event) {
    const input = event.target
    const field = input.dataset.comboboxField
    if (field === "defaultStart") {
      this.defaultStartValue = input.dataset.value
    } else if (field === "defaultEnd") {
      this.defaultEndValue = input.dataset.value
    }
    this.renderSelectedList()
    this.updateOvernightBadge()
    this.syncHiddenInputs()
  }

  toggleEndTime() {
    this.showEndTime = this.endTimeToggleTarget.checked
    this.endTimeWrapperTarget.classList.toggle("hidden", !this.showEndTime)
    if (!this.showEndTime) {
      this.defaultEndValue = ""
      for (const dateStr of Object.keys(this.overrides)) {
        delete this.overrides[dateStr].endTime
      }
    }
    this.renderSelectedList()
    this.updateOvernightBadge()
    this.syncHiddenInputs()
  }

  updateOvernightBadge() {
    if (!this.hasOvernightBadgeTarget) return
    const start = this._getDefaultStart()
    const end = this._getDefaultEnd()
    if (this.showEndTime && start && end && end < start) {
      this.overnightBadgeTarget.classList.remove("hidden")
    } else {
      this.overnightBadgeTarget.classList.add("hidden")
    }
  }

  _getDefaultStart() {
    // Read from combobox data-value if available, fallback to target
    const input = this.element.querySelector('[data-combobox-field="defaultStart"]')
    return input?.dataset?.value || this.defaultStartValue || "19:00"
  }

  _getDefaultEnd() {
    const input = this.element.querySelector('[data-combobox-field="defaultEnd"]')
    return input?.dataset?.value || this.defaultEndValue || ""
  }

  // --- Per-date overrides ---

  customizeDate(event) {
    const dateStr = event.currentTarget.dataset.date
    const start = this._getDefaultStart()
    const end = this._getDefaultEnd()
    this.overrides[dateStr] = this.overrides[dateStr] || { startTime: start, endTime: end }
    this.renderSelectedList()
  }

  resetOverride(event) {
    const dateStr = event.currentTarget.dataset.date
    delete this.overrides[dateStr]
    this.renderSelectedList()
    this.syncHiddenInputs()
  }

  overrideTimeChanged(event) {
    const input = event.target
    const dateStr = input.closest("[data-override-date]")?.dataset?.overrideDate
    const field = input.dataset.comboboxField
    if (!dateStr) return
    if (!this.overrides[dateStr]) this.overrides[dateStr] = {}
    if (field === "overrideStart") {
      this.overrides[dateStr].startTime = input.dataset.value
    } else if (field === "overrideEnd") {
      this.overrides[dateStr].endTime = input.dataset.value
    }
    this.renderSelectedList()
    this.syncHiddenInputs()
  }

  // --- Selected dates list ---

  renderSelectedList() {
    const sorted = Array.from(this.selectedDates).sort()
    if (sorted.length === 0) {
      this.selectedListTarget.innerHTML = `<p class="text-sm text-gray-400 italic">Click dates on the calendar to add time options.</p>`
      return
    }

    const defaultStart = this._getDefaultStart()
    const defaultEnd = this._getDefaultEnd()

    let html = ""
    for (const dateStr of sorted) {
      const override = this.overrides[dateStr]
      const startTime = override?.startTime || defaultStart
      const endTime = this.showEndTime ? (override?.endTime || defaultEnd) : ""
      const isOverridden = !!override
      const isOvernight = this.showEndTime && endTime && endTime < startTime

      const dateObj = new Date(dateStr + "T12:00:00")
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" })
      const monthName = dateObj.toLocaleDateString("en-US", { month: "short" })
      const dayNum = dateObj.getDate()

      const startDisplay = this.formatTimeDisplay(startTime)
      const endDisplay = endTime ? this.formatTimeDisplay(endTime) : ""

      let overnightLabel = ""
      if (isOvernight) {
        const nextDay = new Date(dateObj)
        nextDay.setDate(nextDay.getDate() + 1)
        const nextDayName = nextDay.toLocaleDateString("en-US", { weekday: "short" })
        const nextMonthName = nextDay.toLocaleDateString("en-US", { month: "short" })
        const nextDayNum = nextDay.getDate()
        overnightLabel = `${nextDayName}, ${nextMonthName} ${nextDayNum}`
      }

      html += `<div class="flex items-start justify-between py-3 ${isOverridden ? "bg-indigo-50 -mx-3 px-3 rounded-lg" : ""}">`
      html += `  <div class="flex-1 min-w-0">`
      html += `    <div class="text-sm font-medium text-gray-900">${dayName}, ${monthName} ${dayNum}</div>`

      if (isOverridden) {
        html += `<div class="flex flex-wrap items-center gap-2 mt-1.5" data-override-date="${dateStr}">`
        html += this._comboboxHtml("overrideStart", startTime)
        if (this.showEndTime) {
          html += `<span class="text-gray-400 text-sm">to</span>`
          html += this._comboboxHtml("overrideEnd", endTime)
        }
        html += `</div>`
        if (isOvernight) {
          html += `<div class="mt-1 flex items-center gap-1 text-xs text-amber-700"><span>&#9889;</span> ends ${overnightLabel}</div>`
        }
      } else {
        let timeText = startDisplay
        if (this.showEndTime && endDisplay) {
          timeText += ` - ${endDisplay}`
        }
        html += `<div class="text-sm text-gray-500 mt-0.5">${timeText}</div>`
        if (isOvernight) {
          html += `<div class="mt-0.5 flex items-center gap-1 text-xs text-amber-700"><span>&#9889;</span> ends ${overnightLabel}</div>`
        }
      }

      html += `  </div>`
      html += `<div class="flex items-center gap-2 ml-3 mt-0.5">`
      if (isOverridden) {
        html += `<button type="button" data-action="click->date-time-picker#resetOverride" data-date="${dateStr}" class="text-xs text-gray-500 hover:text-indigo-600">reset</button>`
      } else {
        html += `<button type="button" data-action="click->date-time-picker#customizeDate" data-date="${dateStr}" class="text-xs text-gray-500 hover:text-indigo-600">customize</button>`
      }
      html += `<button type="button" data-action="click->date-time-picker#removeDate" data-date="${dateStr}" class="text-xs text-red-400 hover:text-red-600">remove</button>`
      html += `</div>`
      html += `</div>`
    }

    this.selectedListTarget.innerHTML = html

    // Wire up newly rendered comboboxes in the selected list
    this.selectedListTarget.querySelectorAll("[data-time-combobox]").forEach(wrapper => {
      this._setupCombobox(wrapper)
      // Override comboboxes dispatch change -> overrideTimeChanged
      const input = wrapper.querySelector("input")
      input.addEventListener("change", (e) => this.overrideTimeChanged(e))
    })
  }

  removeDate(event) {
    const dateStr = event.currentTarget.dataset.date
    this.selectedDates.delete(dateStr)
    delete this.overrides[dateStr]
    this.renderCalendar()
    this.renderSelectedList()
    this.syncHiddenInputs()
  }

  // --- Hidden input sync ---

  syncHiddenInputs() {
    const sorted = Array.from(this.selectedDates).sort()
    const defaultStart = this._getDefaultStart()
    const defaultEnd = this._getDefaultEnd()

    let html = ""
    for (const dateStr of sorted) {
      const override = this.overrides[dateStr]
      const startTime = override?.startTime || defaultStart
      const endTime = this.showEndTime ? (override?.endTime || defaultEnd) : ""

      let endDate = dateStr
      if (endTime && endTime < startTime) {
        const d = new Date(dateStr + "T12:00:00")
        d.setDate(d.getDate() + 1)
        endDate = this.formatDate(d)
      }

      html += `<input type="hidden" name="event[time_slots][][date]" value="${dateStr}">`
      html += `<input type="hidden" name="event[time_slots][][start_time]" value="${startTime}">`
      if (endTime) {
        html += `<input type="hidden" name="event[time_slots][][end_time]" value="${endTime}">`
        html += `<input type="hidden" name="event[time_slots][][end_date]" value="${endDate}">`
      }
    }

    this.hiddenInputsTarget.innerHTML = html
  }

  // --- Helpers ---

  formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  formatTimeDisplay(time24) {
    if (!time24) return ""
    const [h, m] = time24.split(":").map(Number)
    const period = h >= 12 ? "PM" : "AM"
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`
  }
}
