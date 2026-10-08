import { useEffect, useState } from 'react'
import { getCompetitorImage } from '@/services/images/imageService'
import type { Competitor, ImageAsset } from '@/types'

export function useCompetitorImage(c: Competitor | undefined): ImageAsset | null {
  const [asset, setAsset] = useState<ImageAsset | null>(null)
  useEffect(() => {
    let active = true
    setAsset(null)
    if (c) getCompetitorImage(c).then((a) => active && setAsset(a))
    return () => {
      active = false
    }
  }, [c])
  return asset
}
