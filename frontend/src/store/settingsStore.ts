import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SupportedLanguage } from '../lib/languages'

export type CoachTone = 'warm' | 'neutral' | 'strict'

export type SettingsState = {
  uiLanguage: SupportedLanguage
  nativeLanguage: SupportedLanguage
  targetLanguage: SupportedLanguage
  correctionEnabled: boolean
  coachTone: CoachTone
  themePreset: string
  themeCustomColor: string
  setAll: (next: Omit<SettingsState, 'setAll'>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      uiLanguage: 'ko',
      nativeLanguage: 'ko',
      targetLanguage: 'en',
      correctionEnabled: true,
      coachTone: 'warm',
      themePreset: 'graphite',
      themeCustomColor: '#111827',
      setAll: (next) => set(next),
    }),
    { name: 'thredge-settings-v1' },
  ),
)
