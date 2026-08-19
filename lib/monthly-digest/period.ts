export type MonthPeriod = {
  start: string
  end: string
  label: string
}

export function getPreviousMonthPeriod(now = new Date()): MonthPeriod {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1))

  return {
    start: toDateOnly(start),
    end: toDateOnly(end),
    label: new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(start),
  }
}

export function formatMonthLabel(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}
