import { useEffect, useMemo, useState } from "react";
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
  isDailyReminderEnabled,
  setDailyReminderEnabled,
} from "../lib/notifications";
import { useAuth } from "../contexts/AuthContext";
import { useColors, spacing, type, type ThemeColors } from "../theme";

export default function AccountScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, logout } = useAuth();
  const [remindersEnabled, setRemindersEnabled] = useState(false);

  // If the preference is already on (e.g. after a reinstall), make sure the
  // OS-level schedule actually exists — it doesn't survive a fresh install.
  useEffect(() => {
    isDailyReminderEnabled().then((enabled) => {
      setRemindersEnabled(enabled);
      if (enabled) scheduleDailyReminder();
    });
  }, []);

  async function handleToggleNotifications(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert("Permission needed", "Enable notifications for KitchenPlanner in your phone's settings to turn this on.");
        return;
      }
      await scheduleDailyReminder();
    } else {
      await cancelDailyReminder();
    }
    await setDailyReminderEnabled(value);
    setRemindersEnabled(value);
  }

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <View style={styles.section}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user.name}</Text>
        <Text style={styles.helperText}>{user.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.helperText}>
          This is your shared FinanceTracker account — the same login works across
          FinanceTracker, KitchenPlanner, and Milo. Manage the account itself from
          FinanceTracker.
        </Text>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Show notifications</Text>
          <Text style={styles.helperText}>Daily reminder at 6 PM to check your plan.</Text>
        </View>
        <Switch
          value={remindersEnabled}
          onValueChange={handleToggleNotifications}
          trackColor={{ true: colors.accent, false: colors.border }}
        />
      </View>

      <TouchableOpacity style={styles.logoutRow} onPress={() => logout()}>
        <Ionicons name="log-out-outline" size={18} color={colors.textPrimary} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    section: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    label: { ...type.label, color: colors.textSecondary },
    value: { fontSize: 16, color: colors.textPrimary, marginTop: 4, fontWeight: "600" },
    helperText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    logoutRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: spacing.md,
      marginTop: spacing.md,
    },
    logoutText: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  });
