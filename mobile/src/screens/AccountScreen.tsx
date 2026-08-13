import { useEffect, useMemo, useState } from "react";
import { View, Text, Switch, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import { apiRequest } from "../lib/api";
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
  scheduleCustomReminder,
  cancelCustomReminder,
} from "../lib/notifications";
import { useAuth } from "../contexts/AuthContext";
import { useColors, radii, spacing, type, type ThemeColors } from "../theme";
import type { User, Reminder, InsertReminder } from "../lib/types";

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

  // If the preference is already on (e.g. after a reinstall), make sure the
  // OS-level schedule actually exists — it doesn't survive a fresh install.
  useEffect(() => {
    if (user?.notificationsEnabled) {
      scheduleDailyReminder();
    }
  }, [user?.notificationsEnabled]);

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
          <Text style={styles.helperText}>Daily reminder at 6 PM to check your plan.</Text>
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

      <RemindersSection colors={colors} styles={styles} />

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

function formatTime(hour: number, minute: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

type SectionProps = { colors: ThemeColors; styles: ReturnType<typeof makeStyles> };

function RemindersSection({ colors, styles }: SectionProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  const { data: reminders } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => apiRequest<Reminder[]>("/api/reminders"),
  });

  // Custom reminders don't survive a reinstall any more than the daily one
  // does — re-arm every enabled one whenever the list loads.
  useEffect(() => {
    reminders?.forEach((r: Reminder) => {
      if (r.enabled) scheduleCustomReminder(r);
    });
  }, [reminders]);

  const createMutation = useMutation({
    mutationFn: (data: InsertReminder) => apiRequest<Reminder>("/api/reminders", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: async (reminder) => {
      await scheduleCustomReminder(reminder);
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      setIsAdding(false);
    },
    onError: (error: Error) => Alert.alert("Could not add reminder", error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiRequest<Reminder>(`/api/reminders/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
    onSuccess: (reminder) => {
      if (reminder.enabled) scheduleCustomReminder(reminder);
      else cancelCustomReminder(reminder.id);
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error: Error) => Alert.alert("Could not update reminder", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/api/reminders/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      cancelCustomReminder(id);
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error: Error) => Alert.alert("Could not remove reminder", error.message),
  });

  async function handleCreate(data: InsertReminder) {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert("Permission needed", "Enable notifications for KitchenPlanner in your phone's settings to add reminders.");
      return;
    }
    createMutation.mutate(data);
  }

  return (
    <View style={styles.remindersSection}>
      <View style={styles.remindersHeader}>
        <Text style={styles.label}>Reminders</Text>
        {!isAdding ? (
          <TouchableOpacity onPress={() => setIsAdding(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="add-circle" size={22} color={colors.accent} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.helperText}>Anything else you want a nudge for — take a pill, water the plants, anything.</Text>

      {(reminders ?? []).map((r: Reminder) => (
        <View key={r.id} style={styles.reminderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>{r.title}</Text>
            <Text style={styles.reminderTime}>{formatTime(r.hour, r.minute)}</Text>
          </View>
          <Switch
            value={r.enabled}
            onValueChange={(enabled) => toggleMutation.mutate({ id: r.id, enabled })}
            trackColor={{ true: colors.accent, false: colors.border }}
          />
          <TouchableOpacity onPress={() => deleteMutation.mutate(r.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ))}

      {isAdding ? (
        <AddReminderForm
          colors={colors}
          styles={styles}
          onCancel={() => setIsAdding(false)}
          onSave={handleCreate}
          isSaving={createMutation.isPending}
        />
      ) : null}
    </View>
  );
}

const MINUTE_STEP = 5;

function AddReminderForm({
  colors,
  styles,
  onCancel,
  onSave,
  isSaving,
}: SectionProps & { onCancel: () => void; onSave: (data: InsertReminder) => void; isSaving: boolean }) {
  const [title, setTitle] = useState("");
  const [hour12, setHour12] = useState(6);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  function adjustHour(delta: number) {
    setHour12((h) => ((h - 1 + delta + 12) % 12) + 1);
  }

  function adjustMinute(delta: number) {
    setMinute((m) => (m + delta * MINUTE_STEP + 60) % 60);
  }

  function handleSave() {
    if (!title.trim()) {
      Alert.alert("Add a title for this reminder");
      return;
    }
    let hour24 = hour12 % 12;
    if (period === "PM") hour24 += 12;
    onSave({ title: title.trim(), hour: hour24, minute, enabled: true });
  }

  return (
    <View style={styles.addForm}>
      <TextInput
        style={styles.addFormInput}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Take pill, water the plants…"
        placeholderTextColor={colors.textMuted}
      />

      <View style={styles.timePicker}>
        <View style={styles.timeStepper}>
          <TouchableOpacity style={styles.stepperButton} onPress={() => adjustHour(-1)}>
            <Ionicons name="remove" size={16} color={colors.accentDark} />
          </TouchableOpacity>
          <Text style={styles.timeStepperValue}>{hour12}</Text>
          <TouchableOpacity style={styles.stepperButton} onPress={() => adjustHour(1)}>
            <Ionicons name="add" size={16} color={colors.accentDark} />
          </TouchableOpacity>
        </View>
        <Text style={styles.timeColon}>:</Text>
        <View style={styles.timeStepper}>
          <TouchableOpacity style={styles.stepperButton} onPress={() => adjustMinute(-1)}>
            <Ionicons name="remove" size={16} color={colors.accentDark} />
          </TouchableOpacity>
          <Text style={styles.timeStepperValue}>{String(minute).padStart(2, "0")}</Text>
          <TouchableOpacity style={styles.stepperButton} onPress={() => adjustMinute(1)}>
            <Ionicons name="add" size={16} color={colors.accentDark} />
          </TouchableOpacity>
        </View>
        <View style={styles.periodToggle}>
          {(["AM", "PM"] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodOption, period === p && styles.periodOptionActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodOptionText, period === p && styles.periodOptionTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.addFormActions}>
        <TouchableOpacity style={styles.addFormCancel} onPress={onCancel}>
          <Text style={styles.addFormCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addFormSave} onPress={handleSave} disabled={isSaving}>
          <Text style={styles.addFormSaveText}>{isSaving ? "Saving…" : "Save reminder"}</Text>
        </TouchableOpacity>
      </View>
    </View>
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

    remindersSection: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    remindersHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    reminderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      marginTop: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reminderTitle: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
    reminderTime: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

    addForm: {
      marginTop: spacing.md,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radii.sm,
      padding: spacing.sm,
      gap: spacing.sm,
    },
    addFormInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.textPrimary,
    },
    timePicker: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    timeStepper: { flexDirection: "row", alignItems: "center", gap: 6 },
    stepperButton: {
      width: 26,
      height: 26,
      borderRadius: radii.full,
      backgroundColor: colors.accentSoft,
      justifyContent: "center",
      alignItems: "center",
    },
    timeStepperValue: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, minWidth: 22, textAlign: "center" },
    timeColon: { fontSize: 16, fontWeight: "700", color: colors.textMuted },
    periodToggle: { flexDirection: "row", marginLeft: 8, borderRadius: radii.sm, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
    periodOption: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surface },
    periodOptionActive: { backgroundColor: colors.accent },
    periodOptionText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
    periodOptionTextActive: { color: colors.white },
    addFormActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
    addFormCancel: { flex: 1, alignItems: "center", paddingVertical: 10 },
    addFormCancelText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    addFormSave: { flex: 2, alignItems: "center", paddingVertical: 10, borderRadius: radii.sm, backgroundColor: colors.accent },
    addFormSaveText: { fontSize: 13, fontWeight: "700", color: colors.white },
  });
