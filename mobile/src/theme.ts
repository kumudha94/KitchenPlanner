import { useColorScheme } from "react-native";

export type ThemeColors = {
  accent: string;
  accentDark: string;
  accentSoft: string;
  accentTint: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  danger: string;
  dangerSoft: string;
  white: string;
  breakfast: string;
  lunch: string;
  snack: string;
  dinner: string;
};

const lightColors: ThemeColors = {
  accent: "#8B5CF6",
  accentDark: "#6D28D9",
  accentSoft: "#F1EBFC",
  accentTint: "#EDE4FA",

  background: "#FBF6EF",
  surface: "#FFFFFF",
  surfaceAlt: "#F4EEE3",
  border: "#EBE2D3",

  textPrimary: "#221D17",
  textSecondary: "#7A7168",
  textMuted: "#AFA598",

  danger: "#C4432E",
  dangerSoft: "#FBEEEA",

  white: "#FFFFFF",

  breakfast: "#E8A33D",
  lunch: "#4E9A6A",
  snack: "#B5673F",
  dinner: "#5B6FBF",
};

const darkColors: ThemeColors = {
  accent: "#A78BFA",
  accentDark: "#E4D9FF",
  accentSoft: "#372C56",
  accentTint: "#2E2547",

  background: "#161310",
  surface: "#221E18",
  surfaceAlt: "#2B261E",
  border: "#39332A",

  textPrimary: "#F4EFE7",
  textSecondary: "#B4AA9B",
  textMuted: "#7E7666",

  danger: "#E27C6B",
  dangerSoft: "#3A2420",

  white: "#FFFFFF",

  breakfast: "#F0B75F",
  lunch: "#6DBE8C",
  snack: "#D08A5E",
  dinner: "#8393E0",
};

export function useColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkColors : lightColors;
}

export function useShadow() {
  const scheme = useColorScheme();
  return scheme === "dark"
    ? ({
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 2,
      } as const)
    : ({
        shadowColor: "#3A2E1A",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
      } as const);
}

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const type = {
  hero: { fontSize: 26, fontWeight: "800" as const, letterSpacing: -0.4 },
  title: { fontSize: 19, fontWeight: "700" as const },
  subtitle: { fontSize: 14, fontWeight: "500" as const },
  body: { fontSize: 15, fontWeight: "500" as const },
  label: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.3 },
  caption: { fontSize: 12, fontWeight: "500" as const },
} as const;
