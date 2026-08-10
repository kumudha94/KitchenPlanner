import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, type } from "../theme";

const STEPS = [
  { key: "plan", label: "Plan", icon: "today-outline" as const },
  { key: "shop", label: "Shop", icon: "cart-outline" as const },
  { key: "prep", label: "Prep", icon: "flame-outline" as const },
  { key: "cook", label: "Cook", icon: "restaurant-outline" as const },
];

type Props = {
  active: "shop" | "prep";
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

export default function WorkflowTeaser({ active, icon, title, description }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {STEPS.map((step, i) => {
          const isActive = step.key === active;
          return (
            <View key={step.key} style={styles.stepWrap}>
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, isActive && styles.stepDotActive]}>
                  <Ionicons name={step.icon} size={14} color={isActive ? colors.white : colors.textMuted} />
                </View>
                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step.label}</Text>
              </View>
              {i < STEPS.length - 1 ? <View style={styles.connector} /> : null}
            </View>
          );
        })}
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name={icon} size={30} color={colors.accent} />
        </View>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  stepsRow: { flexDirection: "row", alignItems: "flex-start", marginTop: spacing.sm },
  stepWrap: { flexDirection: "row", alignItems: "center", flex: 1, justifyContent: "center" },
  stepItem: { alignItems: "center", gap: 6, width: 56 },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: { backgroundColor: colors.accent },
  stepLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  stepLabelActive: { color: colors.accentDark },
  connector: { flex: 1, height: 1, backgroundColor: colors.border, marginBottom: 18 },

  hero: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.lg },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  heroTitle: { ...type.title, color: colors.textPrimary, marginBottom: spacing.xs },
  heroDescription: { ...type.body, color: colors.textSecondary, textAlign: "center", lineHeight: 21 },
});
