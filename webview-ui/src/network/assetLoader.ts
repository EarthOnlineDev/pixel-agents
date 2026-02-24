/**
 * Browser-based asset loader.
 * Replaces Node.js pngjs loading from the VS Code extension.
 * Uses fetch + canvas to parse PNGs into SpriteData (string[][]).
 */

import { setCharacterTemplates } from '../office/sprites/spriteData.js'
import { setFloorSprites } from '../office/floorTiles.js'
import { setWallSprites } from '../office/wallTiles.js'
import { buildDynamicCatalog } from '../office/layout/furnitureCatalog.js'

// Constants matching the extension's src/constants.ts
const PNG_ALPHA_THRESHOLD = 128
const CHAR_COUNT = 6
const CHAR_FRAME_W = 16
const CHAR_FRAME_H = 32
const CHAR_FRAMES_PER_ROW = 7
const CHARACTER_DIRECTIONS = ['down', 'up', 'right'] as const
const FLOOR_PATTERN_COUNT = 7
const FLOOR_TILE_SIZE = 16
const WALL_PIECE_WIDTH = 16
const WALL_PIECE_HEIGHT = 32
const WALL_GRID_COLS = 4
const WALL_BITMASK_COUNT = 16

type SpriteData = string[][]

/** Convert an image URL to SpriteData using canvas */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

function imageToSpriteData(
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): SpriteData {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, x, y, width, height, 0, 0, width, height)
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  const sprite: SpriteData = []
  for (let row = 0; row < height; row++) {
    const rowData: string[] = []
    for (let col = 0; col < width; col++) {
      const i = (row * width + col) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (a < PNG_ALPHA_THRESHOLD) {
        rowData.push('')
      } else {
        rowData.push(
          `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase(),
        )
      }
    }
    sprite.push(rowData)
  }
  return sprite
}

/** Load 6 character sprite sheets from /assets/characters/char_{0-5}.png */
async function loadCharacterSprites(): Promise<void> {
  const characters: Array<{ down: SpriteData[]; up: SpriteData[]; right: SpriteData[] }> = []

  for (let ci = 0; ci < CHAR_COUNT; ci++) {
    try {
      const img = await loadImage(`/assets/characters/char_${ci}.png`)
      const charData: { down: SpriteData[]; up: SpriteData[]; right: SpriteData[] } = {
        down: [],
        up: [],
        right: [],
      }

      for (let dirIdx = 0; dirIdx < CHARACTER_DIRECTIONS.length; dirIdx++) {
        const dir = CHARACTER_DIRECTIONS[dirIdx]
        const rowOffsetY = dirIdx * CHAR_FRAME_H
        const frames: SpriteData[] = []

        for (let f = 0; f < CHAR_FRAMES_PER_ROW; f++) {
          const frameOffsetX = f * CHAR_FRAME_W
          frames.push(imageToSpriteData(img, frameOffsetX, rowOffsetY, CHAR_FRAME_W, CHAR_FRAME_H))
        }
        charData[dir] = frames
      }
      characters.push(charData)
    } catch (err) {
      console.warn(`Failed to load character ${ci}:`, err)
    }
  }

  if (characters.length > 0) {
    setCharacterTemplates(characters)
    console.log(`[AssetLoader] Loaded ${characters.length} character sprites`)
  }
}

/** Load wall tiles from /assets/walls.png (64x128, 4x4 grid of 16x32 pieces) */
async function loadWallTiles(): Promise<void> {
  try {
    const img = await loadImage('/assets/walls.png')
    const sprites: SpriteData[] = []

    for (let mask = 0; mask < WALL_BITMASK_COUNT; mask++) {
      const ox = (mask % WALL_GRID_COLS) * WALL_PIECE_WIDTH
      const oy = Math.floor(mask / WALL_GRID_COLS) * WALL_PIECE_HEIGHT
      sprites.push(imageToSpriteData(img, ox, oy, WALL_PIECE_WIDTH, WALL_PIECE_HEIGHT))
    }

    setWallSprites(sprites)
    console.log(`[AssetLoader] Loaded ${sprites.length} wall tile pieces`)
  } catch (err) {
    console.warn('[AssetLoader] No walls.png found, using fallback:', err)
  }
}

/** Load floor tiles from /assets/floors.png if available */
async function loadFloorTiles(): Promise<void> {
  try {
    const img = await loadImage('/assets/floors.png')
    const sprites: SpriteData[] = []

    for (let t = 0; t < FLOOR_PATTERN_COUNT; t++) {
      const ox = t * FLOOR_TILE_SIZE
      sprites.push(imageToSpriteData(img, ox, 0, FLOOR_TILE_SIZE, FLOOR_TILE_SIZE))
    }

    setFloorSprites(sprites)
    console.log(`[AssetLoader] Loaded ${sprites.length} floor tile patterns`)
  } catch {
    // floors.png is optional - fallback to solid gray tiles
    console.log('[AssetLoader] No floors.png found, using default solid tiles')
  }
}

/** Load furniture catalog and sprites if available */
async function loadFurnitureAssets(): Promise<void> {
  try {
    const response = await fetch('/assets/furniture/furniture-catalog.json')
    if (!response.ok) {
      console.log('[AssetLoader] No furniture catalog found, using built-in sprites')
      return
    }

    const catalogData = await response.json()
    const catalog = catalogData.assets || []
    const sprites: Record<string, SpriteData> = {}

    for (const asset of catalog) {
      try {
        let filePath = asset.file
        if (!filePath.startsWith('assets/')) {
          filePath = `assets/${filePath}`
        }
        const img = await loadImage(`/${filePath}`)
        sprites[asset.id] = imageToSpriteData(img, 0, 0, asset.width, asset.height)
      } catch {
        // Individual furniture asset missing is fine
      }
    }

    buildDynamicCatalog({ catalog, sprites })
    console.log(`[AssetLoader] Loaded ${Object.keys(sprites).length}/${catalog.length} furniture assets`)
  } catch {
    console.log('[AssetLoader] No furniture catalog found, using built-in sprites')
  }
}

/** Load all assets. Call this before rendering the office. */
export async function loadAllAssets(): Promise<void> {
  await Promise.all([
    loadCharacterSprites(),
    loadWallTiles(),
    loadFloorTiles(),
    loadFurnitureAssets(),
  ])
  console.log('[AssetLoader] All assets loaded')
}

/** Load the default office layout from /assets/default-layout.json */
export async function loadDefaultLayout(): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch('/assets/default-layout.json')
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}
