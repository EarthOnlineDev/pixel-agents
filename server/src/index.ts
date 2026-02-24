/** Pixel Office WebSocket Server */

import { WebSocketServer } from 'ws'
import { RoomManager } from './roomManager.js'

const PORT = parseInt(process.env.PORT || '3001', 10)

const wss = new WebSocketServer({ port: PORT })
const rooms = new RoomManager()

wss.on('connection', (ws) => {
  console.log(`[Server] Client connected (total: ${wss.clients.size})`)

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      rooms.handleMessage(ws, msg)
    } catch (err) {
      console.warn('[Server] Invalid message:', err)
    }
  })

  ws.on('close', () => {
    rooms.handleDisconnect(ws)
    console.log(`[Server] Client disconnected (total: ${wss.clients.size})`)
  })

  ws.on('error', (err) => {
    console.warn('[Server] WebSocket error:', err.message)
  })
})

console.log(`Pixel Office server running on ws://localhost:${PORT}`)
console.log(`Active rooms: ${rooms.roomCount}`)
