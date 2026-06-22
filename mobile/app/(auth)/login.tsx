import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AuthBrandHeader } from "@/components/BrandLogo";
import { useAuth } from "@/lib/auth/AuthContext";
import { colors } from "@/constants/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <AuthBrandHeader />
        <Text style={styles.subtitle}>Sign in to manage projects in the field</Text>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@company.com"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          secureTextEntry
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <Text style={styles.helpText}>Accounts are created by your administrator.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={() => void onSubmit()} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  subtitle: { marginTop: 8, marginBottom: 24, color: colors.textMuted, fontSize: 14, textAlign: "center" },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: "#f1f5f9",
  },
  button: {
    marginTop: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: { color: colors.danger, marginBottom: 8, fontSize: 13 },
  helpText: { marginBottom: 8, fontSize: 12, color: colors.textMuted },
});
