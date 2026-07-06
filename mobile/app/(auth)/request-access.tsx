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
import { requestAccountAccess } from "@/lib/api/auth-api";

export default function RequestAccessScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setSuccess(null);
    setError(null);
    setSubmitting(true);

    try {
      const result = await requestAccountAccess({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim(),
      });
      setSuccess(result.message);
      setFirstName("");
      setLastName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit access request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Request access"
      subtitle="CRM accounts are created by an administrator. Submit your details and we will review your request."
    >
      <View style={styles.form}>
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <AuthField
              label="First name"
              placeholder="First name"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>
          <View style={styles.nameField}>
            <AuthField
              label="Last name"
              placeholder="Last name"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>
        </View>

        <AuthField
          label="Work email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChangeText={setEmail}
        />

        <AuthField
          label="Message"
          optional
          placeholder="Tell us your role or why you need access"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.messageInput}
        />

        {success ? <AuthMessage type="success">{success}</AuthMessage> : null}
        {error ? <AuthMessage type="error">{error}</AuthMessage> : null}

        <AuthPrimaryButton
          label="Submit request"
          loadingLabel="Submitting..."
          loading={submitting}
          onPress={() => void onSubmit()}
        />
      </View>

      <AuthFooterLinks>
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <AuthLinkText>Sign in</AuthLinkText>
          </Pressable>
        </Link>
        <AuthFooterSeparator />
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable>
            <AuthLinkText>Forgot password</AuthLinkText>
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
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  messageInput: {
    height: 96,
    paddingTop: 10,
    paddingBottom: 10,
  },
});
