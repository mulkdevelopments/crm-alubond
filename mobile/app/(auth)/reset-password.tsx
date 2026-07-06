import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import {
  AuthField,
  AuthFooterLinks,
  AuthFooterSeparator,
  AuthLinkText,
  AuthMessage,
  AuthPrimaryButton,
} from "@/components/auth/AuthField";
import { AuthShell } from "@/components/auth/AuthShell";
import { resetPasswordWithToken } from "@/lib/api/auth-api";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = useMemo(() => {
    const value = params.token;
    if (Array.isArray(value)) return value[0]?.trim() ?? "";
    return value?.trim() ?? "";
  }, [params.token]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setMessage(null);
    setError(null);

    if (!token) {
      setError("Reset link is missing or invalid.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await resetPasswordWithToken(token, password);
      setMessage(result.message);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Reset password" subtitle="Choose a new password for your CRM account.">
      <View style={styles.form}>
        <AuthField
          label="New password"
          secureTextEntry
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChangeText={setPassword}
          editable={!message}
        />

        <AuthField
          label="Confirm password"
          secureTextEntry
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!message}
        />

        {message ? <AuthMessage type="success">{message}</AuthMessage> : null}
        {error ? <AuthMessage type="error">{error}</AuthMessage> : null}

        <AuthPrimaryButton
          label="Update password"
          loadingLabel="Saving..."
          loading={submitting}
          disabled={Boolean(message)}
          onPress={() => void onSubmit()}
        />
      </View>

      {message ? (
        <AuthFooterLinks>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <AuthLinkText>Continue to sign in</AuthLinkText>
            </Pressable>
          </Link>
        </AuthFooterLinks>
      ) : (
        <AuthFooterLinks>
          <Link href="/(auth)/request-access" asChild>
            <Pressable>
              <AuthLinkText>Request access</AuthLinkText>
            </Pressable>
          </Link>
          <AuthFooterSeparator />
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable>
              <AuthLinkText>Forgot password</AuthLinkText>
            </Pressable>
          </Link>
        </AuthFooterLinks>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: 24,
    gap: 16,
  },
});
