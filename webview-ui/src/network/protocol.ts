/** WebSocket protocol message types for Pixel Office multiplayer */

export type PlayerStatus = 'coding' | 'reading' | 'idle' | 'afk'

export interface PlayerInfo {
  id: number
  name: string
  characterIndex: number
  status: PlayerStatus
  seatId: string | null
}

// ── Client → Server messages ──

export interface C2S_CreateRoom {
  type: 'createRoom'
  playerName: string
  characterIndex: number
}

export interface C2S_JoinRoom {
  type: 'joinRoom'
  roomId: string
  playerName: string
  characterIndex: number
}

export interface C2S_SetStatus {
  type: 'setStatus'
  status: PlayerStatus
}

export interface C2S_ReassignSeat {
  type: 'reassignSeat'
  seatId: string
}

export interface C2S_Ping {
  type: 'ping'
}

export type ClientMessage =
  | C2S_CreateRoom
  | C2S_JoinRoom
  | C2S_SetStatus
  | C2S_ReassignSeat
  | C2S_Ping

// ── Server → Client messages ──

export interface S2C_RoomJoined {
  type: 'roomJoined'
  roomId: string
  playerId: number
  players: PlayerInfo[]
}

export interface S2C_PlayerJoined {
  type: 'playerJoined'
  player: PlayerInfo
}

export interface S2C_PlayerLeft {
  type: 'playerLeft'
  playerId: number
}

export interface S2C_PlayerStatusChanged {
  type: 'playerStatusChanged'
  playerId: number
  status: PlayerStatus
}

export interface S2C_PlayerSeatChanged {
  type: 'playerSeatChanged'
  playerId: number
  seatId: string
}

export interface S2C_Pong {
  type: 'pong'
}

export interface S2C_Error {
  type: 'error'
  message: string
}

export type ServerMessage =
  | S2C_RoomJoined
  | S2C_PlayerJoined
  | S2C_PlayerLeft
  | S2C_PlayerStatusChanged
  | S2C_PlayerSeatChanged
  | S2C_Pong
  | S2C_Error
