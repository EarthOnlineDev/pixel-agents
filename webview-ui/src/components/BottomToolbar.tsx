import { useState } from 'react'
import { SettingsModal } from './SettingsModal.js'
import type { PlayerStatus } from '../network/protocol.js'

interface BottomToolbarProps {
  isEditMode: boolean
  onToggleEditMode: () => void
  isDebugMode: boolean
  onToggleDebugMode: () => void
  currentStatus: PlayerStatus
  onSetStatus: (status: PlayerStatus) => void
  roomId: string | null
  playerCount: number
  connected: boolean
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 10,
  left: 10,
  zIndex: 'var(--pixel-controls-z)',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'var(--pixel-bg)',
  border: '2px solid var(--pixel-border)',
  borderRadius: 0,
  padding: '4px 6px',
  boxShadow: 'var(--pixel-shadow)',
}

const btnBase: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: '24px',
  color: 'var(--pixel-text)',
  background: 'var(--pixel-btn-bg)',
  border: '2px solid transparent',
  borderRadius: 0,
  cursor: 'pointer',
}

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: 'var(--pixel-active-bg)',
  border: '2px solid var(--pixel-accent)',
}

const STATUS_OPTIONS: { value: PlayerStatus; label: string }[] = [
  { value: 'coding', label: 'Coding' },
  { value: 'reading', label: 'Reading' },
  { value: 'idle', label: 'Idle' },
  { value: 'afk', label: 'AFK' },
]

export function BottomToolbar({
  isEditMode,
  onToggleEditMode,
  isDebugMode,
  onToggleDebugMode,
  currentStatus,
  onSetStatus,
  roomId,
  playerCount,
  connected,
}: BottomToolbarProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    if (!roomId) return
    const url = `${window.location.origin}${window.location.pathname}#${roomId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Cycle through statuses on click
  const handleStatusClick = () => {
    const currentIdx = STATUS_OPTIONS.findIndex((s) => s.value === currentStatus)
    const nextIdx = (currentIdx + 1) % STATUS_OPTIONS.length
    onSetStatus(STATUS_OPTIONS[nextIdx].value)
  }

  const statusLabel = STATUS_OPTIONS.find((s) => s.value === currentStatus)?.label || 'Idle'

  return (
    <>
      {/* Status + Room info panel (bottom-left) */}
      <div style={panelStyle}>
        {/* Status toggle button */}
        <button
          onClick={handleStatusClick}
          onMouseEnter={() => setHovered('status')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            padding: '5px 12px',
            background:
              hovered === 'status'
                ? 'var(--pixel-agent-hover-bg)'
                : 'var(--pixel-agent-bg)',
            border: '2px solid var(--pixel-agent-border)',
            color: 'var(--pixel-agent-text)',
          }}
          title="Click to cycle status"
        >
          {statusLabel}
        </button>
        <button
          onClick={onToggleEditMode}
          onMouseEnter={() => setHovered('edit')}
          onMouseLeave={() => setHovered(null)}
          style={
            isEditMode
              ? { ...btnActive }
              : {
                  ...btnBase,
                  background: hovered === 'edit' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
                }
          }
          title="Edit office layout"
        >
          Layout
        </button>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsSettingsOpen((v) => !v)}
            onMouseEnter={() => setHovered('settings')}
            onMouseLeave={() => setHovered(null)}
            style={
              isSettingsOpen
                ? { ...btnActive }
                : {
                    ...btnBase,
                    background: hovered === 'settings' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
                  }
            }
            title="Settings"
          >
            Settings
          </button>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            isDebugMode={isDebugMode}
            onToggleDebugMode={onToggleDebugMode}
          />
        </div>
      </div>

      {/* Room info panel (bottom-right) */}
      {roomId && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            zIndex: 'var(--pixel-controls-z)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--pixel-bg)',
            border: '2px solid var(--pixel-border)',
            borderRadius: 0,
            padding: '4px 10px',
            boxShadow: 'var(--pixel-shadow)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: connected ? 'var(--pixel-status-active)' : 'var(--pixel-status-permission)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '20px', color: 'var(--pixel-text)', letterSpacing: '2px' }}>
            {roomId}
          </span>
          <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)' }}>
            {playerCount} {playerCount === 1 ? 'player' : 'players'}
          </span>
          <button
            onClick={handleCopyLink}
            onMouseEnter={() => setHovered('copy')}
            onMouseLeave={() => setHovered(null)}
            style={{
              ...btnBase,
              fontSize: '18px',
              padding: '2px 8px',
              background: hovered === 'copy' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
            }}
            title="Copy room link"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      )}
    </>
  )
}
