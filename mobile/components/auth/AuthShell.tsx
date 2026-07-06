import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";

import { AuthBrandHeader } from "@/components/BrandLogo";
import { ThemeColors, useThemeColors } from "@/constants/theme";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

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

          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.backLink}>← Back to sign in</Text>
            </Pressable>
          </Link>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {children}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
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
    backLink: {
      marginTop: 20,
      fontSize: 12,
      color: colors.text3,
    },
    title: {
      marginTop: 12,
      fontSize: 24,
      fontWeight: "700",
      letterSpacing: -0.3,
      color: colors.text,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 14,
      color: colors.text3,
    },
    footer: {
      marginTop: 24,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
}
