import { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useMutation } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useColors, radii, spacing, type, type ThemeColors } from "../../theme";
import type { RootStackParamList } from "../../../App";
import type { User } from "../../lib/types";

type Props = NativeStackScreenProps<RootStackParamList, "Username">;

export default function UsernameScreen({ route, navigation }: Props) {
  const { email, signupToken } = route.params;
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { login } = useAuth();
  const [username, setUsername] = useState("");

  const signupMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ token: string; user: User }>("/api/auth/complete-signup", {
        method: "POST",
        body: JSON.stringify({ email, username: username.trim(), signupToken }),
      }),
    onSuccess: (result) => {
      login(result.token, result.user);
      navigation.navigate("Account");
    },
    onError: (error: Error) => Alert.alert("Could not finish sign up", error.message),
  });

  function handleSubmit() {
    if (!username.trim()) {
      Alert.alert("Enter a username to finish creating your account");
      return;
    }
    signupMutation.mutate();
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.title}>Almost there</Text>
      <Text style={styles.subtitle}>What should we call you?</Text>

      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="Your name"
        placeholderTextColor={colors.textMuted}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        autoFocus
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={signupMutation.isPending}>
        <Text style={styles.buttonText}>{signupMutation.isPending ? "Creating account…" : "Get started"}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: "center" },
    title: { ...type.hero, color: colors.textPrimary, textAlign: "center" },
    subtitle: { ...type.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.xl },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    button: { backgroundColor: colors.accent, borderRadius: radii.sm, paddingVertical: 14, alignItems: "center" },
    buttonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  });
