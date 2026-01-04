const DEFAULT_PRIMARY = '#111827'

export const CUSTOM_THEME_ID = 'custom'

export type UiThemePreset = {
  id: string
  name: string
  primary: string
}

export type UiThemeColors = {
  primary: string
  onPrimary: string
  ink: string
  muted: string
  soft: string
  surface: string
  border: string
}

export const uiThemePresets: UiThemePreset[] = [
  { id: 'original', name: 'Original', primary: '#111827' },
  { id: 'graphite', name: 'Graphite', primary: '#111827' },
  { id: 'slate', name: 'Slate', primary: '#334155' },
  { id: 'midnight', name: 'Midnight', primary: '#1f2937' },
  { id: 'ocean', name: 'Ocean', primary: '#0ea5e9' },
  { id: 'lagoon', name: 'Lagoon', primary: '#0d9488' },
  { id: 'forest', name: 'Forest', primary: '#166534' },
  { id: 'moss', name: 'Moss', primary: '#4d7c0f' },
  { id: 'amber', name: 'Amber', primary: '#d97706' },
  { id: 'sunset', name: 'Sunset', primary: '#ea580c' },
  { id: 'coral', name: 'Coral', primary: '#f97316' },
  { id: 'rose', name: 'Rose', primary: '#e11d48' },
  { id: 'plum', name: 'Plum', primary: '#7c3aed' },
  { id: 'indigo', name: 'Indigo', primary: '#4338ca' },
  { id: 'cobalt', name: 'Cobalt', primary: '#1d4ed8' },
  { id: 'fenerbahce', name: 'Fenerbahce', primary: '#0b2f6d' },
  { id: 'cedar', name: 'Cedar', primary: '#7c2d12' },
]

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const normalizeHexColor = (value: string): string | null => {
  const trimmed = value.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    const expanded = trimmed
      .split('')
      .map((char) => char + char)
      .join('')
    return `#${expanded.toLowerCase()}`
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`
  }
  return null
}

const hexToRgb = (hex: string) => {
  const normalized = normalizeHexColor(hex) ?? DEFAULT_PRIMARY
  const value = normalized.replace('#', '')
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`

const mix = (hexA: string, hexB: string, amount: number) => {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  return rgbToHex(
    a.r * (1 - amount) + b.r * amount,
    a.g * (1 - amount) + b.g * amount,
    a.b * (1 - amount) + b.b * amount,
  )
}

const luminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex)
  const toLinear = (value: number) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

const resolveOnPrimary = (primary: string) => (luminance(primary) > 0.6 ? '#111827' : '#ffffff')

export const buildThemeFromPrimary = (primary: string): UiThemeColors => {
  const normalized = normalizeHexColor(primary) ?? DEFAULT_PRIMARY
  return {
    primary: normalized,
    onPrimary: resolveOnPrimary(normalized),
    ink: mix(normalized, '#000000', 0.85),
    muted: mix(normalized, '#000000', 0.65),
    soft: mix(normalized, '#ffffff', 0.86),
    surface: mix(normalized, '#ffffff', 0.93),
    border: mix(normalized, '#ffffff', 0.75),
  }
}

export const resolveTheme = (presetId: string, customColor: string): UiThemeColors => {
  if (presetId !== CUSTOM_THEME_ID) {
    const preset = uiThemePresets.find((item) => item.id === presetId)
    if (preset) {
      return buildThemeFromPrimary(preset.primary)
    }
  }
  const fallback = uiThemePresets[0]?.primary ?? DEFAULT_PRIMARY
  const normalizedCustom = normalizeHexColor(customColor) ?? fallback
  return buildThemeFromPrimary(normalizedCustom)
}

export const applyTheme = (theme: UiThemeColors) => {
  if (typeof document === 'undefined') {
    return
  }
  const root = document.documentElement
  root.style.setProperty('--theme-primary', theme.primary)
  root.style.setProperty('--theme-on-primary', theme.onPrimary)
  root.style.setProperty('--theme-ink', theme.ink)
  root.style.setProperty('--theme-muted', theme.muted)
  root.style.setProperty('--theme-soft', theme.soft)
  root.style.setProperty('--theme-surface', theme.surface)
  root.style.setProperty('--theme-border', theme.border)
}

export const normalizeThemeHex = normalizeHexColor
