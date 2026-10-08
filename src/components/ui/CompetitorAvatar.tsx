import { useState } from 'react'
import { useCompetitorImage } from '@/hooks/useCompetitorImage'
import type { Competitor } from '@/types'
import { isLight } from '@/utils/color'

const SIZES = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-11 w-11 text-xs',
  lg: 'h-16 w-16 text-sm sm:h-20 sm:w-20 sm:text-base',
  xl: 'h-20 w-20 text-base sm:h-28 sm:w-28 sm:text-xl',
}

function initials(c: Competitor) {
  if (c.kind === 'team') return c.shortName.slice(0, 3)
  return c.name.split(' ').map((p) => p[0]).slice(0, 2).join('')
}

/**
 * Shows a verified external image when one is available (with attribution in its title),
 * otherwise a monogram in the competitor's colours. Never a random/stock image.
 */
export function CompetitorAvatar({ competitor, size = 'md' }: { competitor?: Competitor; size?: keyof typeof SIZES }) {
  const image = useCompetitorImage(competitor)
  const [failed, setFailed] = useState(false)

  if (!competitor) return <div className={`${SIZES[size]} shrink-0 rounded-full bg-surface-3`} aria-hidden />

  const showImage = image && !failed
  const round = competitor.kind === 'fighter' ? 'rounded-full' : 'rounded-2xl'
  return (
    <div
      className={`${SIZES[size]} ${round} relative flex shrink-0 items-center justify-center overflow-hidden font-bold tracking-wide ring-1 ring-white/10`}
      style={
        showImage
          ? { background: 'radial-gradient(circle at 30% 20%, rgb(255 255 255 / 0.10), rgb(255 255 255 / 0.02))' }
          : { background: `linear-gradient(135deg, ${competitor.colors.primary}, ${competitor.colors.secondary})` }
      }
      title={showImage ? `${competitor.name} — image: ${image.attribution}` : competitor.name}
    >
      {showImage ? (
        <img
          src={image.url}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={`h-full w-full ${competitor.kind === 'team' ? 'object-contain p-1.5' : 'object-cover object-top'}`}
        />
      ) : (
        <span style={{ color: isLight(competitor.colors.primary) ? '#0b0f14' : '#ffffff' }} aria-hidden>
          {initials(competitor)}
        </span>
      )}
      {!showImage && <span className="sr-only">{competitor.name}</span>}
    </div>
  )
}
