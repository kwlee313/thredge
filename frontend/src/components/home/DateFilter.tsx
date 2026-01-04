type DateFilterProps = {
  selectedDate: Date | null
  dateInputValue: string
  labels: {
    allDates: string
    prevDay: string
    nextDay: string
    dateInputLabel: string
  }
  onClear: () => void
  onPrev: () => void
  onNext: () => void
  onInputChange: (value: string) => void
}

export function DateFilter({
  selectedDate,
  dateInputValue,
  labels,
  onClear,
  onPrev,
  onNext,
  onInputChange,
}: DateFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--theme-muted)]">
      <button
        className="rounded-full border border-[var(--theme-border)] px-2 py-1 text-[11px] font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
        type="button"
        onClick={onClear}
        disabled={!selectedDate}
      >
        {labels.allDates}
      </button>
      <div className="flex items-center gap-1">
        <button
          className="flex items-center justify-center px-2 py-1 text-xs font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
          type="button"
          onClick={onPrev}
          aria-label={labels.prevDay}
        >
          {'<'}
        </button>
        <input
          className="rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2 py-1 text-xs text-[var(--theme-ink)]"
          type="date"
          value={dateInputValue}
          onChange={(event) => onInputChange(event.target.value)}
          aria-label={labels.dateInputLabel}
        />
        <button
          className="flex items-center justify-center px-2 py-1 text-xs font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
          type="button"
          onClick={onNext}
          aria-label={labels.nextDay}
        >
          {'>'}
        </button>
      </div>
    </div>
  )
}
