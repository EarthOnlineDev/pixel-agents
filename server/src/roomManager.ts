/** Room management for Pixel Office multiplayer server */

import type { WebSocket } from 'ws'
import type { PlayerInfo, PlayerStatus } from './types.js'

const ROOM_CLEANUP_DELAY_MS = 5 * 60 * 1000 // 5 minutes

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous 0/O/1/I
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

interface Player {
  ws: WebSocket
  info: PlayerInfo
}

class Room {
  id: string
  players: Map<WebSocket, Player> = new Map()
  private nextPlayerId = 1
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null

  constructor(id: string) {
    this.id = id
  }

  addPlayer(ws: WebSocket, name: string, characterIndex: number): PlayerInfo {
    // Cancel cleanup timer if room was going to be deleted
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
      this.cleanupTimer = null
    }

    const info: PlayerInfo = {
      id: this.nextPlayerId++,
      name,
      characterIndex: characterIndex % 6, // clamp to 0-5
      status: 'idle',
      seatId: null,
    }

    this.players.set(ws, { ws, info })
    return info
  }

  removePlayer(ws: WebSocket): PlayerInfo | null {
    const player = this.players.get(ws)
    if (!player) return null
    this.players.delete(ws)
    return player.info
  }

  getPlayerInfos(): PlayerInfo[] {
    return Array.from(this.players.values()).map(p => p.info)
  }

  getPlayer(ws: WebSocket): Player | undefined {
    return this.players.get(ws)
  }

  broadcast(msg: unknown, exclude?: WebSocket): void {
    const data = JSON.stringify(msg)
    for (const player of this.players.values()) {
      if (player.ws !== exclude && player.ws.readyState === 1) {
        player.ws.send(data)
      }
    }
  }

  get isEmpty(): boolean {
    return this.players.size === 0
  }

  /** Schedule room deletion after delay */
  scheduleCleanup(onCleanup: () => void): void {
    this.cleanupTimer = setTimeout(() => {
      if (this.isEmpty) {
        onCleanup()
      }
    }, ROOM_CLEANUP_DELAY_MS)
  }
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map()
  private wsToRoom: Map<WebSocket, Room> = new Map()

  handleMessage(ws: WebSocket, msg: Record<string, unknown>): void {
    switch (msg.type) {
      case 'createRoom':
        this.handleCreateRoom(ws, msg.playerName as string, msg.characterIndex as number)
        break
      case 'joinRoom':
        this.handleJoinRoom(ws, msg.roomId as string, msg.playerName as string, msg.characterIndex as number)
        break
      case 'setStatus':
        this.handleSetStatus(ws, msg.status as PlayerStatus)
        break
      case 'reassignSeat':
        this.handleReassignSeat(ws, msg.seatId as string)
        break
      case 'ping':
        this.sendTo(ws, { type: 'pong' })
        break
    }
  }

  handleDisconnect(ws: WebSocket): void {
    const room = this.wsToRoom.get(ws)
    if (!room) return

    const player = room.removePlayer(ws)
    this.wsToRoom.delete(ws)

    if (player) {
      room.broadcast({ type: 'playerLeft', playerId: player.id })
    }

    if (room.isEmpty) {
      room.scheduleCleanup(() => {
        this.rooms.delete(room.id)
        console.log(`[Room] Cleaned up empty room ${room.id}`)
      })
    }
  }

  private handleCreateRoom(ws: WebSocket, playerName: string, characterIndex: number): void {
    // Generate unique room ID
    let roomId: string
    do {
      roomId = generateRoomId()
    } while (this.rooms.has(roomId))

    const room = new Room(roomId)
    this.rooms.set(roomId, room)

    const playerInfo = room.addPlayer(ws, playerName, characterIndex)
    this.wsToRoom.set(ws, room)

    this.sendTo(ws, {
      type: 'roomJoined',
      roomId,
      playerId: playerInfo.id,
      players: [playerInfo],
    })

    console.log(`[Room] Created room ${roomId} by ${playerName}`)
  }

  private handleJoinRoom(ws: WebSocket, roomId: string, playerName: string, characterIndex: number): void {
    const room = this.rooms.get(roomId)
    if (!room) {
      this.sendTo(ws, { type: 'error', message: `Room ${roomId} not found` })
      return
    }

    const existingPlayers = room.getPlayerInfos()
    const playerInfo = room.addPlayer(ws, playerName, characterIndex)
    this.wsToRoom.set(ws, room)

    // Send room state to the new player
    this.sendTo(ws, {
      type: 'roomJoined',
      roomId,
      playerId: playerInfo.id,
      players: [...existingPlayers, playerInfo],
    })

    // Notify existing players
    room.broadcast({ type: 'playerJoined', player: playerInfo }, ws)

    console.log(`[Room] ${playerName} joined room ${roomId} (${room.players.size} players)`)
  }

  private handleSetStatus(ws: WebSocket, status: PlayerStatus): void {
    const room = this.wsToRoom.get(ws)
    if (!room) return
    const player = room.getPlayer(ws)
    if (!player) return

    player.info.status = status
    room.broadcast({ type: 'playerStatusChanged', playerId: player.info.id, status }, ws)
  }

  private handleReassignSeat(ws: WebSocket, seatId: string): void {
    const room = this.wsToRoom.get(ws)
    if (!room) return
    const player = room.getPlayer(ws)
    if (!player) return

    player.info.seatId = seatId
    room.broadcast({ type: 'playerSeatChanged', playerId: player.info.id, seatId }, ws)
  }

  private sendTo(ws: WebSocket, msg: unknown): void {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(msg))
    }
  }

  get roomCount(): number {
    return this.rooms.size
  }
}
