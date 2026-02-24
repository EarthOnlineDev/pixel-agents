import { useState, useEffect, useRef } from 'react'
import { CharacterPicker } from './CharacterPicker.js'

interface LobbyPageProps {
  onCreateRoom: (playerName: string, characterIndex: number) => void
  onJoinRoom: (roomId: string, playerName: string, characterIndex: number) => void
  initialRoomId?: string | null
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#1a1a2e',
  color: '#e0e0e0',
  fontFamily: 'monospace',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--pixel-bg, #2a2a3e)',
  border: '2px solid var(--pixel-border, #4a4a6a)',
  borderRadius: 0,
  padding: '24px 32px',
  minWidth: 320,
  maxWidth: 420,
  boxShadow: '4px 4px 0px rgba(0,0,0,0.5)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '20px',
  fontFamily: 'monospace',
  background: 'rgba(0,0,0,0.3)',
  border: '2px solid rgba(255,255,255,0.2)',
  borderRadius: 0,
  color: '#e0e0e0',
  outline: 'none',
  boxSizing: 'border-box',
}

const btnBase: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: '22px',
  fontFamily: 'monospace',
  cursor: 'pointer',
  border: '2px solid transparent',
  borderRadius: 0,
  transition: 'background 0.15s',
}

export function LobbyPage({ onCreateRoom, onJoinRoom, initialRoomId }: LobbyPageProps) {
  const [playerName, setPlayerName] = useState('')
  const [characterIndex, setCharacterIndex] = useState(0)
  const [roomCode, setRoomCode] = useState(initialRoomId || '')
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>(initialRoomId ? 'join' : 'menu')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Restore name from localStorage
    const saved = localStorage.getItem('pixel-office-name')
    if (saved) setPlayerName(saved)
    const savedChar = localStorage.getItem('pixel-office-character')
    if (savedChar) setCharacterIndex(parseInt(savedChar, 10) || 0)
  }, [])

  useEffect(() => {
    nameRef.current?.focus()
  }, [mode])

  const canSubmit = playerName.trim().length > 0

  const handleCreate = () => {
    if (!canSubmit) return
    localStorage.setItem('pixel-office-name', playerName.trim())
    localStorage.setItem('pixel-office-character', String(characterIndex))
    onCreateRoom(playerName.trim(), characterIndex)
  }

  const handleJoin = () => {
    if (!canSubmit || !roomCode.trim()) return
    localStorage.setItem('pixel-office-name', playerName.trim())
    localStorage.setItem('pixel-office-character', String(characterIndex))
    onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim(), characterIndex)
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Title */}
        <h1
          style={{
            fontSize: '32px',
            textAlign: 'center',
            margin: '0 0 20px',
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '2px',
          }}
        >
          Pixel Office
        </h1>

        {/* Name input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>
            Your Name
          </label>
          <input
            ref={nameRef}
            style={inputStyle}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (mode === 'create') handleCreate()
                else if (mode === 'join') handleJoin()
              }
            }}
          />
        </div>

        {/* Character picker */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
            Choose Character
          </label>
          <CharacterPicker selected={characterIndex} onSelect={setCharacterIndex} />
        </div>

        {/* Mode: menu */}
        {mode === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => setMode('create')}
              style={{
                ...btnBase,
                background: 'rgba(90, 140, 255, 0.8)',
                color: '#fff',
                border: '2px solid rgba(90, 140, 255, 1)',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(90, 140, 255, 1)' }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'rgba(90, 140, 255, 0.8)' }}
            >
              Create Room
            </button>
            <button
              onClick={() => setMode('join')}
              style={{
                ...btnBase,
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.15)' }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
            >
              Join Room
            </button>
          </div>
        )}

        {/* Mode: create */}
        {mode === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleCreate}
              disabled={!canSubmit}
              style={{
                ...btnBase,
                background: canSubmit ? 'rgba(90, 140, 255, 0.8)' : 'rgba(90, 140, 255, 0.3)',
                color: canSubmit ? '#fff' : 'rgba(255,255,255,0.4)',
                border: '2px solid rgba(90, 140, 255, 0.6)',
                cursor: canSubmit ? 'pointer' : 'default',
              }}
            >
              Create Room
            </button>
            <button
              onClick={() => setMode('menu')}
              style={{
                ...btnBase,
                background: 'transparent',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '18px',
                padding: '6px',
              }}
            >
              Back
            </button>
          </div>
        )}

        {/* Mode: join */}
        {mode === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>
                Room Code
              </label>
              <input
                style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '3px', textAlign: 'center' }}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="ABCDEF"
                maxLength={6}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoin()
                }}
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!canSubmit || !roomCode.trim()}
              style={{
                ...btnBase,
                background: canSubmit && roomCode.trim() ? 'rgba(90, 140, 255, 0.8)' : 'rgba(90, 140, 255, 0.3)',
                color: canSubmit && roomCode.trim() ? '#fff' : 'rgba(255,255,255,0.4)',
                border: '2px solid rgba(90, 140, 255, 0.6)',
                cursor: canSubmit && roomCode.trim() ? 'pointer' : 'default',
              }}
            >
              Join Room
            </button>
            <button
              onClick={() => { setMode('menu'); setRoomCode('') }}
              style={{
                ...btnBase,
                background: 'transparent',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '18px',
                padding: '6px',
              }}
            >
              Back
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, fontSize: '16px', color: 'rgba(255,255,255,0.3)' }}>
        Pixel Office - Code together, virtually
      </div>
    </div>
  )
}
