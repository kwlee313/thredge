export const uiTokens = {
  card: {
    surface: 'rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-1 text-[var(--theme-ink)] sm:p-4',
  },
  input: {
    base: 'w-full rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] text-sm text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] placeholder:opacity-60 focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]',
    paddingMd: 'px-3 py-2',
    paddingMdWide: 'px-6 py-2',
  },
  tag: {
    solid: 'inline-flex rounded-full border border-[var(--theme-primary)] bg-[var(--theme-primary)] px-2 py-0.5 text-xs font-normal text-[var(--theme-on-primary)]',
    outline: 'inline-flex rounded-full border border-[var(--theme-border)] px-2 py-0.5 text-xs font-normal text-[var(--theme-ink)]',
  },
  button: {
    primaryXs: 'rounded-md bg-[var(--theme-primary)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--theme-on-primary)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2',
    secondaryXs: 'rounded-md border border-[var(--theme-border)] px-2 py-1 text-[10px] text-[var(--theme-ink)] hover:border-[var(--theme-primary)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2',
    primarySm: 'rounded-md bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-on-primary)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2',
    primaryMd: 'rounded-md bg-[var(--theme-primary)] px-3 py-2 text-sm font-semibold text-[var(--theme-on-primary)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2',
    secondarySm: 'rounded-md border border-[var(--theme-border)] px-3 py-1.5 text-xs text-[var(--theme-ink)] hover:border-[var(--theme-primary)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2',
    secondaryMd: 'rounded-md border border-[var(--theme-border)] px-3 py-2 text-sm text-[var(--theme-ink)] hover:border-[var(--theme-primary)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2',
    pillActive: 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-on-primary)]',
    pillInactive: 'border-[var(--theme-border)] text-[var(--theme-muted)]',
  },
}
