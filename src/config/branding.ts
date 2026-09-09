/**
 * Khulafasco School Branding Configuration
 * Derived from the official KhOSA (Al Khulafau Ar-Rashiduun Islamic Old Students Association) logo.
 */

export const SCHOOL = {
  name: "Alkhulafau Arrashiduun Islamic Senior High School",
  shortName: "Khulafasco",
  abbreviation: "KHAS",
  motto: "We Will Never Forget The Ladder",
  address: "Ghana",
  logo: "/school-logo.png",
  receiptPrefix: "KHA",
} as const;

/**
 * Design tokens derived from the KhOSA logo:
 * - Primary: Deep burgundy/maroon — the dominant badge color
 * - Secondary: Rose gold — highlights and accents
 * - Accent: Warm cream — light backgrounds
 */
export const BRAND_COLORS = {
  primary: "#6B1A2A",
  primaryDark: "#3D0D17",
  primaryLight: "#8B2535",
  secondary: "#C4956A",
  secondaryLight: "#E8C9A0",
  accent: "#F5E6D3",
  background: "#FAFAF8",
  surface: "#FFFFFF",
} as const;
