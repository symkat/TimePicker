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
    this.overrides = {} // { "2026-03-21": { startTime: "22:00", endTime: "02:00" } }
    this.showEndTime = false

    this.renderCalendar()
    this.renderSelectedList()
    this.updateOvernightBadge()
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

    // Empty cells for days before the 1st
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

  defaultStartChanged() {
    this.renderSelectedList()
    this.updateOvernightBadge()
    this.syncHiddenInputs()
  }

  defaultEndChanged() {
    this.renderSelectedList()
    this.updateOvernightBadge()
    this.syncHiddenInputs()
  }

  toggleEndTime() {
    this.showEndTime = this.endTimeToggleTarget.checked
    this.endTimeWrapperTarget.classList.toggle("hidden", !this.showEndTime)
    if (!this.showEndTime) {
      this.defaultEndTarget.value = ""
      // Clear end times from overrides
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
    const start = this.defaultStartTarget.value
    const end = this.defaultEndTarget.value
    if (this.showEndTime && start && end && end < start) {
      this.overnightBadgeTarget.classList.remove("hidden")
    } else {
      this.overnightBadgeTarget.classList.add("hidden")
    }
  }

  // --- Per-date overrides ---

  customizeDate(event) {
    const dateStr = event.currentTarget.dataset.date
    const start = this.defaultStartTarget.value || "19:00"
    const end = this.defaultEndTarget.value || ""
    this.overrides[dateStr] = this.overrides[dateStr] || { startTime: start, endTime: end }
    this.renderSelectedList()
  }

  resetOverride(event) {
    const dateStr = event.currentTarget.dataset.date
    delete this.overrides[dateStr]
    this.renderSelectedList()
    this.syncHiddenInputs()
  }

  overrideStartChanged(event) {
    const dateStr = event.currentTarget.dataset.date
    if (!this.overrides[dateStr]) this.overrides[dateStr] = {}
    this.overrides[dateStr].startTime = event.currentTarget.value
    this.renderSelectedList()
    this.syncHiddenInputs()
  }

  overrideEndChanged(event) {
    const dateStr = event.currentTarget.dataset.date
    if (!this.overrides[dateStr]) this.overrides[dateStr] = {}
    this.overrides[dateStr].endTime = event.currentTarget.value
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

    const defaultStart = this.defaultStartTarget.value || "19:00"
    const defaultEnd = this.defaultEndTarget.value || ""

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

      // Calculate next day name for overnight display
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
        // Show inline dropdowns for override
        html += `<div class="flex flex-wrap items-center gap-2 mt-1.5">`
        html += `  <select data-action="change->date-time-picker#overrideStartChanged" data-date="${dateStr}" class="text-sm rounded-md border-gray-300 py-1 pl-2 pr-7 focus:border-indigo-500 focus:ring-indigo-500">`
        html += this.timeOptions(startTime)
        html += `  </select>`
        if (this.showEndTime) {
          html += `<span class="text-gray-400 text-sm">to</span>`
          html += `<select data-action="change->date-time-picker#overrideEndChanged" data-date="${dateStr}" class="text-sm rounded-md border-gray-300 py-1 pl-2 pr-7 focus:border-indigo-500 focus:ring-indigo-500">`
          html += this.timeOptions(endTime)
          html += `</select>`
        }
        html += `</div>`
        if (isOvernight) {
          html += `<div class="mt-1 flex items-center gap-1 text-xs text-amber-700"><span>&#9889;</span> ends ${overnightLabel}</div>`
        }
      } else {
        // Show summary text
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

      // Action buttons
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
    const defaultStart = this.defaultStartTarget.value || "19:00"
    const defaultEnd = this.defaultEndTarget.value || ""

    let html = ""
    for (const dateStr of sorted) {
      const override = this.overrides[dateStr]
      const startTime = override?.startTime || defaultStart
      const endTime = this.showEndTime ? (override?.endTime || defaultEnd) : ""

      let endDate = dateStr
      if (endTime && endTime < startTime) {
        // Overnight: end date is next day
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

  timeOptions(selectedValue) {
    let html = ""
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 5) {
        const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        const period = h >= 12 ? "PM" : "AM"
        const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
        const label = `${hour12}:${String(m).padStart(2, "0")} ${period}`
        const selected = val === selectedValue ? " selected" : ""
        html += `<option value="${val}"${selected}>${label}</option>`
      }
    }
    return html
  }
}
