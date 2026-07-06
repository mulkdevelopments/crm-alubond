import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import {
  AuthField,
  AuthFooterLinks,
  AuthFooterSeparator,
  AuthLinkText,
  AuthMessage,
  AuthPrimaryButton,
} from "@/components/auth/AuthField";
import { AuthShell } from "@/components/auth/AuthShell";
import { requestPasswordReset } from "@/lib/api/auth-api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setMessage(null);
    setError(null);
    setSubmitting(true);

    try {
      const result = await requestPasswordReset(email.trim().toLowerCase());
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your work email and we will send reset instructions."
    >
      <View style={styles.form}>
        <AuthField
          label="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChangeText={setEmail}
        />

        {message ? <AuthMessage type="success">{message}</AuthMessage> : null}
        {error ? <AuthMessage type="error">{error}</AuthMessage> : null}

        <AuthPrimaryButton
          label="Send reset link"
          loadingLabel="Sending..."
          loading={submitting}
          onPress={() => void onSubmit()}
        />
      </View>

      <AuthFooterLinks>
        <Link href="/(auth)/request-access" asChild>
          <Pressable>
            <AuthLinkText>Request access</AuthLinkText>
          </Pressable>
        </Link>
        <AuthFooterSeparator />
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <AuthLinkText>Sign in</AuthLinkText>
          </Pressable>
        </Link>
      </AuthFooterLinks>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: 24,
    gap: 16,
  },
});
