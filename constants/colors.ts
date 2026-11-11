/**
 * Light-Theme Pastel Glassmorphism Color Palette & Design Tokens
 * Inspired by soft rose-lavender frosted glass, iridescent pearl orbs,
 * and crisp white translucent cards. Strict light mode only.
 */

export const Colors = {
  // Ambient Glassmorphism Backgrounds
  background: '#F7EFF6', // Soft pastel blush-lavender base canvas
  surface: 'rgba(255, 255, 255, 0.80)', // Frosted white glass card surface
  surfaceSolid: '#FFFFFF', // Pure white for high-contrast pills & modals
  surfaceSoft: 'rgba(255, 255, 255, 0.62)', // Translucent secondary glass pill
  surfaceHighlight: 'rgba(236, 106, 181, 0.14)', // Soft orchid-pink glass tint
  surfaceWarning: 'rgba(254, 243, 199, 0.85)',
  surfaceDanger: 'rgba(254, 226, 226, 0.85)',

  // Iridescent & Glass Glows
  orbPink: '#F482C8',
  orbMagenta: '#E566B2',
  orbViolet: '#A78BFA',
  orbCyan: '#5CE1E6',
  orbAqua: '#7BF1A8',
  ambientPinkGlow: 'rgba(244, 130, 200, 0.24)',
  ambientLavenderGlow: 'rgba(167, 139, 250, 0.18)',
  ambientCyanGlow: 'rgba(92, 225, 230, 0.18)',

  // Brand & Interactive Accents (Orchid Rose & Violet)
  primary: '#D95BA3', // Vibrant pastel orchid-magenta primary accent ("Ask Me", User Bubble)
  primarySoft: 'rgba(236, 106, 181, 0.15)', // Frosted rose wash
  primaryDark: '#B83D84',
  accent: '#8B5CF6', // Iridescent soft violet for voice pulse & active states
  accentSoft: 'rgba(139, 92, 246, 0.13)',

  // Typography
  textPrimary: '#1E1B24', // Deep plum-charcoal for crisp readability
  textSecondary: '#655E70', // Soft muted mauve-slate for subtitles
  textMuted: '#968EA3', // Delicate lavender-grey for timestamps & placeholders
  textInverse: '#FFFFFF',

  // Chat Bubbles (Matching "Smart Chat" Glassmorphism Design)
  userBubble: '#EC6AB5', // Signature pastel rose-magenta pill from mockup
  userBubbleText: '#FFFFFF',
  assistantBubble: 'rgba(255, 255, 255, 0.88)', // Frosted glass bubble for assistant
  assistantBubbleText: '#231F2B',

  // Glass Borders & Dividers
  border: 'rgba(255, 255, 255, 0.92)', // Specular white glass edge
  borderSubtle: 'rgba(225, 208, 228, 0.55)', // Soft pastel outline
  borderFocused: '#EC6AB5',
  divider: 'rgba(225, 208, 228, 0.45)',

  // Semantic Status
  success: '#10B981',
  warning: '#D97706',
  error: '#E11D48',
  info: '#8B5CF6',

  // Voice States
  voiceIdle: '#D95BA3',
  voiceListening: '#EC6AB5',
  voiceProcessing: '#8B5CF6',
  voiceSpeaking: '#06B6D4',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  full: 9999,
} as const;
