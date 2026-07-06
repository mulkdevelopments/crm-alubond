import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Link } from "expo-router";

import { AuthBrandHeader } from "@/components/BrandLogo";
import {
  AuthField,
  AuthFooterLinks,
  AuthFooterSeparator,
  AuthLinkText,
  AuthMessage,
  AuthPrimaryButton,
} from "@/components/auth/AuthField";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import { useAuth } from "@/lib/auth/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const colors = useThemeColors();
  const styles = createStyles(colors);

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
      setError("Login failed. Check email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.card}>
          <View style={styles.brandWrap}>
            <AuthBrandHeader />
          </View>

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

            <AuthField
              label="Password"
              secureTextEntry
              autoComplete="password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
            />

            {error ? <AuthMessage type="error">{error}</AuthMessage> : null}

            <AuthPrimaryButton
              label="Sign in"
              loadingLabel="Signing in..."
              loading={loading}
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
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable>
                <AuthLinkText>Forgot password</AuthLinkText>
              </Pressable>
            </Link>
          </AuthFooterLinks>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      padding: 16,
    },
    card: {
      width: "100%",
      maxWidth: 448,
      alignSelf: "center",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      padding: 24,
    },
    brandWrap: {
      alignItems: "center",
      paddingBottom: 4,
    },
    form: {
      marginTop: 32,
      gap: 16,
    },
  });
}
