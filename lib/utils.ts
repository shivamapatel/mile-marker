export function formatDistance(meters: number): string {
  return `${(meters / 1609.34).toFixed(1)} mi`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatPace(meters: number, seconds: number): string {
  const secsPerMile = (seconds / meters) * 1609.34
  const min = Math.floor(secsPerMile / 60)
  const sec = Math.round(secsPerMile % 60)
  return `${min}:${sec.toString().padStart(2, '0')} /mi`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function getRelativeLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return formatShortDate(iso)
}
