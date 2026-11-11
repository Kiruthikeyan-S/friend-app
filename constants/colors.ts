/**
 * Light-Theme Color Palette & Design Tokens
 * Designed for a warm, calm, human-centric Personal AI Voice Assistant.
 * Strict light mode only — no dark mode tokens.
 */

export const Colors = {
  // Backgrounds
  background: '#FAF9F6', // Soft warm alabaster main background
  surface: '#FFFFFF', // Pure white elevated card / sheet surface
  surfaceSoft: '#F3F2EE', // Soft neutral stone for inputs & secondary pills
  surfaceHighlight: '#EBF3F0', // Subtle sage tint for active states & assistant accents
  surfaceWarning: '#FEF8EC', // Soft warm amber tint for Phase 1 notices
  surfaceDanger: '#FDF2F2', // Soft rose tint for destructive actions

  // Brand & Interactive Accents
  primary: '#2B6CB0', // Calm, trustworthy slate-blue primary action
  primarySoft: '#EBF4FF', // Soft blue wash for badges & active pills
  primaryDark: '#1E4E8C',
  accent: '#2F855A', // Warm sage green for voice / active listening
  accentSoft: '#E6F4EA',

  // Typography
  textPrimary: '#1A1D20', // Crisp deep charcoal for primary reading
  textSecondary: '#5A6065', // Balanced neutral slate for descriptions
  textMuted: '#8C939A', // Subtle grey for timestamps & placeholders
  textInverse: '#FFFFFF',

  // Chat Bubbles
  userBubble: '#1A1D20', // Refined dark slate for user messages
  userBubbleText: '#FFFFFF',
  assistantBubble: '#FFFFFF', // Clean card bubble for assistant
  assistantBubbleText: '#1A1D20',

  // Borders & Dividers
  border: '#E8E6E1',
  borderFocused: '#2B6CB0',
  divider: '#F0EFEA',

  // Semantic Status
  success: '#2F855A',
  warning: '#C05621',
  error: '#C53030',
  info: '#2B6CB0',

  // Voice States
  voiceIdle: '#2B6CB0',
  voiceListening: '#2F855A',
  voiceProcessing: '#D69E2E',
  voiceSpeaking: '#3182CE',
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
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
} as const;
