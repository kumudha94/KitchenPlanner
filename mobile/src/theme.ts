export const colors = {
  primary: "#7C3AED",
  primaryDark: "#5B21B6",
  primaryLight: "#EDE9FE",
  primarySoft: "#F5F3FF",

  background: "#FAFAFB",
  surface: "#FFFFFF",
  border: "#E9E5F5",

  textPrimary: "#1E1B2E",
  textSecondary: "#6B6478",
  textMuted: "#A29CB5",

  danger: "#DC2626",
  dangerSoft: "#FEF2F2",

  white: "#FFFFFF",
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const shadow = {
  shadowColor: "#3D2A6D",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
} as const;
