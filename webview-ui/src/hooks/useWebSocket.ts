/**
 * useWebSocket - Replaces useExtensionMessages for multiplayer web app.
 *
 * Connects to the WebSocket server, manages room state,
 * and translates server messages into OfficeState mutations.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { OfficeState } from '../office/engine/officeState.js'
import type { OfficeLayout } from '../office/types.js'
import { migrateLayoutColors } from '../office/layout/layoutSerializer.js'
import { wsClient } from '../network/wsClient.js'
import type { ServerMessage, PlayerInfo, PlayerStatus } from '../network/protocol.js'
import { loadAllAssets, loadDefaultLayout } from '../network/assetLoader.js'

export interface MultiplayerState {
  roomId: string | null
  myPlayerId: number | null
  players: PlayerInfo[]
  layoutReady: boolean
  connected: boolean
  createRoom: (playerName: string, characterIndex: number) => void
  joinRoom: (roomId: string, playerName: string, characterIndex: number) => void
  setStatus: (status: PlayerStatus) => void
}

/** Map player status to character tool name for animation */
function statusToTool(status: PlayerStatus): string | null {
  switch (status) {
    case 'coding': return 'Edit'
    case 'reading': return 'Read'
    case 'idle': return null
    case 'afk': return null
  }
}

function statusToActive(status: PlayerStatus): boolean {
  return status === 'coding' || status === 'reading'
}

export function useWebSocket(
  getOfficeState: () => OfficeState,
  onLayoutLoaded?: (layout: OfficeLayout) => void,
): MultiplayerState {
  const [roomId, setRoomId] = useState<string | null>(null)
  const [myPlayerId, setMyPlayerId] = useState<number | null>(null)
  const [players, setPlayers] = useState<PlayerInfo[]>([])
  const [layoutReady, setLayoutReady] = useState(false)
  const [connected, setConnected] = useState(false)
  const assetsLoadedRef = useRef(false)

  // Load assets on mount (browser-based, replaces extension asset messages)
  useEffect(() => {
    if (assetsLoadedRef.current) return
    assetsLoadedRef.current = true

    loadAllAssets().then(async () => {
      // Load default layout
      const rawLayout = await loadDefaultLayout()
      const os = getOfficeState()
      if (rawLayout && (rawLayout as { version?: number }).version === 1) {
        const layout = migrateLayoutColors(rawLayout as unknown as OfficeLayout)
        os.rebuildFromLayout(layout)
        onLayoutLoaded?.(layout)
      } else {
        onLayoutLoaded?.(os.getLayout())
      }
      setLayoutReady(true)
    })
  }, [getOfficeState, onLayoutLoaded])

  // Handle server messages
  useEffect(() => {
    wsClient.setOnMessage((msg: ServerMessage) => {
      const os = getOfficeState()

      switch (msg.type) {
        case 'roomJoined': {
          setRoomId(msg.roomId)
          setMyPlayerId(msg.playerId)
          setPlayers(msg.players)

          // Add all existing players as characters
          for (const p of msg.players) {
            if (!os.characters.has(p.id)) {
              os.addAgent(p.id, p.characterIndex, 0, p.seatId ?? undefined, true)
              if (statusToActive(p.status)) {
                os.setAgentActive(p.id, true)
                os.setAgentTool(p.id, statusToTool(p.status))
              }
            }
          }
          break
        }

        case 'playerJoined': {
          setPlayers(prev => [...prev, msg.player])
          os.addAgent(msg.player.id, msg.player.characterIndex, 0, msg.player.seatId ?? undefined)
          break
        }

        case 'playerLeft': {
          setPlayers(prev => prev.filter(p => p.id !== msg.playerId))
          os.removeAgent(msg.playerId)
          break
        }

        case 'playerStatusChanged': {
          setPlayers(prev =>
            prev.map(p =>
              p.id === msg.playerId ? { ...p, status: msg.status } : p,
            ),
          )
          os.setAgentActive(msg.playerId, statusToActive(msg.status))
          os.setAgentTool(msg.playerId, statusToTool(msg.status))
          if (msg.status === 'afk') {
            os.showWaitingBubble(msg.playerId)
          }
          break
        }

        case 'playerSeatChanged': {
          setPlayers(prev =>
            prev.map(p =>
              p.id === msg.playerId ? { ...p, seatId: msg.seatId } : p,
            ),
          )
          os.reassignSeat(msg.playerId, msg.seatId)
          break
        }

        case 'error': {
          console.error('[WS] Server error:', msg.message)
          break
        }
      }
    })

    wsClient.setOnConnect(() => setConnected(true))
    wsClient.setOnDisconnect(() => setConnected(false))
  }, [getOfficeState])

  const createRoom = useCallback((playerName: string, characterIndex: number) => {
    wsClient.connect()
    // Wait for connection, then send create
    const check = setInterval(() => {
      if (wsClient.isConnected) {
        clearInterval(check)
        wsClient.send({ type: 'createRoom', playerName, characterIndex })
      }
    }, 100)
    // Timeout after 10s
    setTimeout(() => clearInterval(check), 10000)
  }, [])

  const joinRoom = useCallback((targetRoomId: string, playerName: string, characterIndex: number) => {
    wsClient.connect()
    const check = setInterval(() => {
      if (wsClient.isConnected) {
        clearInterval(check)
        wsClient.send({ type: 'joinRoom', roomId: targetRoomId, playerName, characterIndex })
      }
    }, 100)
    setTimeout(() => clearInterval(check), 10000)
  }, [])

  const setStatus = useCallback((status: PlayerStatus) => {
    wsClient.send({ type: 'setStatus', status })
    // Update local state immediately
    if (myPlayerId !== null) {
      const os = getOfficeState()
      os.setAgentActive(myPlayerId, statusToActive(status))
      os.setAgentTool(myPlayerId, statusToTool(status))
      setPlayers(prev =>
        prev.map(p =>
          p.id === myPlayerId ? { ...p, status } : p,
        ),
      )
    }
  }, [myPlayerId, getOfficeState])

  return {
    roomId,
    myPlayerId,
    players,
    layoutReady,
    connected,
    createRoom,
    joinRoom,
    setStatus,
  }
}
