import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { ChevronDown } from "lucide-react-native";

import { OptionSheet } from "@/components/pipeline/OptionSheet";
import { ThemeColors, useThemeColors } from "@/constants/theme";

export function FormSelect({
  value,
  placeholder,
  options,
  onChange,
  disabled,
  compact,
  allowEmpty = false,
  style,
}: {
  value: string;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  allowEmpty?: boolean;
  style?: ViewStyle;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <>
      <Pressable
        style={[
          styles.select,
          compact ? styles.selectCompact : null,
          disabled ? styles.selectDisabled : null,
          { backgroundColor: colors.surface2, borderColor: colors.border },
          style,
        ]}
        onPress={() => {
          if (!disabled) setOpen(true);
        }}
        disabled={disabled}
      >
        <Text
          style={[styles.selectText, { color: selectedLabel ? colors.text : colors.text3 }]}
          numberOfLines={1}
        >
          {selectedLabel ?? placeholder ?? "Select"}
        </Text>
        <ChevronDown size={14} color={colors.text3} strokeWidth={2.2} />
      </Pressable>
      <OptionSheet
        visible={open}
        title={placeholder ?? "Select"}
        options={allowEmpty && placeholder ? [{ value: "", label: placeholder }, ...options] : options}
        selectedValue={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    select: {
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    selectCompact: {
      width: 96,
    },
    selectDisabled: {
      opacity: 0.7,
    },
    selectText: {
      flex: 1,
      flexShrink: 1,
      fontSize: 13,
      fontWeight: "500",
    },
  });
}
