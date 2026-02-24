/** WebSocket client for Pixel Office multiplayer */

import type { ClientMessage, ServerMessage } from './protocol.js'

export type MessageHandler = (msg: ServerMessage) => void
export type ConnectionHandler = () => void

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
const RECONNECT_DELAY_MS = 3000
const PING_INTERVAL_MS = 30000

export class WsClient {
  private ws: WebSocket | null = null
  private onMessage: MessageHandler | null = null
  private onConnect: ConnectionHandler | null = null
  private onDisconnect: ConnectionHandler | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = false
  private pendingMessages: ClientMessage[] = []

  connect(): void {
    this.shouldReconnect = true
    this.doConnect()
  }

  private doConnect(): void {
    if (this.ws) return

    try {
      this.ws = new WebSocket(WS_URL)

      this.ws.onopen = () => {
        console.log('[WS] Connected to', WS_URL)
        this.onConnect?.()

        // Send any messages queued during reconnect
        for (const msg of this.pendingMessages) {
          this.send(msg)
        }
        this.pendingMessages = []

        // Start ping
        this.pingTimer = setInterval(() => {
          this.send({ type: 'ping' })
        }, PING_INTERVAL_MS)
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as ServerMessage
          this.onMessage?.(msg)
        } catch (err) {
          console.warn('[WS] Failed to parse message:', err)
        }
      }

      this.ws.onclose = () => {
        console.log('[WS] Disconnected')
        this.cleanup()
        this.onDisconnect?.()

        if (this.shouldReconnect) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            this.doConnect()
          }, RECONNECT_DELAY_MS)
        }
      }

      this.ws.onerror = (err) => {
        console.warn('[WS] Error:', err)
      }
    } catch (err) {
      console.warn('[WS] Connection failed:', err)
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null
          this.doConnect()
        }, RECONNECT_DELAY_MS)
      }
    }
  }

  send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.cleanup()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  private cleanup(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws = null
  }

  setOnMessage(handler: MessageHandler): void {
    this.onMessage = handler
  }

  setOnConnect(handler: ConnectionHandler): void {
    this.onConnect = handler
  }

  setOnDisconnect(handler: ConnectionHandler): void {
    this.onDisconnect = handler
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

/** Singleton client instance */
export const wsClient = new WsClient()
