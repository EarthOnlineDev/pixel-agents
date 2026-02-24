/**
 * useMultiplayer - Manages multiplayer state via Supabase Realtime.
 *
 * Uses Supabase Presence for player tracking and Broadcast for events.
 * Rooms are Supabase channels named `room:XXXXXX`.
 * No separate server needed.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { OfficeState } from '../office/engine/officeState.js'
import type { OfficeLayout } from '../office/types.js'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { migrateLayoutColors } from '../office/layout/layoutSerializer.js'
import { supabase } from '../network/supabaseClient.js'
import type { PlayerInfo, PlayerStatus } from '../network/protocol.js'
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

/** Generate a random 6-char room code (no ambiguous chars) */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/** Generate a random player ID (positive integer, avoids collisions) */
function generatePlayerId(): number {
  return Math.floor(Math.random() * 900000) + 100000
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
  const channelRef = useRef<RealtimeChannel | null>(null)
  const myInfoRef = useRef<PlayerInfo | null>(null)

  // Load assets on mount
  useEffect(() => {
    if (assetsLoadedRef.current) return
    assetsLoadedRef.current = true

    loadAllAssets().then(async () => {
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

  // Cleanup channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  /** Subscribe to a room channel with Presence + Broadcast */
  const subscribeToRoom = useCallback((code: string, myInfo: PlayerInfo) => {
    const os = getOfficeState()

    const channel = supabase.channel(`room:${code}`, {
      config: { presence: { key: String(myInfo.id) } },
    })

    // Presence sync — rebuild full player list from presence state
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PlayerInfo>()
      const allPlayers: PlayerInfo[] = []

      for (const presences of Object.values(state)) {
        if (presences.length > 0) {
          const p = presences[0] as unknown as PlayerInfo
          allPlayers.push(p)
        }
      }

      setPlayers(allPlayers)

      // Sync characters with OfficeState
      const currentIds = new Set(os.characters.keys())
      const presenceIds = new Set(allPlayers.map((p) => p.id))

      // Add new characters
      for (const p of allPlayers) {
        if (!currentIds.has(p.id)) {
          const skipSpawn = p.id === myInfo.id
          os.addAgent(p.id, p.characterIndex, 0, p.seatId ?? undefined, skipSpawn)
          if (statusToActive(p.status)) {
            os.setAgentActive(p.id, true)
            os.setAgentTool(p.id, statusToTool(p.status))
          }
        }
      }

      // Remove departed characters (but keep my own)
      for (const id of currentIds) {
        if (!presenceIds.has(id) && id !== myInfo.id) {
          os.removeAgent(id)
        }
      }
    })

    // Broadcast: status changes from other players
    channel.on('broadcast', { event: 'status' }, ({ payload }) => {
      const { playerId, status } = payload as { playerId: number; status: PlayerStatus }
      if (playerId === myInfo.id) return

      os.setAgentActive(playerId, statusToActive(status))
      os.setAgentTool(playerId, statusToTool(status))
      if (status === 'afk') {
        os.showWaitingBubble(playerId)
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track our presence
        await channel.track({
          id: myInfo.id,
          name: myInfo.name,
          characterIndex: myInfo.characterIndex,
          status: myInfo.status,
          seatId: myInfo.seatId,
        })
        setConnected(true)
        setRoomId(code)
        setMyPlayerId(myInfo.id)

        // Add ourselves immediately
        os.addAgent(myInfo.id, myInfo.characterIndex, 0, undefined, true)
      }
    })

    channelRef.current = channel
    myInfoRef.current = myInfo
  }, [getOfficeState])

  const createRoom = useCallback((playerName: string, characterIndex: number) => {
    const code = generateRoomCode()
    const id = generatePlayerId()
    const myInfo: PlayerInfo = {
      id,
      name: playerName,
      characterIndex,
      status: 'idle',
      seatId: null,
    }
    subscribeToRoom(code, myInfo)
  }, [subscribeToRoom])

  const joinRoom = useCallback((targetRoomId: string, playerName: string, characterIndex: number) => {
    const id = generatePlayerId()
    const myInfo: PlayerInfo = {
      id,
      name: playerName,
      characterIndex,
      status: 'idle',
      seatId: null,
    }
    subscribeToRoom(targetRoomId, myInfo)
  }, [subscribeToRoom])

  const setStatus = useCallback((status: PlayerStatus) => {
    const channel = channelRef.current
    const myInfo = myInfoRef.current
    if (!channel || !myInfo) return

    // Update local ref
    myInfoRef.current = { ...myInfo, status }

    // Update presence (so new joiners see current status)
    channel.track({
      id: myInfo.id,
      name: myInfo.name,
      characterIndex: myInfo.characterIndex,
      status,
      seatId: myInfo.seatId,
    })

    // Broadcast to others for immediate update
    channel.send({
      type: 'broadcast',
      event: 'status',
      payload: { playerId: myInfo.id, status },
    })

    // Update local state immediately
    const os = getOfficeState()
    os.setAgentActive(myInfo.id, statusToActive(status))
    os.setAgentTool(myInfo.id, statusToTool(status))
    setPlayers(prev =>
      prev.map(p =>
        p.id === myInfo.id ? { ...p, status } : p,
      ),
    )
  }, [getOfficeState])

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
