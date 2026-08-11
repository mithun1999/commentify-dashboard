import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface ThinkingOrbProps {
  size?: number
  className?: string
  /** Read out in place of the animation, which carries no meaning on its own. */
  label?: string
}

/**
 * A slowly turning ball of dots, for work that takes minutes rather than
 * moments.
 *
 * A spinner is a fixed loop: after ten seconds of it people assume the request
 * died. This never repeats the same frame — the tilt and the breath drift
 * against the spin — so a long generation still reads as running.
 */
export function ThinkingOrb({
  size = 40,
  className,
  label = 'Working',
}: ThinkingOrbProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const scale = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(size * scale)
    canvas.height = Math.round(size * scale)

    const points = sphere(Math.max(36, Math.min(160, Math.round(size * 2))))
    const dot = Math.max(0.75, size / 34)
    const radius = size / 2 - dot * 1.8
    const centre = size / 2
    // Reused every frame: at 60fps a fresh array per frame is pure GC churn.
    const projected = points.map(() => ({ x: 0, y: 0, depth: 0 }))
    // Live declaration rather than a one-off read, so the orb follows the text
    // colour it inherits even when the theme is switched mid-run.
    const computed = getComputedStyle(canvas)

    const draw = (t: number) => {
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.clearRect(0, 0, size, size)
      ctx.fillStyle = computed.color

      const spin = t * 0.6
      const tilt = 0.4 + Math.sin(t * 0.45) * 0.22
      const breathe = 1 + Math.sin(t * 0.8) * 0.04
      const sinSpin = Math.sin(spin)
      const cosSpin = Math.cos(spin)
      const sinTilt = Math.sin(tilt)
      const cosTilt = Math.cos(tilt)

      points.forEach((point, index) => {
        const spun = point.z * cosSpin - point.x * sinSpin
        const slot = projected[index]
        slot.x =
          centre + (point.x * cosSpin + point.z * sinSpin) * radius * breathe
        slot.y =
          centre + (point.y * cosTilt - spun * sinTilt) * radius * breathe
        slot.depth = (point.y * sinTilt + spun * cosTilt + 1) / 2
      })

      // Back to front, or a faint far dot paints over a solid near one and the
      // ball flattens out.
      projected.sort((a, b) => a.depth - b.depth)

      for (const { x, y, depth } of projected) {
        ctx.globalAlpha = 0.1 + depth * 0.78
        ctx.beginPath()
        ctx.arc(x, y, dot * (0.45 + depth * 0.8), 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw(0.6)
      return
    }

    let frame = requestAnimationFrame(function loop() {
      draw(performance.now() / 1000)
      frame = requestAnimationFrame(loop)
    })

    return () => cancelAnimationFrame(frame)
  }, [size])

  return (
    <canvas
      ref={ref}
      role='img'
      aria-label={label}
      style={{ width: size, height: size }}
      className={cn('block shrink-0', className)}
    />
  )
}

interface Point {
  x: number
  y: number
  z: number
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const cache = new Map<number, Point[]>()

/**
 * Points spread evenly over a unit sphere. Stepping the angle by the golden
 * ratio avoids the poles bunching up, which is what makes a rotating dot cloud
 * look like a ball instead of a globe with seams.
 */
function sphere(count: number): Point[] {
  const cached = cache.get(count)
  if (cached) return cached

  const points: Point[] = []
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = i * GOLDEN_ANGLE
    points.push({ x: Math.cos(theta) * ring, y, z: Math.sin(theta) * ring })
  }

  cache.set(count, points)
  return points
}
