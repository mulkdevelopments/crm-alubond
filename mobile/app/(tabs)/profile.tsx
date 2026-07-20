import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyRound, LogOut, Pencil, Save, X } from "lucide-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import { resetMyPassword, updateMe } from "@/lib/api/auth-api";
import { useAuth } from "@/lib/auth/AuthContext";

function formatRole(role: string | undefined) {
  return role?.replaceAll("_", " ") ?? "—";
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
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(true);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordOk, setPasswordOk] = useState(true);

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }, [user?.firstName, user?.lastName]);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "Your profile";

  function openEditProfile() {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setMessage(null);
    setEditingPassword(false);
    setEditingProfile(true);
  }

  function closeEditProfile() {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setMessage(null);
    setEditingProfile(false);
  }

  function openEditPassword() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage(null);
    setEditingProfile(false);
    setEditingPassword(true);
  }

  function closeEditPassword() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage(null);
    setEditingPassword(false);
  }

  async function onSave() {
    if (!token) {
      setMessageOk(false);
      setMessage("Session missing. Please login again.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateMe(token, { firstName: firstName.trim(), lastName: lastName.trim() });
      await refreshUser();
      setMessageOk(true);
      setMessage("Profile saved.");
      setEditingProfile(false);
    } catch {
      setMessageOk(false);
      setMessage("Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function onResetPassword() {
    if (!token) {
      setPasswordOk(false);
      setPasswordMessage("Session missing. Please login again.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordOk(false);
      setPasswordMessage("New password and confirmation do not match.");
      return;
    }

    setChangingPassword(true);
    setPasswordMessage(null);
    try {
      await resetMyPassword(token, { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOk(true);
      setPasswordMessage("Password updated.");
      setEditingPassword(false);
    } catch (error) {
      setPasswordOk(false);
      setPasswordMessage(error instanceof Error ? error.message : "Could not update password.");
    } finally {
      setChangingPassword(false);
    }
  }

  const idle = !editingProfile && !editingPassword;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader title="Profile" subtitle="Your account details and security." />

        <Card style={styles.card}>
          <View style={styles.identity}>
            <Avatar name={displayName} size="lg" />
            <View style={styles.identityCopy}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.email, { color: colors.text3 }]} numberOfLines={1}>
                {user?.email ?? "—"}
              </Text>
              <View
                style={[
                  styles.rolePill,
                  { backgroundColor: colors.surface2, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.roleText, { color: colors.text2 }]}>
                  {formatRole(user?.role)}
                </Text>
              </View>
            </View>
          </View>

          {message && !editingProfile ? (
            <Text style={[styles.message, { color: messageOk ? "#059669" : colors.danger }]}>
              {message}
            </Text>
          ) : null}

          {passwordMessage && !editingPassword ? (
            <Text
              style={[styles.message, { color: passwordOk ? "#059669" : colors.danger }]}
            >
              {passwordMessage}
            </Text>
          ) : null}
        </Card>

        {idle ? (
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={openEditProfile}
            >
              <Pencil size={16} color={colors.text} strokeWidth={2.2} />
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Edit name</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={openEditPassword}
            >
              <KeyRound size={16} color={colors.text} strokeWidth={2.2} />
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Change password</Text>
            </Pressable>
            <Pressable
              style={[
                styles.actionBtn,
                {
                  borderColor: "rgba(244,63,94,0.25)",
                  backgroundColor: "rgba(244,63,94,0.06)",
                },
              ]}
              onPress={() => void logout()}
            >
              <LogOut size={16} color={colors.danger} strokeWidth={2.2} />
              <Text style={[styles.actionBtnText, { color: colors.danger }]}>Sign out</Text>
            </Pressable>
          </View>
        ) : null}

        {editingProfile ? (
          <Card style={styles.card}>
            <View style={styles.formHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit name</Text>
                <Text style={[styles.sectionHint, { color: colors.text3 }]}>
                  Update how your name appears across the CRM.
                </Text>
              </View>
              <Pressable
                onPress={closeEditProfile}
                style={[styles.iconBtn, { borderColor: colors.border }]}
                hitSlop={8}
              >
                <X size={16} color={colors.text3} strokeWidth={2.2} />
              </Pressable>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <Field
                  label="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                  colors={colors}
                  styles={styles}
                />
              </View>
              <View style={styles.half}>
                <Field
                  label="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  colors={colors}
                  styles={styles}
                />
              </View>
            </View>

            {message ? (
              <Text style={[styles.message, { color: messageOk ? "#059669" : colors.danger }]}>
                {message}
              </Text>
            ) : null}

            <View style={styles.formActions}>
              <Pressable
                style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                onPress={closeEditProfile}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.brand },
                  saving && styles.disabled,
                ]}
                onPress={() => void onSave()}
                disabled={saving}
              >
                <Save size={16} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.primaryBtnText}>{saving ? "Saving…" : "Save"}</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        {editingPassword ? (
          <Card style={styles.card}>
            <View style={styles.formHeader}>
              <View style={styles.passwordHeader}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: colors.surface2, borderColor: colors.border },
                  ]}
                >
                  <KeyRound size={16} color={colors.text2} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>
                    Change password
                  </Text>
                  <Text style={[styles.sectionHint, { color: colors.text3 }]}>
                    Minimum 8 characters. Include letters and numbers.
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={closeEditPassword}
                style={[styles.iconBtn, { borderColor: colors.border }]}
                hitSlop={8}
              >
                <X size={16} color={colors.text3} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Field
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              colors={colors}
              styles={styles}
            />
            <Field
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              colors={colors}
              styles={styles}
            />
            <Field
              label="Confirm"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              colors={colors}
              styles={styles}
            />

            {passwordMessage ? (
              <Text
                style={[styles.message, { color: passwordOk ? "#059669" : colors.danger }]}
              >
                {passwordMessage}
              </Text>
            ) : null}

            <View style={styles.formActions}>
              <Pressable
                style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                onPress={closeEditPassword}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.brand },
                  changingPassword && styles.disabled,
                ]}
                onPress={() => void onResetPassword()}
                disabled={changingPassword}
              >
                <Text style={styles.primaryBtnText}>
                  {changingPassword ? "Updating…" : "Update"}
                </Text>
              </Pressable>
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Field({
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
      <Text style={[styles.label, { color: colors.text3 }]}>{label}</Text>
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
            backgroundColor: disabled ? `${colors.surface2}99` : colors.surface2,
            borderColor: colors.border,
            color: disabled ? colors.text3 : colors.text,
          },
        ]}
      />
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
      gap: 14,
    },
    card: {
      padding: 20,
      gap: 14,
    },
    identity: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    identityCopy: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    name: {
      fontSize: 18,
      fontWeight: "700",
      letterSpacing: -0.3,
    },
    email: {
      fontSize: 13,
    },
    rolePill: {
      alignSelf: "flex-start",
      marginTop: 4,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    roleText: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    actions: {
      gap: 10,
    },
    actionBtn: {
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    actionBtnText: {
      fontSize: 14,
      fontWeight: "600",
    },
    formHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    sectionHint: {
      fontSize: 12,
      lineHeight: 16,
      marginTop: 4,
    },
    passwordHeader: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
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
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    input: {
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 14,
      fontSize: 14,
    },
    message: {
      fontSize: 13,
      fontWeight: "500",
    },
    formActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 2,
    },
    primaryBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    primaryBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "700",
    },
    secondaryBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryBtnText: {
      fontSize: 14,
      fontWeight: "600",
    },
    disabled: {
      opacity: 0.6,
    },
  });
}
