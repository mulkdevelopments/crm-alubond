import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "@/constants/theme";
import { resetMyPassword, updateMe } from "@/lib/api/auth-api";
import { useAuth } from "@/lib/auth/AuthContext";

export default function ProfileScreen() {
  const { user, token, logout, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateMe(token, { firstName: firstName.trim(), lastName: lastName.trim() });
      await refreshUser();
      setMessage("Profile updated.");
    } catch {
      setMessage("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      await resetMyPassword(token, { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update password.");
    } finally {
      setSaving(false);
    }
  }

  function confirmLogout() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void logout() },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.email}>{user?.email}</Text>
      <Text style={styles.role}>{user?.role?.replace("_", " ")}</Text>

      <Text style={styles.section}>Profile</Text>
      <TextInput style={styles.input} placeholder="First name" value={firstName} onChangeText={setFirstName} />
      <TextInput style={styles.input} placeholder="Last name" value={lastName} onChangeText={setLastName} />
      <Pressable style={styles.button} onPress={() => void saveProfile()} disabled={saving}>
        <Text style={styles.buttonText}>Save profile</Text>
      </Pressable>

      <Text style={styles.section}>Change password</Text>
      <TextInput
        style={styles.input}
        placeholder="Current password"
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="New password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <Pressable style={styles.button} onPress={() => void changePassword()} disabled={saving}>
        <Text style={styles.buttonText}>Update password</Text>
      </Pressable>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable style={[styles.button, styles.logout]} onPress={confirmLogout}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  email: { fontSize: 18, fontWeight: "700", color: colors.text },
  role: { marginTop: 4, color: colors.textMuted, textTransform: "capitalize" },
  section: { marginTop: 24, marginBottom: 10, fontSize: 15, fontWeight: "700", color: colors.text },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  button: {
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  logout: { marginTop: 28, backgroundColor: colors.danger },
  buttonText: { color: "#fff", fontWeight: "700" },
  message: { marginTop: 12, color: colors.success, fontSize: 13 },
});
