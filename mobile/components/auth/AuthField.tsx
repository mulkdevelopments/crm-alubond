import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { ThemeColors, useThemeColors } from "@/constants/theme";

type AuthFieldProps = TextInputProps & {
  label: string;
  optional?: boolean;
};

export function AuthField({ label, optional, style, ...props }: AuthFieldProps) {
  const colors = useThemeColors();
  const styles = createInputStyles(colors);

  return (
    <View>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> (optional)</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={colors.text3}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

export function AuthFooterLinks({ children }: { children: ReactNode }) {
  return <View style={footerStyles.row}>{children}</View>;
}

export function AuthLinkText({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  return <Text style={[footerStyles.link, { color: colors.brand }]}>{children}</Text>;
}

export function AuthFooterSeparator() {
  const colors = useThemeColors();
  return <Text style={[footerStyles.separator, { color: colors.text3 }]}>/</Text>;
}

export function AuthPrimaryButton({
  label,
  loadingLabel,
  loading,
  onPress,
  disabled,
}: {
  label: string;
  loadingLabel: string;
  loading: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  const styles = createButtonStyles(colors);

  return (
    <Pressable
      style={[styles.button, (loading || disabled) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading || disabled}
      accessibilityLabel={loading ? loadingLabel : label}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function AuthMessage({ type, children }: { type: "error" | "success"; children: ReactNode }) {
  const colors = useThemeColors();
  const color = type === "error" ? colors.danger : colors.success;
  return <Text style={{ fontSize: 14, color }}>{children}</Text>;
}

function createInputStyles(colors: ThemeColors) {
  return StyleSheet.create({
    label: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
    },
    optional: {
      fontWeight: "400",
      color: colors.text3,
    },
    input: {
      marginTop: 4,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      fontSize: 14,
      color: colors.text,
    },
  });
}

const footerStyles = StyleSheet.create({
  row: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  link: {
    fontSize: 14,
    fontWeight: "500",
  },
  separator: {
    fontSize: 14,
  },
});

function createButtonStyles(colors: ThemeColors) {
  return StyleSheet.create({
    button: {
      marginTop: 4,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#FFFFFF",
    },
  });
}
