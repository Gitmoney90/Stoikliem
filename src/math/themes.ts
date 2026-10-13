import { ThemeConfig, ThemeId } from '../types/graph';

export const THEMES: Record<ThemeId, ThemeConfig> = {
  parchment: {
    id: 'parchment',
    name: 'Principia Parchment',
    description: 'Academic warm vellum manuscript with sepia drafting grid & ink curves',
    bgCanvas: '#FAF6EE',
    bgSidebar: '#F3EDE0',
    bgCard: '#FFFFFF',
    border: '#E2D7C3',
    textPrimary: '#2C2218',
    textSecondary: '#6B5B49',
    textMuted: '#968470',
    gridMajor: 'rgba(120, 95, 65, 0.28)',
    gridMinor: 'rgba(120, 95, 65, 0.12)',
    gridAxis: 'rgba(60, 42, 24, 0.75)',
    axisText: '#4A3B2C',
    accent: '#8B4513',
    curvePalette: [
      '#1E3A8A', // Oxford Indigo
      '#B91C1C', // Alizarin Crimson
      '#15803D', // Veronese Forest Green
      '#C2410C', // Burnt Amber
      '#7E22CE', // Tyrian Violet
      '#0E7490', // Aegean Cyan
      '#A16207', // Raw Ochre
      '#BE185D', // Venetian Rose
    ],
  },
  slate: {
    id: 'slate',
    name: 'Royal Academy Slate',
    description: 'Dark lecture hall slate chalkboard with crisp luminous chalk traces',
    bgCanvas: '#11151C',
    bgSidebar: '#181E29',
    bgCard: '#212836',
    border: '#2F384B',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    gridMajor: 'rgba(255, 255, 255, 0.18)',
    gridMinor: 'rgba(255, 255, 255, 0.07)',
    gridAxis: 'rgba(255, 255, 255, 0.65)',
    axisText: '#CBD5E1',
    accent: '#F59E0B',
    curvePalette: [
      '#38BDF8', // Celestial Sky
      '#F43F5E', // Carmine Chalk
      '#4ADE80', // Emerald Chalk
      '#FBBF24', // Amber Gilt
      '#C084FC', // Violet Glow
      '#2DD4BF', // Mint Aurora
      '#FB923C', // Solar Flare
      '#E879F9', // Orchid Chalk
    ],
  },
  cartographer: {
    id: 'cartographer',
    name: 'Cartographer Ivory',
    description: 'Nautical celestial map aesthetic with brass indicators and navy ink',
    bgCanvas: '#F5F2EB',
    bgSidebar: '#EBE5D8',
    bgCard: '#FAF8F3',
    border: '#D9D0BE',
    textPrimary: '#1E293B',
    textSecondary: '#475569',
    textMuted: '#64748B',
    gridMajor: 'rgba(30, 58, 95, 0.22)',
    gridMinor: 'rgba(30, 58, 95, 0.09)',
    gridAxis: 'rgba(15, 23, 42, 0.8)',
    axisText: '#1E293B',
    accent: '#B45309',
    curvePalette: [
      '#0369A1', // Ocean Blue
      '#DC2626', // Navigator Red
      '#047857', // Pine Jade
      '#D97706', // Brass Gold
      '#4338CA', // Indigo Meridian
      '#0F766E', // Compass Teal
      '#9333EA', // Zenith Purple
      '#C026D3', // Magenta Sextant
    ],
  },
  engraving: {
    id: 'engraving',
    name: 'Monochrome Copperplate',
    description: 'High-contrast steel & copper engraved treatise with precise tonal linework',
    bgCanvas: '#0F1115',
    bgSidebar: '#171A21',
    bgCard: '#1F232D',
    border: '#2E3442',
    textPrimary: '#E2E8F0',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    gridMajor: 'rgba(226, 232, 240, 0.22)',
    gridMinor: 'rgba(226, 232, 240, 0.08)',
    gridAxis: 'rgba(241, 245, 249, 0.75)',
    axisText: '#CBD5E1',
    accent: '#E2E8F0',
    curvePalette: [
      '#E2E8F0', // Inked White
      '#94A3B8', // Silver Tone
      '#38BDF8', // Spectral Blue
      '#F59E0B', // Polished Brass
      '#F43F5E', // Vermilion
      '#34D399', // Mint Patina
      '#A78BFA', // Royal Heather
      '#F472B6', // Rose Quartz
    ],
  },
};
