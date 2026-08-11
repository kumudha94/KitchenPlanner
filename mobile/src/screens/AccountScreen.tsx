import { useMemo } from "react";
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import { apiRequest } from "../lib/api";
import { requestNotificationPermission } from "../lib/notifications";
import { useAuth } from "../contexts/AuthContext";
import { useColors, radii, spacing, type, type ThemeColors } from "../theme";
import type { User } from "../lib/types";

export default function AccountScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Pick<User, "notificationsEnabled" | "newsletterOptIn">>) =>
      apiRequest<User>("/api/auth/me", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => refreshUser(),
    onError: (error: Error) => Alert.alert("Could not update", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest<void>("/api/auth/me", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.clear();
      logout();
    },
    onError: (error: Error) => Alert.alert("Could not delete account", error.message),
  });

  async function handleToggleNotifications(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert("Permission needed", "Enable notifications for KitchenPlanner in your phone's settings to turn this on.");
        return;
      }
    }
    updateMutation.mutate({ notificationsEnabled: value });
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete account?",
      "This removes your login access. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
      ]
    );
  }

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <View style={styles.section}>
        <Text style={styles.label}>Email address</Text>
        <Text style={styles.value}>{user.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{user.username}</Text>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Show notifications</Text>
          <Text style={styles.helperText}>Reminders so you don't forget your planned meals.</Text>
        </View>
        <Switch
          value={user.notificationsEnabled}
          onValueChange={handleToggleNotifications}
          trackColor={{ true: colors.accent, false: colors.border }}
        />
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Email newsletter</Text>
          <Text style={styles.helperText}>Occasional news about the app.</Text>
        </View>
        <Switch
          value={user.newsletterOptIn}
          onValueChange={(v) => updateMutation.mutate({ newsletterOptIn: v })}
          trackColor={{ true: colors.accent, false: colors.border }}
        />
      </View>

      <TouchableOpacity style={styles.logoutRow} onPress={() => logout()}>
        <Ionicons name="log-out-outline" size={18} color={colors.textPrimary} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteRow} onPress={handleDeleteAccount} disabled={deleteMutation.isPending}>
        <Text style={styles.deleteText}>{deleteMutation.isPending ? "Deleting…" : "Delete account"}</Text>
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
    deleteRow: { alignItems: "center", paddingVertical: spacing.lg },
    deleteText: { fontSize: 13, color: colors.danger, textDecorationLine: "underline" },
  });
