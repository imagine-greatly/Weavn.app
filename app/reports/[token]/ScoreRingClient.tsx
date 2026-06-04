'use client'

import ScoreRing from '@/components/ui/ScoreRing'

interface Props {
  score: number
  size: 'sm' | 'md' | 'lg'
  animated: boolean
}

export default function ScoreRingClient({ score, size, animated }: Props) {
  return <ScoreRing score={score} size={size} animated={animated} />
}
