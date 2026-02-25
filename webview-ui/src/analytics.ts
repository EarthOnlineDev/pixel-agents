import { track } from '@vercel/analytics'

export function trackRoomCreated() {
  track('room_created')
}

export function trackRoomJoined(roomId: string) {
  track('room_joined', { roomId })
}

export function trackEditModeToggled(enabled: boolean) {
  track('edit_mode_toggled', { enabled })
}

export function trackLayoutSaved() {
  track('layout_saved')
}

export function trackStatusChanged(status: string) {
  track('status_changed', { status })
}
