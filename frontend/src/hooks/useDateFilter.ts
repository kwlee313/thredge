import { useState } from 'react'

export const useDateFilter = (locale: string) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const formatDateLabel = (date: Date) =>
    new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)

  const formatDateInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const parseDateInput = (value: string) => {
    if (!value) {
      return null
    }
    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day) {
      return null
    }
    return new Date(year, month - 1, day)
  }

  const shiftDateByDays = (date: Date, amount: number) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)

  const isSameCalendarDate = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()

  const selectedDateLabel = selectedDate ? formatDateLabel(selectedDate) : null

  const dateInputValue = selectedDate ? formatDateInput(selectedDate) : ''

  return {
    selectedDate,
    setSelectedDate,
    selectedDateLabel,
    dateInputValue,
    parseDateInput,
    shiftDateByDays,
    isSameCalendarDate,
  }
}
