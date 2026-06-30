import { Activity, Reflection } from './types'

// Fake Strava activities — most recent first.
// act-1 (today) and act-5 (June 18) are intentionally uncaptured.
export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    name: 'Morning Run',
    sportType: 'Run',
    startDate: '2026-06-27T07:15:00Z',
    distance: 8047,    // ~5.0 mi
    movingTime: 2600,  // 43m 20s
    elevationGain: 68,
    stravaUrl: 'https://www.strava.com/activities/mock-1',
  },
  {
    id: 'act-2',
    name: 'Lunch Loop',
    sportType: 'Run',
    startDate: '2026-06-24T12:30:00Z',
    distance: 4989,    // ~3.1 mi
    movingTime: 1630,  // 27m 10s
    elevationGain: 32,
    stravaUrl: 'https://www.strava.com/activities/mock-2',
  },
  {
    id: 'act-3',
    name: 'Evening Miles',
    sportType: 'Run',
    startDate: '2026-06-22T18:45:00Z',
    distance: 9978,    // ~6.2 mi
    movingTime: 3348,  // 55m 48s
    elevationGain: 89,
    stravaUrl: 'https://www.strava.com/activities/mock-3',
  },
  {
    id: 'act-4',
    name: 'Long Saturday Run',
    sportType: 'Run',
    startDate: '2026-06-20T08:00:00Z',
    distance: 14645,   // ~9.1 mi
    movingTime: 5051,  // 1h 24m 11s
    elevationGain: 145,
    stravaUrl: 'https://www.strava.com/activities/mock-4',
  },
  {
    id: 'act-5',
    name: 'Quick Miles Before Work',
    sportType: 'Run',
    startDate: '2026-06-18T06:30:00Z',
    distance: 6759,    // ~4.2 mi
    movingTime: 2142,  // 35m 42s
    elevationGain: 41,
    stravaUrl: 'https://www.strava.com/activities/mock-5',
  },
  {
    id: 'act-6',
    name: 'Sunday Easy Run',
    sportType: 'Run',
    startDate: '2026-06-15T09:10:00Z',
    distance: 8851,    // ~5.5 mi
    movingTime: 3135,  // 52m 15s
    elevationGain: 56,
    stravaUrl: 'https://www.strava.com/activities/mock-6',
  },
  {
    id: 'act-7',
    name: 'Post-Work Decompress',
    sportType: 'Run',
    startDate: '2026-06-13T17:30:00Z',
    distance: 5633,    // ~3.5 mi
    movingTime: 1750,  // 29m 10s
    elevationGain: 28,
    stravaUrl: 'https://www.strava.com/activities/mock-7',
  },
  {
    id: 'act-8',
    name: 'Thursday Run',
    sportType: 'Run',
    startDate: '2026-06-10T07:00:00Z',
    distance: 11265,   // ~7.0 mi
    movingTime: 3745,  // 1h 2m 25s
    elevationGain: 102,
    stravaUrl: 'https://www.strava.com/activities/mock-8',
  },
  {
    id: 'act-9',
    name: 'Weekend Long Run',
    sportType: 'Run',
    startDate: '2026-06-07T08:30:00Z',
    distance: 16898,   // ~10.5 mi
    movingTime: 6143,  // 1h 42m 23s
    elevationGain: 178,
    stravaUrl: 'https://www.strava.com/activities/mock-9',
  },
]

// Pre-seeded reflections. These load as if already saved.
// Stored by activityId for fast lookup.
export const MOCK_REFLECTIONS: Record<string, Reflection> = {
  'act-2': {
    id: 'ref-2',
    activityId: 'act-2',
    currentState: 'surprisingly loose',
    energy: 'Charged',
    mindTopic: 'Career',
    note: 'Had a breakthrough on the product direction. The solution I had been circling for weeks felt obvious by mile 2. Something about moving without looking at a screen.',
    routeLabel: 'Lunch loop',
    capturedAt: '2026-06-24T13:05:00Z',
    updatedAt: '2026-06-24T13:05:00Z',
  },
  'act-3': {
    id: 'ref-3',
    activityId: 'act-3',
    currentState: 'still buzzing from a hard conversation',
    energy: 'Steady',
    mindTopic: 'Friends',
    note: 'Ran through what I should have said. By the end I mostly just let it go.',
    routeLabel: '',
    capturedAt: '2026-06-22T19:30:00Z',
    updatedAt: '2026-06-22T19:30:00Z',
  },
  'act-4': {
    id: 'ref-4',
    activityId: 'act-4',
    currentState: 'slow to start, then found it',
    energy: 'Steady',
    mindTopic: 'Identity',
    note: 'Thinking about what I want the next chapter to look like. Nothing concrete, just a mood. Long runs are good for that.',
    routeLabel: 'Saturday long route',
    capturedAt: '2026-06-20T09:05:00Z',
    updatedAt: '2026-06-20T09:05:00Z',
  },
  'act-6': {
    id: 'ref-6',
    activityId: 'act-6',
    currentState: 'calm, no agenda',
    energy: 'Steady',
    mindTopic: 'Health',
    note: '',
    routeLabel: 'Neighborhood loop',
    capturedAt: '2026-06-15T10:00:00Z',
    updatedAt: '2026-06-15T10:00:00Z',
  },
  'act-7': {
    id: 'ref-7',
    activityId: 'act-7',
    currentState: 'anxious but clearer',
    energy: 'Drained',
    mindTopic: 'Dating',
    note: "Couldn't stop replaying the conversation. By mile 2 the replaying slowed. Didn't solve anything but it feels less sharp now.",
    routeLabel: '',
    capturedAt: '2026-06-13T18:15:00Z',
    updatedAt: '2026-06-13T18:15:00Z',
  },
  'act-8': {
    id: 'ref-8',
    activityId: 'act-8',
    currentState: 'good tired',
    energy: 'Charged',
    mindTopic: 'Health',
    note: 'Best run in weeks. No music, no podcast, just the route. Forgot how much I like running without noise.',
    routeLabel: 'River path out-and-back',
    capturedAt: '2026-06-10T07:55:00Z',
    updatedAt: '2026-06-10T07:55:00Z',
  },
  'act-9': {
    id: 'ref-9',
    activityId: 'act-9',
    currentState: 'focused, almost meditative',
    energy: 'Steady',
    mindTopic: 'Career',
    note: 'The first 40 minutes were just noise. Then it cleared. I have a clearer idea of what I actually want to work on.',
    routeLabel: 'Long run loop',
    capturedAt: '2026-06-07T09:45:00Z',
    updatedAt: '2026-06-07T09:45:00Z',
  },
}
