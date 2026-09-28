export const DESIGN_TOKENS = {
  GREEN_DARK: '#14532D', // headers, avatar backgrounds
  GREEN_MID: '#16A34A', // primary buttons, progress fill, active step circle
  GREEN_LIGHT: '#22C55E', // accents, live GPS indicator
  GREEN_BG: '#DCFCE7', // completed step icon background
  BG: '#F4F7F5', // screen background
  CARD_BG: '#FFFFFF', // card background, borderRadius: 24
  TEXT_PRIMARY: '#0F172A', // headings
  TEXT_SECONDARY: '#64748B', // subtitles, meta text
  TEXT_MUTED: '#94A3B8', // placeholders, pending step labels
  ERROR: '#EF4444', // error states, wrong OTP
  WARNING: '#F59E0B', // warning banners
  BORDER: '#E2E8F0', // card borders, dividers
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
export default DESIGN_TOKENS;
