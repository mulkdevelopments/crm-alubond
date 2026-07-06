import { useMemo, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LogOut, Save } from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import { resetMyPassword, updateMe } from "@/lib/api/auth-api";
import { useAuth } from "@/lib/auth/AuthContext";

function formatRole(role: string | undefined) {
  return role?.replace("_", " ") ?? "";
}

function ProfileField({
  label,
  value,
  onChangeText,
  disabled,
  secureTextEntry,
  colors,
  styles,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  disabled?: boolean;
  secureTextEntry?: boolean;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text2 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        placeholderTextColor={colors.text3}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface2,
            borderColor: colors.border,
            color: disabled ? colors.text3 : colors.text,
          },
        ]}
      />
    </View>
  );
}

function ActionButton({
  label,
  loadingLabel,
  loading,
  onPress,
  disabled,
  variant,
  icon,
  colors,
  styles,
}: {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  onPress: () => void;
  disabled?: boolean;
  variant: "primary" | "soft";
  icon?: ReactNode;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      style={[
        styles.button,
        isPrimary
          ? { backgroundColor: colors.brand }
          : { backgroundColor: colors.surface2, borderColor: colors.border, borderWidth: 1 },
        (loading || disabled) && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <Text style={[styles.buttonText, { color: isPrimary ? "#FFFFFF" : colors.text }]}>
          {loadingLabel ?? label}
        </Text>
      ) : (
        <View style={styles.buttonInner}>
          {icon}
          <Text style={[styles.buttonText, { color: isPrimary ? "#FFFFFF" : colors.text }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, token, logout, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  async function onSave() {
    if (!token) {
      setMessage("Session missing. Please login again.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateMe(token, { firstName: firstName.trim(), lastName: lastName.trim() });
      await refreshUser();
      setMessage("Profile updated successfully.");
    } catch {
      setMessage("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function onResetPassword() {
    if (!token) {
      setPasswordMessage("Session missing. Please login again.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("New password and confirm password do not match.");
      return;
    }

    setChangingPassword(true);
    setPasswordMessage(null);
    try {
      await resetMyPassword(token, { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully.");
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : "Failed to update password.");
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="Account"
          title="Profile settings"
          subtitle="Manage your account name and session."
        />

        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.half}>
              <ProfileField
                label="First name"
                value={firstName}
                onChangeText={setFirstName}
                colors={colors}
                styles={styles}
              />
            </View>
            <View style={styles.half}>
              <ProfileField
                label="Last name"
                value={lastName}
                onChangeText={setLastName}
                colors={colors}
                styles={styles}
              />
            </View>
          </View>

          <ProfileField
            label="Email"
            value={user?.email ?? ""}
            disabled
            colors={colors}
            styles={styles}
          />

          <ProfileField
            label="Role"
            value={formatRole(user?.role)}
            disabled
            colors={colors}
            styles={styles}
          />

          {message ? <Text style={[styles.message, { color: colors.text2 }]}>{message}</Text> : null}

          <View style={styles.actions}>
            <ActionButton
              label="Save profile"
              loadingLabel="Saving..."
              loading={saving}
              onPress={() => void onSave()}
              variant="primary"
              icon={<Save size={16} color="#FFFFFF" strokeWidth={2.2} />}
              colors={colors}
              styles={styles}
            />
            <ActionButton
              label="Logout"
              onPress={() => void logout()}
              variant="soft"
              icon={<LogOut size={16} color={colors.text} strokeWidth={2.2} />}
              colors={colors}
              styles={styles}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Reset password</Text>
            <Text style={[styles.sectionHint, { color: colors.text3 }]}>
              Use letters, numbers, and symbols. Minimum 8 characters.
            </Text>
          </View>

          <ProfileField
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            colors={colors}
            styles={styles}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <ProfileField
                label="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                colors={colors}
                styles={styles}
              />
            </View>
            <View style={styles.half}>
              <ProfileField
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                colors={colors}
                styles={styles}
              />
            </View>
          </View>

          {passwordMessage ? (
            <Text style={[styles.message, { color: colors.text2 }]}>{passwordMessage}</Text>
          ) : null}

          <ActionButton
            label="Update password"
            loadingLabel="Updating password..."
            loading={changingPassword}
            onPress={() => void onResetPassword()}
            variant="primary"
            colors={colors}
            styles={styles}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

function createStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 120,
      gap: 16,
    },
    card: {
      padding: 20,
      gap: 16,
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    half: {
      flex: 1,
      minWidth: 0,
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 14,
    },
    input: {
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      fontSize: 14,
    },
    message: {
      fontSize: 14,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    sectionHeader: {
      gap: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      letterSpacing: -0.2,
    },
    sectionHint: {
      fontSize: 12,
      lineHeight: 16,
    },
    button: {
      height: 36,
      borderRadius: 12,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    buttonText: {
      fontSize: 12,
      fontWeight: "600",
    },
  });
}
