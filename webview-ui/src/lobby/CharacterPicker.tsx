import { useEffect, useRef, useState } from 'react'

const CHAR_COUNT = 6
const FRAME_W = 16
const FRAME_H = 32
const SCALE = 4
const DISPLAY_W = FRAME_W * SCALE
const DISPLAY_H = FRAME_H * SCALE

interface CharacterPickerProps {
  selected: number
  onSelect: (index: number) => void
}

/** Renders the first idle frame of each character at 4x scale for picking. */
export function CharacterPicker({ selected, onSelect }: CharacterPickerProps) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const [loaded, setLoaded] = useState(false)
  const imagesRef = useRef<HTMLImageElement[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all(
      Array.from({ length: CHAR_COUNT }, (_, i) => {
        return new Promise<HTMLImageElement>((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve(img)
          img.onerror = () => resolve(img) // still resolve to avoid blocking
          img.src = `/assets/characters/char_${i}.png`
        })
      }),
    ).then((imgs) => {
      if (cancelled) return
      imagesRef.current = imgs
      setLoaded(true)
    })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!loaded) return
    const images = imagesRef.current

    for (let i = 0; i < CHAR_COUNT; i++) {
      const canvas = canvasRefs.current[i]
      if (!canvas || !images[i]?.complete) continue

      const ctx = canvas.getContext('2d')
      if (!ctx) continue

      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, DISPLAY_W, DISPLAY_H)
      // Draw the first frame (down direction, frame 0) at top-left of spritesheet
      ctx.drawImage(images[i], 0, 0, FRAME_W, FRAME_H, 0, 0, DISPLAY_W, DISPLAY_H)
    }
  }, [loaded])

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      {Array.from({ length: CHAR_COUNT }, (_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          style={{
            padding: 4,
            background: selected === i ? 'rgba(90, 140, 255, 0.3)' : 'rgba(255,255,255,0.05)',
            border: selected === i ? '2px solid rgba(90, 140, 255, 0.8)' : '2px solid rgba(255,255,255,0.15)',
            borderRadius: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <canvas
            ref={(el) => { canvasRefs.current[i] = el }}
            width={DISPLAY_W}
            height={DISPLAY_H}
            style={{ width: DISPLAY_W / 2, height: DISPLAY_H / 2, imageRendering: 'pixelated' }}
          />
        </button>
      ))}
    </div>
  )
}
