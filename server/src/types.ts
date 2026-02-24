/** Server-side types for Pixel Office multiplayer */

export type PlayerStatus = 'coding' | 'reading' | 'idle' | 'afk'

export interface PlayerInfo {
  id: number
  name: string
  characterIndex: number
  status: PlayerStatus
  seatId: string | null
}
