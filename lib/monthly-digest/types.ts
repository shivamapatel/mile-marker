export type EnergyDistribution = {
  Drained: number
  Steady: number
  Charged: number
}

export type DigestTheme = {
  title: string
  description: string
  supportingReflectionIds: string[]
}

export type MonthlyDigest = {
  id: string
  periodStart: string
  periodEnd: string
  reflectionCount: number
  energyDistribution: EnergyDistribution
  themes: DigestTheme[]
  reflectionQuestion: string | null
  generationStatus: 'pending' | 'completed' | 'failed'
  generatedAt: string | null
}

export type DigestReflection = {
  id: string
  capturedAt: string
  currentState: string
  energy: 'Drained' | 'Steady' | 'Charged'
  mindTopic: string
  note: string
}
