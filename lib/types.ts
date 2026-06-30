export interface Activity {
  id: string
  name: string
  sportType: string
  startDate: string // ISO 8601
  distance: number // meters
  movingTime: number // seconds
  elevationGain: number // meters
  stravaUrl: string
}

export type EnergyLevel = 'Drained' | 'Steady' | 'Charged'

export interface Reflection {
  id: string
  activityId: string
  currentState: string
  energy: EnergyLevel
  mindTopic: string
  note: string
  routeLabel: string
  capturedAt: string
  updatedAt: string
}
