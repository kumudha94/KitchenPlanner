import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";

export default function PrepLogScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="journal-outline" size={40} color={colors.textMuted} />
      <Text style={styles.text}>Prep log coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background, gap: spacing.sm },
  text: { fontSize: 15, color: colors.textSecondary },
});
