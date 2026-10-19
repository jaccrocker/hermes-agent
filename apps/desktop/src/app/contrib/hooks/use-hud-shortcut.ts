import { useEffect } from 'react'

import { hudTargetSessionId } from '@/app/hud/handoff'
import { toggleHud } from '@/store/hud'
import { $comboIndex } from '@/store/keybinds'
import { isMainWindow } from '@/store/windows'

/** Only the primary renderer owns the global chord and its session target. */
export function useHudShortcut(): void {
  useEffect(() => {
    const api = window.hermesDesktop?.hud

    if (!isMainWindow() || !api?.onToggle || !api.setGlobalShortcutEnabled) {
      return
    }

    const offToggle = api.onToggle(() => toggleHud(hudTargetSessionId()))

    const offBindings = $comboIndex.subscribe(index => {
      api.setGlobalShortcutEnabled?.(index.get('mod+shift+h')?.[0] === 'view.toggleHud')
    })

    return () => {
      offToggle()
      offBindings()
      api.setGlobalShortcutEnabled?.(false)
    }
  }, [])
}
